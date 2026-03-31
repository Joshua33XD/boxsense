import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import './MotionChart.css';

const CHART_COLORS = {
  grid: 'var(--cargo-chart-grid)',
  axis: 'var(--cargo-text-subtle)',
  tick: 'var(--cargo-text-muted)',
  g: '#38bdf8',
  impact: '#ef4444',
};

export default function MotionChart({ series }) {
  const data = useMemo(() => {
    if (!series || series.length === 0) return [];
    const lastT = series[series.length - 1].t;
    return series.map((p, i) => ({
      idx: i,
      sec: Math.round((p.t - lastT) / 1000),
      g: p.g,
      impact: p.impact,
    }));
  }, [series]);

  const impacts = useMemo(() => data.filter((d) => d.impact != null), [data]);
  const latest = data[data.length - 1];
  const peak = useMemo(
    () => data.reduce((max, point) => (point.g > max ? point.g : max), 0),
    [data],
  );
  const latestImpact = impacts[impacts.length - 1] ?? null;

  if (data.length === 0) {
    return (
      <div className="dashboard-card dashboard-grid-middle" id="dash-live">
        <div className="dashboard-card-title">Live G-force</div>
        <div className="cargo-chart-empty">
          Connect ESP32 to start visualizing sensor data.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card dashboard-grid-middle cargo-motion-card" id="dash-live">
      <div className="dashboard-card-header-row">
        <div>
          <div className="dashboard-card-title">Motion and impact</div>
          <div className="cargo-motion-subrow">
            <span className="cargo-chart-sub">Last ~60 seconds</span>
            <span className="cargo-motion-live-pill">Live stream</span>
          </div>
        </div>
        <div className="cargo-motion-stats" aria-label="Motion summary">
          <div className="cargo-motion-stat">
            <span className="cargo-motion-stat-label">Current</span>
            <span className="cargo-motion-stat-value">{latest?.g?.toFixed(2)}g</span>
          </div>
          <div className="cargo-motion-stat">
            <span className="cargo-motion-stat-label">Peak</span>
            <span className="cargo-motion-stat-value">{peak.toFixed(2)}g</span>
          </div>
          <div className={`cargo-motion-stat ${latestImpact ? 'cargo-motion-stat--impact' : ''}`}>
            <span className="cargo-motion-stat-label">Impacts</span>
            <span className="cargo-motion-stat-value">{impacts.length}</span>
          </div>
        </div>
      </div>
      <div className="cargo-motion-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cargoMotionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.32} />
                <stop offset="65%" stopColor="#38bdf8" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <ReferenceArea
              y1={2.8}
              y2={Math.max(peak + 0.4, 3.4)}
              fill="rgba(239, 68, 68, 0.08)"
              ifOverflow="extendDomain"
            />
            <ReferenceLine
              y={2.8}
              stroke="rgba(248, 113, 113, 0.55)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey="idx"
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
              interval="preserveStartEnd"
              tickFormatter={(idx) => {
                const row = data[idx];
                return row != null ? `${row.sec}s` : '';
              }}
            />
            <YAxis
              stroke={CHART_COLORS.axis}
              tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--cargo-card)',
                border: `1px solid var(--cargo-border)`,
                borderRadius: 12,
                color: 'var(--cargo-text)',
                boxShadow: '0 18px 40px rgba(2, 6, 23, 0.28)',
              }}
              formatter={(val) => (val != null ? `${Number(val).toFixed(3)} g` : '')}
              labelFormatter={(l) => `${l}s`}
            />
            <Area
              type="monotone"
              dataKey="g"
              fill="url(#cargoMotionFill)"
              stroke="none"
              isAnimationActive
              animationDuration={260}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="g"
              name="G-Force"
              stroke={CHART_COLORS.g}
              strokeWidth={3}
              dot={false}
              isAnimationActive
              animationDuration={260}
              animationEasing="ease-out"
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5, fill: CHART_COLORS.g }}
            />
            {impacts.map((d, i) => (
              <ReferenceDot
                key={`${d.idx}-${i}`}
                x={d.idx}
                y={d.g}
                r={6}
                fill={CHART_COLORS.impact}
                stroke="#fff"
                strokeWidth={1.5}
              />
            ))}
            {latest ? (
              <ReferenceDot
                x={latest.idx}
                y={latest.g}
                r={7}
                fill="#f8fafc"
                stroke={CHART_COLORS.g}
                strokeWidth={3}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="cargo-motion-footer">
        <div className="cargo-motion-threshold">
          <span className="cargo-motion-threshold-line" aria-hidden />
          Impact threshold at <strong>2.8g</strong>
        </div>
        <div className="cargo-motion-event">
          {latestImpact ? `Latest impact ${latestImpact.g.toFixed(2)}g` : 'No impact spike in current window'}
        </div>
      </div>
    </div>
  );
}
