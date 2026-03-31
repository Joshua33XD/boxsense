"""
Email OTP service (Flask). Sends a 6-digit code by SMTP or Resend.

Required env:
  OTP_PEPPER          — long random secret (hashing codes at rest)
  MAIL_FROM           — sender address (e.g. noreply@yourdomain.com or onboarding@resend.dev)

Plus either SMTP vars or Resend (see env.example).

Run:
  pip install -r requirements.txt
  set OTP_PEPPER=...
  set MAIL_FROM=...
  set MAIL_TRANSPORT=smtp
  set SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=...
  python app.py
"""


from __future__ import annotations
from dotenv import load_dotenv
load_dotenv()

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS

from mail_send import MailSendError, send_otp_email
from otp_logic import OTPStore, normalize_email

app = Flask(__name__)
CORS(app, origins=os.environ.get("OTP_CORS_ORIGINS", "*"))

_store: OTPStore | None = None


def _cfg(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise RuntimeError(f"Missing required env var: {name}")
    return v


def get_store() -> OTPStore:
    global _store
    if _store is None:
        ttl = int(os.environ.get("OTP_TTL_S", "300"))
        attempts = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
        cooldown = int(os.environ.get("OTP_RESEND_COOLDOWN_S", "60"))
        _store = OTPStore(
            _cfg("OTP_PEPPER"),
            ttl_s=ttl,
            max_attempts=attempts,
            min_resend_s=cooldown,
        )
    return _store


def _body_email(data: dict) -> str | None:
    return data.get("email") or data.get("user_email")


@app.post("/otp/request")
def otp_request():
    """Body: email or user_email (RFC-like address)."""
    data = request.get_json(silent=True) or {}
    raw = _body_email(data)
    if not raw:
        return jsonify({"ok": False, "error": "email or user_email required"}), 400
    try:
        email = normalize_email(str(raw))
    except ValueError:
        return jsonify({"ok": False, "error": "invalid email"}), 400

    store = get_store()
    allowed, wait = store.can_send(email)
    if not allowed:
        return jsonify(
            {"ok": False, "error": "rate_limited", "retry_after_s": round(wait or 0, 1)}
        ), 429

    code = store.create(email)
    try:
        send_otp_email(email, code, minutes=int(os.environ.get("OTP_TTL_MINUTES", "5")))
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


@app.post("/otp/verify")
def otp_verify():
    """Body: { \"email\" | \"user_email\", \"code\": \"123456\" }"""
    data = request.get_json(silent=True) or {}
    raw = _body_email(data)
    code = data.get("code")
    if not raw or not code:
        return jsonify({"ok": False, "error": "email (or user_email) and code required"}), 400
    try:
        email = normalize_email(str(raw))
    except ValueError:
        return jsonify({"ok": False, "error": "invalid email"}), 400

    ok = get_store().verify(email, str(code))
    if not ok:
        return jsonify({"ok": False, "error": "invalid_or_expired"}), 401
    return jsonify({"ok": True, "verified": True})


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "email-otp"})


if __name__ == "__main__":
    port = int(os.environ.get("OTP_SERVICE_PORT", "3000"))
    _ = _cfg("OTP_PEPPER")
    _ = _cfg("MAIL_FROM")
    app.run(host="0.0.0.0", port=port, threaded=True)
