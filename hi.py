import asyncio
import csv
import json
import os
import sys
import threading
from datetime import datetime, timezone
from collections import deque
from bleak import BleakClient
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# ---------------- CONFIG ----------------
ESP_ADDRESS = "9C:13:9E:CE:8F:B2"
CHAR_UUID = "abcd1234-1234-1234-1234-1234567890ab"
MAX_RAW_DATA_ENTRIES = 1000
MAX_PEAK_EVENTS = 1000
MAX_DROPS = 1000

# ---------------- LIVE & PEAK DATA ----------------
live_data = {"T": 0, "H": 0, "R": 0, "P": 0, "Y": 0, "G": 0, "L": 0, "F": 0}

peak_keys = ["TEMP", "HUM", "LDR", "FLEX", "G", "HGT"]
peak_data = {key: 0 for key in peak_keys}
peak_ts = {key: "" for key in peak_keys}

# ---------------- PEAK EVENTS, RAW DATA & DROPS (for React) ----------------
_peak_events = []
_raw_data = deque(maxlen=MAX_RAW_DATA_ENTRIES)
_drops = deque(maxlen=MAX_DROPS)
_state_lock = threading.Lock()
_esp_connected = False
_DEBUG_LOG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug-15e355.log")
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_BUILD_CANDIDATES = [
    os.path.join(_BASE_DIR, "web-build"),
    os.path.join(_BASE_DIR, "build"),
]


def _resolve_build_dir():
    for candidate in _BUILD_CANDIDATES:
        if os.path.isfile(os.path.join(candidate, "index.html")):
            return candidate
    return _BUILD_CANDIDATES[0]


_BUILD_DIR = _resolve_build_dir()
_BUILD_INDEX = os.path.join(_BUILD_DIR, "index.html")


def _debug_log(hypothesis_id: str, location: str, message: str, data: dict):
    entry = {
        "sessionId": "15e355",
        "runId": "run_initial",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(datetime.now().timestamp() * 1000),
    }
    try:
        with open(_DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=True) + "\n")
    except Exception:
        pass


def _set_esp_connected(connected: bool):
    global _esp_connected
    with _state_lock:
        _esp_connected = connected
    try:
        with app.app_context():
            socketio.emit("esp_status", {"connected": connected})
    except Exception:
        pass

# ---------------- FLASK + SOCKETIO ----------------
app = Flask(__name__)
app.config["SECRET_KEY"] = "esp32-dashboard"
CORS(app, origins=["*"])
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# ---------------- EMAIL OTP (email_otp/) ----------------
_EMAIL_OTP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "email_otp")
if _EMAIL_OTP_DIR not in sys.path:
    sys.path.insert(0, _EMAIL_OTP_DIR)

_otp_store = None


def _otp_env_configured():
    return bool(os.environ.get("OTP_PEPPER") and os.environ.get("MAIL_FROM"))


def _get_otp_store():
    global _otp_store
    if not _otp_env_configured():
        return None
    if _otp_store is None:
        from otp_logic import OTPStore

        _otp_store = OTPStore(
            os.environ["OTP_PEPPER"],
            ttl_s=int(os.environ.get("OTP_TTL_S", "300")),
            max_attempts=int(os.environ.get("OTP_MAX_ATTEMPTS", "5")),
            min_resend_s=int(os.environ.get("OTP_RESEND_COOLDOWN_S", "60")),
        )
    return _otp_store


def _otp_body_email(data: dict):
    if not data:
        return None
    return data.get("email") or data.get("user_email")


def _add_peak_event(parameter: str, value: float):
    """Append peak event for React Drop History."""
    now = datetime.now()
    event = {
        "parameter": parameter,
        "value": value,
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
    }
    with _state_lock:
        _peak_events.append(event)
        if len(_peak_events) > MAX_PEAK_EVENTS:
            _peak_events.pop(0)
    try:
        socketio.emit("peak_event", event)
    except Exception:
        pass


