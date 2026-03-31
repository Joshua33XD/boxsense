import asyncio
import csv
import os
import sys
import threading
from datetime import datetime, timezone
from collections import deque
from bleak import BleakClient
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# ---------------- CONFIG ----------------
ESP_ADDRESS = "9C:13:9E:CE:8F:B2"
CHAR_UUID = "abcd1234-1234-1234-1234-1234567890ab"
CSV_FILE = "drop_log.csv"
MAX_RAW_DATA_ENTRIES = 1000
MAX_PEAK_EVENTS = 1000

# ---------------- CSV INIT ----------------
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["PC_Time", "Device_Time", "Intensity", "Peak_G", "Height_m", "LDR_percent", "FLEX_percent"])

# ---------------- LIVE & PEAK DATA ----------------
live_data = {"T": 0, "H": 0, "R": 0, "P": 0, "Y": 0, "G": 0, "L": 0, "F": 0}

peak_keys = ["TEMP", "HUM", "LDR", "FLEX", "G", "HGT"]
peak_data = {key: 0 for key in peak_keys}
peak_ts = {key: "" for key in peak_keys}

# ---------------- PEAK EVENTS & RAW DATA (for React) ----------------
_peak_events = []
_raw_data = deque(maxlen=MAX_RAW_DATA_ENTRIES)
_state_lock = threading.Lock()
_esp_connected = False


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
            with open(CSV_FILE, mode='a', newline='') as file:
                writer = csv.writer(file)
                writer.writerow([
                    pc_time,
                    data_dict.get("TIME", ""),
                    data_dict.get("INT", ""),
                    data_dict.get("PG", ""),
                    data_dict.get("H", ""),
                    data_dict.get("L", ""),
                    data_dict.get("F", "")
                ])
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
    with _state_lock:
        return jsonify({"connected": _esp_connected})


@app.get("/api/live")
def get_live():
    """Live sensor data for React (temp, humidity, roll, pitch, yaw, g, ldr, flex)."""
    with _state_lock:
        connected = _esp_connected
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
    """Drop events from CSV."""
    if not os.path.exists(CSV_FILE):
        return jsonify([])
    try:
        with open(CSV_FILE, "r", newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        out = []
        for r in rows:
            out.append({
                "pc_time": r.get("PC_Time", ""),
                "device_time": r.get("Device_Time", ""),
                "intensity": r.get("Intensity", ""),
                "peak_g": r.get("Peak_G", ""),
                "height": r.get("Height_m", ""),
                "ldr": r.get("LDR_percent", ""),
                "flex": r.get("FLEX_percent", ""),
            })
        return jsonify(list(reversed(out)))
    except Exception as e:
        print("Error reading drops:", e)
        return jsonify([])


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
    if raw_entries:
        emit("raw_data_batch", raw_entries)


# ---------------- MAIN ----------------
if __name__ == "__main__":
    threading.Thread(target=run_async_loop, daemon=True).start()
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 API + WebSocket server on http://0.0.0.0:{port}")
    print(f"📡 BLE connection running in background")
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)