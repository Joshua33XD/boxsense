"""OTP generation, storage, and verification (in-memory)."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import threading
import time
from dataclasses import dataclass

def normalize_email(email: str) -> str:
    s = (email or "").strip().lower()
    if len(s) < 5 or len(s) > 254:
        raise ValueError("invalid email")
    if s.count("@") != 1:
        raise ValueError("invalid email")
    local, domain = s.split("@", 1)
    if not local or not domain or "." not in domain:
        raise ValueError("invalid email")
    if re.search(r"\s", s):
        raise ValueError("invalid email")
    return s


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(length))


def _hash_code(pepper: str, code: str) -> str:
    return hmac.new(
        pepper.encode("utf-8"),
        code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@dataclass
class _Entry:
    code_hash: str
    expires_at: float
    attempts_left: int


class OTPStore:
    def __init__(
        self,
        pepper: str,
        *,
        ttl_s: int = 300,
        max_attempts: int = 5,
        min_resend_s: int = 60,
    ):
        self._pepper = pepper
        self._ttl_s = ttl_s
        self._max_attempts = max_attempts
        self._min_resend_s = min_resend_s
        self._lock = threading.Lock()
        self._by_email: dict[str, _Entry] = {}
        self._last_send: dict[str, float] = {}

    def can_send(self, email: str) -> tuple[bool, float | None]:
        now = time.monotonic()
        with self._lock:
            last = self._last_send.get(email)
            if last is None:
                return True, None
            wait = self._min_resend_s - (now - last)
            if wait > 0:
                return False, wait
            return True, None

    def create(self, email: str) -> str:
        code = generate_otp()
        now = time.monotonic()
        with self._lock:
            self._by_email[email] = _Entry(
                code_hash=_hash_code(self._pepper, code),
                expires_at=now + self._ttl_s,
                attempts_left=self._max_attempts,
            )
        return code

    def mark_delivered(self, email: str) -> None:
        with self._lock:
            self._last_send[email] = time.monotonic()

    def discard(self, email: str) -> None:
        with self._lock:
            self._by_email.pop(email, None)

    def verify(self, email: str, code: str) -> bool:
        now = time.monotonic()
        with self._lock:
            entry = self._by_email.get(email)
            if entry is None:
                return False
            if now > entry.expires_at:
                del self._by_email[email]
                return False
            if entry.attempts_left <= 0:
                del self._by_email[email]
                return False
            entry.attempts_left -= 1
            ok = hmac.compare_digest(entry.code_hash, _hash_code(self._pepper, code.strip()))
            if ok:
                del self._by_email[email]
            elif entry.attempts_left <= 0:
                del self._by_email[email]
            return ok