def _latest_peak_snapshot():
    """Capture the latest known peak values and timestamps for drop history."""
    return {
        "temperature": peak_data.get("TEMP", 0),
        "temperature_time": peak_ts.get("TEMP", ""),
        "humidity": peak_data.get("HUM", 0),
        "humidity_time": peak_ts.get("HUM", ""),
        "ldr": peak_data.get("LDR", 0),
        "ldr_time": peak_ts.get("LDR", ""),
        "flex": peak_data.get("FLEX", 0),
        "flex_time": peak_ts.get("FLEX", ""),
        "peak_g": peak_data.get("G", 0),
        "peak_g_time": peak_ts.get("G", ""),
        "height": peak_data.get("HGT", 0),
        "height_time": peak_ts.get("HGT", ""),
    }


def _add_raw_data(message: str):
    """Store raw BLE message for React."""
    entry = {"timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "data": message}
    with _state_lock:
        _raw_data.append(entry)
    try:
        socketio.emit("raw_data", entry)
    except Exception:
        pass


def _emit_live():
    """Emit live data in React format (temp, humidity, roll, pitch, yaw, g, ldr, flex)."""
    payload = {
        "temp": live_data.get("T"),
        "humidity": live_data.get("H"),
        "roll": live_data.get("R"),
        "pitch": live_data.get("P"),
        "yaw": live_data.get("Y"),
        "g": live_data.get("G"),
        "ldr": live_data.get("L"),
        "flex": live_data.get("F"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "connected": True,  # Receiving BLE data means ESP is connected
    }
    try:
        with app.app_context():
            socketio.emit("live_data", payload)
    except Exception:
        pass


# ---------------- BLE NOTIFICATION HANDLER ----------------
def notification_handler(sender, data):
    message = data.decode().strip()
    # #region agent log
    print(f"[BLE_RX] {message}")
    _debug_log(
        "H6",
        "hi.py:notification_handler",
        "BLE packet received",
        {"sender": str(sender), "raw": message},
    )
    # #endregion
    _add_raw_data(message)

    # ---------------- LIVE DATA ----------------
    if message.startswith("LIVE"):
        try:
            parts = message.split(",")[1:]
            data_dict = {}
            for item in parts:
                if "=" in item:
                    key, value = item.split("=", 1)
                    data_dict[key] = value
            live_data["T"] = float(data_dict.get("T", 0) or 0)
            live_data["H"] = float(data_dict.get("H", 0) or 0)
            live_data["R"] = float(data_dict.get("R", 0) or 0)
            live_data["P"] = float(data_dict.get("P", 0) or 0)
            live_data["Y"] = float(data_dict.get("Y", 0) or 0)
            live_data["G"] = float(data_dict.get("G", 0) or 0)
            live_data["L"] = float(data_dict.get("L", 0) or 0)
            live_data["F"] = float(data_dict.get("F", 0) or 0)
            _emit_live()
        except Exception:
            print("LIVE RAW:", message)

    # ---------------- PEAK DATA ----------------
    elif message.startswith("PEAKS"):
        try:
            parts = message.split(",")[1:]
            param_map = {"G": "G-Force", "HGT": "Height", "TEMP": "Temperature", "HUM": "Humidity", "LDR": "LDR", "FLEX": "FLEX"}
            for item in parts:
                if "=" in item:
                    key, val = item.split("=", 1)
                    if "@" in val:
                        num, ts = val.split("@", 1)
                        ts = ts.strip()
                    else:
                        num = val
                        ts = ""
                    try:
                        v = float(num)
                        old = peak_data.get(key, 0)
                        peak_data[key] = v
                        peak_ts[key] = ts
                        if v > old or old == 0:
                            _add_peak_event(param_map.get(key, key), v)
                    except Exception:
                        pass
        except Exception:
            print("PEAK RAW:", message)

    # ---------------- DROP DATA ----------------
    elif message.startswith("DROP"):
        try:
            parts = message.split(",")[1:]
            data_dict = {}
            for item in parts:
                if "=" in item:
                    key, value = item.split("=", 1)
                    data_dict[key] = value
            pc_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            peak_snapshot = _latest_peak_snapshot()
            drop_entry = {
                "pc_time": pc_time,
                "device_time": data_dict.get("TIME", ""),
                "date": pc_time.split(" ")[0],
                "time": pc_time.split(" ")[1] if " " in pc_time else "",
                "intensity": data_dict.get("INT", ""),
                "peak_g": peak_snapshot["peak_g"] or data_dict.get("PG", ""),
                "peak_g_time": peak_snapshot["peak_g_time"],
                "height": peak_snapshot["height"] or data_dict.get("H", ""),
                "height_time": peak_snapshot["height_time"],
                "temperature": peak_snapshot["temperature"],
                "temperature_time": peak_snapshot["temperature_time"],
                "humidity": peak_snapshot["humidity"],
                "humidity_time": peak_snapshot["humidity_time"],
                "ldr": peak_snapshot["ldr"] or data_dict.get("L", ""),
                "ldr_time": peak_snapshot["ldr_time"],
                "flex": peak_snapshot["flex"] or data_dict.get("F", ""),
                "flex_time": peak_snapshot["flex_time"],
            }
            with _state_lock:
                _drops.append(drop_entry)
            try:
                socketio.emit("drop_event", drop_entry)
            except Exception:
                pass
        except Exception:
            print("DROP RAW:", message)


# ---------------- SEND TIME TO ESP ----------------
async def send_time_to_esp(client):
    current_epoch = int(datetime.now().timestamp())
    time_packet = f"TIME={current_epoch}"
    await client.write_gatt_char(CHAR_UUID, time_packet.encode())
    print("🕒 Time synced to ESP")


# ---------------- CONNECTION LOOP ----------------
async def connect_loop():
    global _esp_connected
    while True:
        print("\n🔄 Trying to connect...")
        try:
            async with BleakClient(ESP_ADDRESS) as client:
                print("✅ Connected to ESP32!")
                _set_esp_connected(True)
                await send_time_to_esp(client)
                await client.start_notify(CHAR_UUID, notification_handler)
                while client.is_connected:
                    await asyncio.sleep(1)
                print("⚠️ Device disconnected.")
        except Exception as e:
            print("❌ Connection error:", e)
        _set_esp_connected(False)
        await asyncio.sleep(2)


def run_async_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(connect_loop())


# ---------------- API ROUTES ----------------
@app.get("/api/status")
def get_status():
    """ESP32 BLE connection status for React."""
    # #region agent log
    _debug_log(
        "H7",
        "hi.py:get_status",
        "status endpoint hit",
        {"esp_connected": _esp_connected},
    )
    # #endregion
    with _state_lock:
        return jsonify({"connected": _esp_connected})


@app.get("/api/live")
def get_live():
    """Live sensor data for React (temp, humidity, roll, pitch, yaw, g, ldr, flex)."""
    with _state_lock:
        connected = _esp_connected
    # #region agent log
    _debug_log(
        "H8",
        "hi.py:get_live",
        "live endpoint hit",
        {
            "connected": connected,
            "temp": live_data.get("T"),
            "humidity": live_data.get("H"),
            "roll": live_data.get("R"),
            "pitch": live_data.get("P"),
            "yaw": live_data.get("Y"),
            "g": live_data.get("G"),
            "ldr": live_data.get("L"),
            "flex": live_data.get("F"),
        },
    )
    # #endregion
    return jsonify({
        "temp": live_data.get("T"),
        "humidity": live_data.get("H"),
        "roll": live_data.get("R"),
        "pitch": live_data.get("P"),
        "yaw": live_data.get("Y"),
        "g": live_data.get("G"),
        "ldr": live_data.get("L"),
        "flex": live_data.get("F"),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "connected": connected,
    })


@app.get("/api/peak-events")
def get_peak_events():
    """Peak events for React Drop History."""
    with _state_lock:
        return jsonify(list(reversed(_peak_events[-MAX_PEAK_EVENTS:])))


@app.get("/api/raw-data")
def get_raw_data():
    """Raw BLE messages for React."""
    with _state_lock:
        return jsonify(list(_raw_data))


@app.get("/api/drops")
def get_drops():
    """Drop events for React, kept in memory (no CSV)."""
    with _state_lock:
        # Most recent first, same field names the frontend already expects
        return jsonify(list(reversed(list(_drops))))


@app.get("/api/otp/config")
def api_otp_config():
    """Whether OTP email env is set (OTP_PEPPER + MAIL_FROM)."""
    return jsonify({"configured": _otp_env_configured()})


@app.post("/api/otp/request")
def api_otp_request():
    """Send 6-digit code to email. JSON: { \"email\" } or { \"user_email\" }."""
    from otp_logic import normalize_email
    from mail_send import MailSendError, send_otp_email

    if not _otp_env_configured():
        return jsonify({"ok": False, "error": "otp_not_configured"}), 503

    store = _get_otp_store()
    data = request.get_json(silent=True) or {}
    raw = _otp_body_email(data)
    if not raw:
        return jsonify({"ok": False, "error": "email or user_email required"}), 400
    try:
        email = normalize_email(str(raw))
    except ValueError:
        return jsonify({"ok": False, "error": "invalid email"}), 400

    allowed, wait = store.can_send(email)
    if not allowed:
        return jsonify(
            {
                "ok": False,
                "error": "rate_limited",
                "retry_after_s": round(wait or 0, 1),
            }
        ), 429

    code = store.create(email)
    try:
        send_otp_email(
            email,
            code,
            minutes=int(os.environ.get("OTP_TTL_MINUTES", "5")),
        )
    except MailSendError as e:
        store.discard(email)
        return jsonify(
            {
                "ok": False,
                "error": "email_send_failed",
                "detail": str(e),
                "extra": getattr(e, "detail", None),
            }
        ), 502

    store.mark_delivered(email)
    if os.environ.get("OTP_DEBUG", "").lower() in ("1", "true", "yes"):
        print(f"[OTP_DEBUG] {email} -> {code}")

    return jsonify({"ok": True, "message": "otp_sent"})


@app.post("/api/otp/verify")
def api_otp_verify():
    """Verify code. JSON: { \"email\", \"code\" }."""
    from otp_logic import normalize_email

    if not _otp_env_configured():
        return jsonify({"ok": False, "error": "otp_not_configured"}), 503

    store = _get_otp_store()
    data = request.get_json(silent=True) or {}
    raw = _otp_body_email(data)
    code = data.get("code")
    if not raw or not code:
        return jsonify(
            {"ok": False, "error": "email (or user_email) and code required"}
        ), 400
    try:
        email = normalize_email(str(raw))
    except ValueError:
        return jsonify({"ok": False, "error": "invalid email"}), 400

    if not store.verify(email, str(code)):
        return jsonify({"ok": False, "error": "invalid_or_expired"}), 401
    return jsonify({"ok": True, "verified": True})


@socketio.on("connect")
def on_connect():
    """Send current state when React client connects."""
    with _state_lock:
        peak_events = list(reversed(_peak_events[-100:]))
        raw_entries = list(_raw_data)[-100:]
        drops = list(reversed(list(_drops)[-100:]))
        connected = _esp_connected
    emit("esp_status", {"connected": connected})
    emit("live_data", {
        "temp": live_data.get("T"),
        "humidity": live_data.get("H"),
        "roll": live_data.get("R"),
        "pitch": live_data.get("P"),
        "yaw": live_data.get("Y"),
        "g": live_data.get("G"),
        "ldr": live_data.get("L"),
        "flex": live_data.get("F"),
        "connected": connected,
    })
    if peak_events:
        emit("peak_events_batch", peak_events)
    if drops:
        emit("drops_batch", drops)
    if raw_entries:
        emit("raw_data_batch", raw_entries)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve the built React app from Flask so a single public URL can host UI + API."""
    if path == "api" or path.startswith("api/") or path.startswith("socket.io"):
        return jsonify({"ok": False, "error": "not_found"}), 404

    if path:
        asset_path = os.path.join(_BUILD_DIR, path)
        if os.path.isfile(asset_path):
            return send_from_directory(_BUILD_DIR, path)

    if os.path.isfile(_BUILD_INDEX):
        return send_from_directory(_BUILD_DIR, "index.html")

    return jsonify(
        {
            "ok": False,
            "error": "frontend_not_built",
            "hint": "Run npm run build to generate the React UI before opening the web URL.",
        }
    ), 404


# ---------------- MAIN ----------------
if __name__ == "__main__":
    # #region agent log
    _debug_log(
        "H9",
        "hi.py:main",
        "backend process started",
        {"port_env": os.environ.get("PORT", "5000")},
    )
    # #endregion
    threading.Thread(target=run_async_loop, daemon=True).start()
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 API + WebSocket server on http://0.0.0.0:{port}")
    print(f"📡 BLE connection running in background")
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
