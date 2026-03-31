import React from 'react';
import './Gauge.css';

export default function Gauge({ label, value, unit, min, max, color }) {
  const v = value == null || Number.isNaN(value) ? null : Number(value);
  const pct =
    v == null || max <= min ? 0 : Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));

  return (
    <div className="cargo-gauge">
      <div className="cargo-gauge-ring-wrap">
        <div
          className="cargo-gauge-ring"
          style={{
            background: `conic-gradient(${color} ${pct}%, rgba(148,163,184,0.2) 0)`,
          }}
        />
        <div className="cargo-gauge-center">
          <span className="cargo-gauge-val">
            {v != null ? v.toFixed(1) : '—'}
          </span>
          <span className="cargo-gauge-unit">{unit}</span>
        </div>
      </div>
      <div className="cargo-gauge-label">{label}</div>
      <div className="cargo-gauge-range">
        {min}{unit} · {max}
        {unit}
      </div>
    </div>
  );
}
