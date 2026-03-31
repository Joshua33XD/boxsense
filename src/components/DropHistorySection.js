import React, { useMemo } from 'react';
import './DropHistorySection.css';

/** Reduce peak events to one highest value per parameter, keeping its time */
function highestPeakPerParameter(peakEvents) {
  const byParam = {};
  for (const event of peakEvents) {
    const name = event?.parameter;
    const value = Number(event?.value);
    if (name == null || Number.isNaN(value)) continue;
    if (byParam[name] == null || value > byParam[name].value) {
      byParam[name] = {
        value,
        timestamp: event?.timestamp ?? null,
        date: event?.date ?? null,
        time: event?.time ?? null,
      };
    }
  }
  return Object.entries(byParam).map(([parameter, info]) => ({
    parameter,
    value: info.value,
    timestamp: info.timestamp,
    date: info.date,
    time: info.time,
  }));
}

const unitMap = {
  Temperature: '°C',
  Humidity: '%',
  LDR: '%',
  FLEX: '%',
  'G-Force': 'g',
  Height: 'm',
};

const iconMap = {
  Temperature: '🌡️',
  Humidity: '💧',
  LDR: '💡',
  FLEX: '📏',
  'G-Force': '⚡',
  Height: '📈',
};

const accentMap = {
  Temperature: { color: '#f97373', name: 'temperature' },
  Humidity: { color: '#38bdf8', name: 'humidity' },
  LDR: { color: '#eab308', name: 'ldr' },
  FLEX: { color: '#22c55e', name: 'flex' },
  'G-Force': { color: '#f97316', name: 'g-force' },
  Height: { color: '#a855f7', name: 'height' },
};

const maxMap = {
  Temperature: 50,
  Humidity: 100,
  LDR: 100,
  FLEX: 100,
  'G-Force': 10,
  Height: 5,
};

const orderedParameters = Object.keys(unitMap);

const DropHistorySection = ({ peakEvents, loading }) => {
  const highestPeaks = useMemo(() => highestPeakPerParameter(peakEvents), [peakEvents]);

  const displayPeaks = useMemo(() => {
    const byName = new Map();
    highestPeaks.forEach((p) => {
      byName.set(p.parameter, p);
    });
    return orderedParameters.map((name) => {
      const match = byName.get(name);
      return (
        match || {
          parameter: name,
          value: null,
          date: null,
          time: null,
          timestamp: null,
        }
      );
    });
  }, [highestPeaks]);

  const hasAnyPeakValue = highestPeaks.some(
    (p) => p.value !== null && !Number.isNaN(Number(p.value)),
  );

  if (loading && peakEvents.length === 0) {
    return (
      <section className="drop-section">
        <div className="drop-history-card">
          <div className="card-header">
            <h2 className="card-title">Peak Value</h2>
          </div>
          <div className="loading-state">
            <div className="spinner" />
            <p className="loading-text">Loading peak values...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="drop-section">
      <div className="drop-history-card">
        <div className="card-header">
          <div className="card-title-wrapper">
            <span className="peak-live-dot" />
            <h2 className="card-title">Peak Value</h2>
          </div>
          <span className="card-count">
            {displayPeaks.length} {displayPeaks.length === 1 ? 'parameter' : 'parameters'}
          </span>
        </div>

        <div className="drop-history">
          <div className="peak-values-wrap">
            {displayPeaks.map((event) => {
              const unit = unitMap[event.parameter] || '';
              const icon = iconMap[event.parameter] || '📊';
              const accent = accentMap[event.parameter] || { color: '#64748b', name: 'generic' };
              const max = maxMap[event.parameter] ?? 100;
              const hasValue = event.value !== null && !Number.isNaN(Number(event.value));
              const numValue = hasValue ? Number(event.value) : 0;
              const relativeIntensity = max > 0 ? Math.min(1, numValue / max) : 0;
              const paramClass = accent.name ? `peak-value-item--${accent.name}` : 'peak-value-item--generic';
              return (
                <div
                  key={event.parameter}
                  className={`peak-value-item ${paramClass}`}
                  style={{ '--accent': accent.color }}
                >
                  <span className="peak-accent-bar" />
                  <span className="peak-badge">PEAK</span>
                  <div className="peak-value-top">
                    <div>
                      <span className="peak-value-label">{event.parameter}</span>
                      {unit && <span className="peak-value-unit">{unit}</span>}
                    </div>
                    <div className="peak-icon-circle">
                      <span className="peak-icon">{icon}</span>
                    </div>
                  </div>
                  <div className="peak-value-main">
                    {hasValue ? (
                      <span className="peak-value-number">{Number(event.value).toFixed(2)}</span>
                    ) : (
                      <span className="peak-value-empty">—</span>
                    )}
                  </div>
                  {hasValue && (
                    <div className="peak-intensity-bar">
                      <div className="peak-intensity-track">
                        <div
                          className="peak-intensity-fill"
                          style={{ width: `${Math.round(relativeIntensity * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="peak-value-footer">
                    {hasValue && (event.date || event.time) ? (
                      <span className="peak-value-meta">
                        {[event.date, event.time].filter(Boolean).join(' • ')}
                      </span>
                    ) : (
                      <span className="peak-value-meta">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!hasAnyPeakValue && (
            <div className="peak-helper-text">
              Waiting for peak data from ESP32.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DropHistorySection;
