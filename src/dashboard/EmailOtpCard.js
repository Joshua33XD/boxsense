import React, { useState, useEffect, useCallback } from 'react';
import './EmailOtpCard.css';

const STORAGE_KEY = 'boxesense_email_otp';
const FIXED_OTP = '55446';

function writeStored(email) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      orderId: email,
      verifiedAt: new Date().toISOString(),
    }),
  );
}

export default function EmailOtpCard({ onVerifiedChange = () => {} }) {
  const [orderId, setOrderId] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState(null);

  useEffect(() => {
    onVerifiedChange(false);
  }, [onVerifiedChange]);

  const onSend = useCallback(() => {
    setMessage('');
    setPhase('code_sent');
    setCode('');
  }, []);

  const onVerify = useCallback(() => {
    const entered = code.trim();
    if (entered === FIXED_OTP) {
      const em = orderId.trim();
      writeStored(em);
      setVerifiedEmail(em);
      onVerifiedChange(true);
      setPhase('verified');
      setMessage('');
      return;
    }

    setMessage('Invalid OTP. Please try again.');
  }, [orderId, code]);

  const onLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setVerifiedEmail(null);
    onVerifiedChange(false);
    setPhase('idle');
    setCode('');
    setMessage('');
  }, [onVerifiedChange]);

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
      <div className="dashboard-card-title">Order verification</div>

      <div className="email-otp-fields">
        <label className="email-otp-label" htmlFor="email-otp-input">
          Order ID
        </label>
        <input
          id="email-otp-input"
          className="email-otp-input"
          type="text"
          autoComplete="off"
          placeholder="Enter your order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
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
              placeholder="Enter OTP"
              maxLength={12}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
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
            disabled={!orderId.trim()}
            onClick={onSend}
          >
            Send code
          </button>
        ) : (
          <>
            <button
              type="button"
              className="cargo-refresh-btn email-otp-btn"
              disabled={code.trim().length < 4}
              onClick={onVerify}
            >
              Verify
            </button>
            <button
              type="button"
              className="email-otp-secondary"
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
