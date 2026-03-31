"""Send transactional email: SMTP or Resend HTTP API."""

from __future__ import annotations

import json
import os
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage


class MailSendError(Exception):
    def __init__(self, message: str, detail: str | None = None):
        super().__init__(message)
        self.detail = detail


def _cfg(name: str, default: str | None = None) -> str | None:
    return os.environ.get(name, default)


def send_otp_email(to_addr: str, code: str, *, minutes: int = 5) -> None:
    transport = (_cfg("MAIL_TRANSPORT") or "smtp").strip().lower()
    subject = _cfg("MAIL_SUBJECT") or "Your verification code"
    from_addr = _cfg("MAIL_FROM")
    if not from_addr:
        raise MailSendError("MAIL_FROM is required")

    body = (
        f"Your verification code is: {code}\n\n"
        f"It expires in {minutes} minutes. Do not share this code with anyone.\n"
    )

    if transport == "resend":
        _send_resend(to_addr, from_addr, subject, body)
    elif transport == "smtp":
        _send_smtp(to_addr, from_addr, subject, body)
    else:
        raise MailSendError(f"Unknown MAIL_TRANSPORT: {transport}")


def _send_smtp(to_addr: str, from_addr: str, subject: str, body: str) -> None:
    host = _cfg("SMTP_HOST")
    port_s = _cfg("SMTP_PORT", "587")
    user = _cfg("SMTP_USER")
    password = _cfg("SMTP_PASSWORD")
    if not host or not user or not password:
        raise MailSendError("SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required for smtp")

    try:
        port = int(port_s)
    except ValueError as e:
        raise MailSendError("Invalid SMTP_PORT") from e

    use_tls = (_cfg("SMTP_USE_TLS", "true") or "").lower() in ("1", "true", "yes")

    msg = EmailMessage()
    msg["Subject"] = subject
    from_name = (_cfg("MAIL_FROM_NAME") or "").strip()
    msg["From"] = f"{from_name} <{from_addr}>" if from_name else from_addr
    msg["To"] = to_addr
    msg.set_content(body)

    try:
        if use_tls and port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context) as smtp:
                smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port) as smtp:
                smtp.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    smtp.starttls(context=context)
                    smtp.ehlo()
                smtp.login(user, password)
                smtp.send_message(msg)
    except OSError as e:
        raise MailSendError("SMTP connection failed", str(e)) from e
    except smtplib.SMTPException as e:
        raise MailSendError("SMTP send failed", str(e)) from e


def _send_resend(to_addr: str, from_addr: str, subject: str, body: str) -> None:
    api_key = _cfg("RESEND_API_KEY")
    if not api_key:
        raise MailSendError("RESEND_API_KEY is required when MAIL_TRANSPORT=resend")

    payload = {
        "from": from_addr,
        "to": [to_addr],
        "subject": subject,
        "text": body,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        raise MailSendError(f"Resend HTTP {e.code}", err_body) from e
    except urllib.error.URLError as e:
        raise MailSendError("Resend request failed", str(e.reason or e)) from e

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {}

    if isinstance(parsed, dict) and parsed.get("id"):
        return
    if isinstance(parsed, dict) and parsed.get("message"):
        raise MailSendError("Resend error", str(parsed.get("message")))
