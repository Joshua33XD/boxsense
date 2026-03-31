import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './TimelineChart.css';

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

export default function TimelineChart({ drops }) {
  const data = useMemo(() => {
    if (!drops || !Array.isArray(drops)) return [];
    const slice = drops.slice(0, 48).reverse();
    return slice.map((row, i) => {
      const p = parseRow(row);
      return {
        ...p,
        idx: i,
      };
    });
  }, [drops]);

  if (data.length === 0) {
    return (
      <div className="dashboard-card dashboard-grid-middle" id="dash-history">
        <div className="dashboard-card-header-row">
          <div className="dashboard-card-title">Drop history</div>
        </div>
        <div className="cargo-chart-empty">
          No drops recorded yet. When your ESP32 logs a drop, the previous peak values for all sensors with date and time will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card dashboard-grid-middle cargo-timeline-card" id="dash-history">
      <div className="dashboard-card-header-row">
        <div className="dashboard-card-title">Drop history</div>
        <span className="cargo-chart-sub">Previous peak values for each drop with full date and time</span>
      </div>
      <div className="cargo-timeline-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--cargo-chart-grid)" />
            <XAxis
              dataKey="idx"
              stroke="var(--cargo-text-subtle)"
              tick={{ fill: 'var(--cargo-text-muted)', fontSize: 10 }}
              hide
            />
            <YAxis
              stroke="var(--cargo-text-subtle)"
              tick={{ fill: 'var(--cargo-text-muted)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--cargo-card)',
                border: `1px solid var(--cargo-border)`,
                borderRadius: 8,
                color: 'var(--cargo-text)',
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.t ? String(payload[0].payload.t) : ''
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="g" name="Peak G" stroke="#38bdf8" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ldr" name="LDR %" stroke="#fbbf24" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="flex" name="Flex %" stroke="#a78bfa" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="cargo-drop-cards" aria-label="Drop history cards">
        {data.slice(-6).map((row) => (
          <div key={`${row.t}-${row.idx}`} className="cargo-drop-card">
            <div className="cargo-drop-card-header">
              <span className="cargo-drop-chip">Drop #{data.length - row.idx}</span>
              <span className="cargo-drop-peak">
                {row.g != null ? row.g.toFixed(2) : '--'}
                <small>g</small>
              </span>
            </div>
            <div className="cargo-drop-meta">
              <span className="cargo-drop-time">
                {row.date || row.time ? [row.date, row.time].filter(Boolean).join(' | ') : (row.t || 'Time: --')}
              </span>
              <span className="cargo-drop-sub">
                LDR {row.ldr != null ? `${row.ldr.toFixed(1)}%` : '--'} · FLEX{' '}
                {row.flex != null ? `${row.flex.toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="cargo-drop-gif" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}
