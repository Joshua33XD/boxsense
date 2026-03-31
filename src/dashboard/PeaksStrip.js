import React, { useMemo } from 'react';
import './PeaksStrip.css';

const ORDER = [
  { parameter: 'Temperature', unit: '°C' },
  { parameter: 'Humidity', unit: '%' },
  { parameter: 'LDR', unit: '%' },
  { parameter: 'FLEX', unit: '%' },
  { parameter: 'G-Force', unit: 'g' },
  { parameter: 'Height', unit: 'm' },
];

function bestByParam(peakEvents) {
  const map = {};
  for (const e of peakEvents || []) {
    const k = e?.parameter;
    const v = Number(e?.value);
    if (!k || Number.isNaN(v)) continue;
    if (map[k] == null || v > map[k].value) {
      map[k] = { value: v, timestamp: e?.timestamp || null };
    }
  }
  return map;
}

function formatPeakTimestamp(raw) {
  if (!raw) return 'Date: -- | Time: --';
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `Date: ${d.toLocaleDateString()} | Time: ${d.toLocaleTimeString()}`;
  }
  const text = String(raw).trim();
  const parts = text.split(/[T ]/);
  if (parts.length >= 2) return `Date: ${parts[0]} | Time: ${parts[1]}`;
  return `Date/Time: ${text}`;
}

export default function PeaksStrip({ peakEvents }) {
  const by = useMemo(() => bestByParam(peakEvents), [peakEvents]);

  return (
    <div className="dashboard-card dashboard-grid-middle" id="dash-analytics">
      <div className="dashboard-card-title">Peak Value</div>
      <div className="cargo-peaks-strip">
        {ORDER.map(({ parameter, unit }) => {
          const hit = by[parameter];
          return (
            <div key={parameter} className="cargo-peak-chip">
              <span className="cargo-peak-name">{parameter}</span>
              <span className="cargo-peak-num">
                {hit ? hit.value.toFixed(1) : '—'}
                <small>{unit}</small>
              </span>
              <span className="cargo-peak-time">{formatPeakTimestamp(hit?.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
