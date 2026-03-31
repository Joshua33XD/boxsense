import React from 'react';
import { IconSun, IconMoon } from './icons';
import './TopBar.css';

function formatTime(date) {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function TopBar({
  espConnected,
  lastUpdate,
  theme,
  loading,
  onToggleTheme,
  onRefresh,
}) {
  return (
    <header className="cargo-topbar">
      <div className="cargo-topbar-inner">
        <div className="cargo-topbar-left">
          <div className="cargo-topbar-headings">
            <h1 className="cargo-topbar-h1">
              Real-Time Cargo Integrity and Safety Detection
            </h1>
            <p className="cargo-topbar-sub">
              Real-time sensor monitoring &amp; drop analysis
            </p>
          </div>
          <div className="cargo-topbar-esp-row">
            <span className={`cargo-pill ${espConnected ? 'cargo-pill--ok' : 'cargo-pill--off'}`}>
              <span className="cargo-pill-dot" aria-hidden />
              {espConnected ? 'Online' : 'Offline'}
            </span>
            <span className="cargo-topbar-meta">
              <span className="cargo-meta-strong">ESP32</span>
              <span className="cargo-meta-sep">·</span>
              <span>{espConnected ? 'Connected' : 'Disconnected'}</span>
              {lastUpdate ? (
                <>
                  <span className="cargo-meta-sep">·</span>
                  <span className="cargo-meta-dim">Updated {formatTime(lastUpdate)}</span>
                </>
              ) : null}
            </span>
          </div>
        </div>

        <div className="cargo-topbar-metrics">
          <div className="cargo-metric">
            <span className="cargo-metric-label">Transport</span>
            <span className="cargo-metric-value">{espConnected ? 'BLE' : '—'}</span>
          </div>
          <div className="cargo-metric">
            <span className="cargo-metric-label">Live stream</span>
            <span className="cargo-metric-value">{espConnected ? 'Active' : '—'}</span>
          </div>
          <div className="cargo-metric">
            <span className="cargo-metric-label">Last update</span>
            <span className="cargo-metric-value cargo-metric-mono">{formatTime(lastUpdate)}</span>
          </div>
        </div>

        <div className="cargo-topbar-actions">
          <div className="cargo-topbar-radar" aria-hidden>
            <span className="cargo-topbar-radar-ring cargo-topbar-radar-ring--one" />
            <span className="cargo-topbar-radar-ring cargo-topbar-radar-ring--two" />
            <span className="cargo-topbar-radar-ring cargo-topbar-radar-ring--three" />
            <span className="cargo-topbar-radar-sweep" />
            <span className="cargo-topbar-radar-core" />
          </div>
          <button
            type="button"
            className="cargo-icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            className={`cargo-refresh-btn ${loading ? 'cargo-refresh-btn--loading' : ''}`}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
