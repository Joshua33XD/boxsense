import React, { useState } from 'react';
import './RawPanel.css';

export default function RawPanel({ rawData }) {
  const [open, setOpen] = useState(false);
  const tail = (rawData || []).slice(-12).reverse();
  const text =
    tail.length === 0
      ? 'No raw data received.\nRaw BLE data will appear here in the same format as received.'
      : tail.map((e) => `[${e.timestamp}] ${e.data}`).join('\n');

  return (
    <div className="dashboard-card dashboard-grid-middle" id="dash-reports">
      <button
        type="button"
        className="cargo-raw-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="dashboard-card-title" style={{ margin: 0 }}>
          Raw Data
        </span>
        <span className={`cargo-raw-chev${open ? ' cargo-raw-chev--open' : ''}`}>
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      <div className={`cargo-raw-collapsible${open ? ' cargo-raw-collapsible--open' : ''}`}>
        <div className="cargo-raw-pre-wrap">
          <pre className="cargo-raw-pre">{text}</pre>
        </div>
      </div>
    </div>
  );
}
