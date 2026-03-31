import React from 'react';
import './RealtimePeaksSection.css';

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return ts;
  }
}

function PeakBlock({ label, value, unit }) {
  const display = value != null && value !== '' && value !== undefined 
    ? Number(value).toFixed(2) 
    : 'No data';
  return (
    <div className="realtime-peak-block">
      <div className="realtime-peak-label">{label}</div>
      <div className={`realtime-peak-value ${value == null ? 'realtime-peak-value-empty' : ''}`}>
        {display}
        {value != null && <span className="realtime-peak-unit">{unit}</span>}
      </div>
    </div>
  );
}

export default function RealtimePeaksSection({ peakData, lastChange, connected }) {
  // Check if we have any peak data
  const hasData = peakData && (
    peakData.temperature != null ||
    peakData.humidity != null ||
    peakData.g_force != null ||
    peakData.ldr != null ||
    peakData.flex != null
  );

  return (
    <section className="realtime-peaks-section">
      <div className="realtime-peaks-card">
        <div className="realtime-peaks-header">
          <h2 className="realtime-peaks-title">BLE Live Peaks</h2>
          <div className="realtime-peaks-meta">
            {connected ? (
              <span className="realtime-status connected">● Live</span>
            ) : (
              <span className="realtime-status disconnected">○ Connecting…</span>
            )}
            {lastChange && hasData && (
              <span className="realtime-last-change">
                Last peak change: {formatTimestamp(lastChange)}
              </span>
            )}
          </div>
        </div>
        {!hasData ? (
          <div className="realtime-peaks-empty">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-text">No peak data available</p>
            <p className="empty-state-description">
              {connected 
                ? 'Waiting for peak data from ESP32...' 
                : 'Connect ESP32 to start receiving peak values'}
            </p>
          </div>
        ) : (
          <div className="realtime-peaks-grid">
            <PeakBlock
              label="Temperature"
              value={peakData?.temperature}
              unit="°C"
            />
            <PeakBlock
              label="Humidity"
              value={peakData?.humidity}
              unit="%"
            />
            <PeakBlock
              label="G-Force"
              value={peakData?.g_force}
              unit="g"
            />
            <PeakBlock
              label="LDR"
              value={peakData?.ldr}
              unit="%"
            />
            <PeakBlock
              label="FLEX"
              value={peakData?.flex}
              unit="%"
            />
          </div>
        )}
      </div>
    </section>
  );
}
