import React from 'react';
import { DASHBOARD_NAV } from './navConfig';
import './Sidebar.css';

export default function Sidebar({ activeId, onNavigate, espConnected }) {
  return (
    <aside className="cargo-sidebar">
      <div className="cargo-sidebar-brand">
        <div className="cargo-sidebar-logo">BS</div>
        <div>
          <div className="cargo-sidebar-title">BoxSense</div>
          <div className="cargo-sidebar-sub">Drop detection</div>
        </div>
      </div>

      <nav className="cargo-sidebar-nav" aria-label="Main">
        {DASHBOARD_NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`cargo-nav-item${activeId === id ? ' cargo-nav-item--active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon className="cargo-nav-icon" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="cargo-sidebar-devices">
        <div className="cargo-devices-label">Device</div>
        <div className={`cargo-device-row ${espConnected ? 'cargo-device-row--online' : ''}`}>
          <span className="cargo-device-dot" aria-hidden />
          <div>
            <div className="cargo-device-id">ESP32</div>
            <div className="cargo-device-meta">
              {espConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
