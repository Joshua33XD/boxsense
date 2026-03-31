import React, { useState, useEffect, useCallback } from 'react';
import './EmailOtpCard.css';

const API_BASE = process.env.REACT_APP_API_URL || '';
const STORAGE_KEY = 'boxesense_email_otp';
const DEBUG_ENDPOINT =
  'http://127.0.0.1:7274/ingest/45028dbe-909d-4ab6-8d54-6aacd37e93f8';
const DEBUG_SESSION_ID = '601a3e';
const DEBUG_RUN_ID = 'run_before';

function debugLog(hypothesisId, location, message, data) {
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: DEBUG_RUN_ID,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStored(email) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      email,
      verifiedAt: new Date().toISOString(),
    }),
  );
}

export default function EmailOtpCard() {
  const [serverOk, setServerOk] = useState(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const raw = (() => {
      try {
        return sessionStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    const stored = readStored();
    const hasRaw = !!raw;
    const hasStoredEmail = !!stored?.email;
    const hasVerifiedAt = !!stored?.verifiedAt;

    // #region agent log
    debugLog(
      'H1',
      'src/dashboard/EmailOtpCard.js:mount',
      'sessionStorage OTP presence',
      { hasRaw, hasStoredEmail, hasVerifiedAt },
    );
    // #endregion

    setVerifiedEmail(stored?.email || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // #region agent log
    debugLog(
      'H1',
      'src/dashboard/EmailOtpCard.js:verifiedEmail change',
      'verifiedEmail state',
      { hasVerifiedEmail: !!verifiedEmail },
    );
    // #endregion
  }, [verifiedEmail]);

  useEffect(() => {
    return () => {
      // #region agent log
      debugLog(
        'H3',
        'src/dashboard/EmailOtpCard.js:unmount',
        'EmailOtpCard unmounted',
        {},
      );
      // #endregion
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/otp/config`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setServerOk(!!d.configured);
      })
      .catch(() => {
        if (!cancelled) setServerOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSend = useCallback(async () => {
    setMessage('');
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (data.ok) {
        setPhase('code_sent');
        setMessage('Check your inbox for the verification code.');
      } else if (r.status === 429) {
        setMessage(
          `Please wait ${data.retry_after_s ?? ''}s before requesting another code.`,
        );
      } else {
        setMessage(data.detail || data.error || 'Could not send email.');
      }
    } catch {
      setMessage('Network error — is the API running?');
    } finally {
      setBusy(false);
    }
  }, [email]);

  const onVerify = useCallback(async () => {
    setMessage('');
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (data.ok && data.verified) {
        const em = email.trim();
        writeStored(em);
        setVerifiedEmail(em);
        setPhase('verified');
        setMessage('');
      } else {
        setMessage(data.error === 'invalid_or_expired' ? 'Invalid or expired code.' : 'Verification failed.');
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setBusy(false);
    }
  }, [email, code]);

  const onLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setVerifiedEmail(null);
    setPhase('idle');
    setCode('');
    setMessage('');
  }, []);

  if (verifiedEmail) {
    return (
      <div className="dashboard-card email-otp-card email-otp-card--verified" id="dash-email-otp">
        <div className="email-otp-row">
          <span className="email-otp-badge-ok">Verified</span>
          <span className="email-otp-verified-email">{verifiedEmail}</span>
          <button type="button" className="email-otp-text-btn" onClick={onLogout}>
            Use different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card email-otp-card" id="dash-email-otp">
      <div className="dashboard-card-title">Email verification</div>

      {serverOk === false && (
        <p className="email-otp-warn">
          Server is not configured for email OTP. Set <code>OTP_PEPPER</code> and{' '}
          <code>MAIL_FROM</code> (plus SMTP or Resend) on the Python server — see{' '}
          <code>email_otp/env.example</code>.
        </p>
      )}

      <div className="email-otp-fields">
        <label className="email-otp-label" htmlFor="email-otp-input">
          Email
        </label>
        <input
          id="email-otp-input"
          className="email-otp-input"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy || serverOk === false}
        />

        {phase === 'code_sent' && (
          <>
            <label className="email-otp-label" htmlFor="email-otp-code">
              Code
            </label>
            <input
              id="email-otp-code"
              className="email-otp-input email-otp-input-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 digits"
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              disabled={busy}
            />
          </>
        )}
      </div>

      {message ? <p className="email-otp-msg">{message}</p> : null}

      <div className="email-otp-actions">
        {phase !== 'code_sent' ? (
          <button
            type="button"
            className="cargo-refresh-btn email-otp-btn"
            disabled={busy || !email.trim() || serverOk === false}
            onClick={onSend}
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="cargo-refresh-btn email-otp-btn"
              disabled={busy || code.trim().length < 4}
              onClick={onVerify}
            >
              {busy ? 'Checking…' : 'Verify'}
            </button>
            <button
              type="button"
              className="email-otp-secondary"
              disabled={busy}
              onClick={onSend}
            >
              Resend
            </button>
          </>
        )}
      </div>
    </div>
  );
}
