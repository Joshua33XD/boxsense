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
  return {
    t: r.pc_time || r.device_time || '',
    g: Number.isNaN(g) ? null : g,
    ldr: Number.isNaN(ldr) ? null : ldr,
    flex: Number.isNaN(flex) ? null : flex,
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
          <div className="dashboard-card-title">Drop history (CSV)</div>
        </div>
        <div className="cargo-chart-empty">
          No drop log yet. Drop events from your ESP32 log will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card dashboard-grid-middle cargo-timeline-card" id="dash-history">
      <div className="dashboard-card-header-row">
        <div className="dashboard-card-title">Drop history (CSV)</div>
        <span className="cargo-chart-sub">Recent drops from drop_log.csv</span>
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
    </div>
  );
}
