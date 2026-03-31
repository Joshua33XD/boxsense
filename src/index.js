import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// #region agent log (startup crash evidence)
const DEBUG_ENDPOINT =
  'http://127.0.0.1:7274/ingest/45028dbe-909d-4ab6-8d54-6aacd37e93f8';
const DEBUG_SESSION_ID = '601a3e';
const DEBUG_RUN_ID = 'run_before';

function debugLog(hypothesisId, location, message, data) {
  try {
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
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    debugLog('H0', 'src/index.js:window.error', 'window.error', {
      message: event?.message,
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    debugLog('H0', 'src/index.js:unhandledrejection', 'unhandledrejection', {
      reason: event?.reason ? String(event.reason) : null,
    });
  });
  debugLog('H0', 'src/index.js:boot', 'client boot', {
    host: window.location?.host,
    protocol: window.location?.protocol,
    pathname: window.location?.pathname,
  });
}
// #endregion

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
