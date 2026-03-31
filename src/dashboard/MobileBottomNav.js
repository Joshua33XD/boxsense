import React from 'react';
import { DASHBOARD_NAV } from './navConfig';
import './MobileBottomNav.css';

export default function MobileBottomNav({ activeId, onNavigate }) {
  return (
    <nav className="cargo-mobile-nav" aria-label="Dashboard sections">
      <div className="cargo-mobile-nav-inner">
        {DASHBOARD_NAV.map(({ id, shortLabel, Icon }) => (
          <button
            key={id}
            type="button"
            className={`cargo-mobile-nav-btn${activeId === id ? ' cargo-mobile-nav-btn--active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon className="cargo-mobile-nav-icon" aria-hidden />
            <span className="cargo-mobile-nav-label">{shortLabel}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
