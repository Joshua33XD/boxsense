import React, { useMemo } from 'react';
import './TimelineChart.css';

const HISTORY_LIMIT = 3;

function parseRow(r) {
  const g = parseFloat(r.peak_g);
  const ldr = parseFloat(r.ldr);
  const flex = parseFloat(r.flex);
  const temp = parseFloat(r.temperature);
  const humidity = parseFloat(r.humidity);
  const height = parseFloat(r.height);

  return {
    t: r.pc_time || r.device_time || '',
    date: r.date || '',
    time: r.time || '',
    g: Number.isNaN(g) ? null : g,
    ldr: Number.isNaN(ldr) ? null : ldr,
    flex: Number.isNaN(flex) ? null : flex,
    temp: Number.isNaN(temp) ? null : temp,
    humidity: Number.isNaN(humidity) ? null : humidity,
    height: Number.isNaN(height) ? null : height,
  };
}

function parsePeakEvents(events) {
  const grouped = new Map();
  for (const e of events || []) {
    const ts = String(e?.timestamp || '').trim();
    if (!ts) continue;
    const val = Number(e?.value);
    if (Number.isNaN(val)) continue;
    if (!grouped.has(ts)) {
      const parts = ts.split(/[T ]/);
      grouped.set(ts, {
        t: ts,
        date: parts[0] || '',
        time: parts[1] || '',
        g: null,
        ldr: null,
        flex: null,
        temp: null,
        humidity: null,
        height: null,
      });
    }
    const row = grouped.get(ts);
    if (e.parameter === 'G-Force') row.g = val;
    if (e.parameter === 'LDR') row.ldr = val;
    if (e.parameter === 'FLEX') row.flex = val;
    if (e.parameter === 'Temperature') row.temp = val;
    if (e.parameter === 'Humidity') row.humidity = val;
    if (e.parameter === 'Height') row.height = val;
  }
  return Array.from(grouped.values())
    .sort((a, b) => String(a.t).localeCompare(String(b.t)))
    .slice(-48)
    .map((row, idx) => ({ ...row, idx }));
}

function impactTone(value) {
  if (value == null) return 'low';
  if (value >= 4.5) return 'high';
  if (value >= 3) return 'medium';
  return 'low';
}

export default function TimelineChartV2({ drops, peakEvents }) {
  const data = useMemo(() => {
    if (Array.isArray(drops) && drops.length > 0) {
      const slice = drops.slice(0, HISTORY_LIMIT);
      return slice.map((row, i) => ({
        ...parseRow(row),
        idx: i,
      }));
    }
    return parsePeakEvents(peakEvents).slice(-HISTORY_LIMIT).reverse();
  }, [drops, peakEvents]);

  if (data.length === 0) {
    return (
      <div className="dashboard-card dashboard-grid-middle" id="dash-history">
        <div className="dashboard-card-header-row">
          <div className="dashboard-card-title">Drop history</div>
        </div>
        <div className="cargo-chart-empty">
          No drops recorded yet. Showing this section as soon as peak values with timestamp are available.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card dashboard-grid-middle cargo-timeline-card" id="dash-history">
      <div className="dashboard-card-header-row">
        <div className="dashboard-card-title">Drop history</div>
        <span className="cargo-chart-sub">Showing only the latest {HISTORY_LIMIT} drop entries</span>
      </div>
      <div className="cargo-drop-cards cargo-drop-cards--compact" aria-label="Drop history cards">
        {data.map((row, index) => (
          <div
            key={`${row.t}-${row.idx}`}
            className={`cargo-drop-card cargo-drop-card--${impactTone(row.g)}`}
          >
            <div className="cargo-drop-card-header">
              <span className="cargo-drop-chip">Drop #{index + 1}</span>
              <span className="cargo-drop-peak">
                {row.g != null ? row.g.toFixed(2) : '--'}
                <small>g</small>
              </span>
            </div>
            <div className="cargo-drop-meta">
              <span className="cargo-drop-time">
                {row.date || row.time ? [row.date, row.time].filter(Boolean).join(' | ') : (row.t || 'Time: --')}
              </span>
              <div className="cargo-drop-stats">
                <span className="cargo-drop-stat cargo-drop-stat--temp">
                  <small>Temp</small>
                  <strong>{row.temp != null ? row.temp.toFixed(1) : '--'}</strong>
                  <em>C</em>
                </span>
                <span className="cargo-drop-stat cargo-drop-stat--humidity">
                  <small>Humidity</small>
                  <strong>{row.humidity != null ? row.humidity.toFixed(1) : '--'}</strong>
                  <em>%</em>
                </span>
                <span className="cargo-drop-stat cargo-drop-stat--ldr">
                  <small>LDR</small>
                  <strong>{row.ldr != null ? row.ldr.toFixed(1) : '--'}</strong>
                  <em>%</em>
                </span>
                <span className="cargo-drop-stat cargo-drop-stat--flex">
                  <small>Flex</small>
                  <strong>{row.flex != null ? row.flex.toFixed(1) : '--'}</strong>
                  <em>%</em>
                </span>
                <span className="cargo-drop-stat cargo-drop-stat--wide cargo-drop-stat--height">
                  <small>Height</small>
                  <strong>{row.height != null ? row.height.toFixed(2) : '--'}</strong>
                  <em>m</em>
                </span>
              </div>
            </div>
            <div className="cargo-drop-meter" aria-hidden>
              <span className="cargo-drop-meter-track">
                <span
                  className="cargo-drop-meter-fill"
                  style={{ width: `${Math.max(12, Math.min(100, ((row.g ?? 0) / 6) * 100))}%` }}
                />
              </span>
              <span className="cargo-drop-meter-label">
                {row.g != null && row.g >= 4.5 ? 'Critical impact' : row.g != null && row.g >= 3 ? 'High impact' : 'Controlled impact'}
              </span>
            </div>
            <div className="cargo-drop-gif" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}
