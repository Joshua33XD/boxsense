import React, { useEffect, useState } from 'react';
import './PeakDataSection.css';

const PEAK_KEYS = [
  { key: 'temperature', label: 'TEMP', unit: '°C', format: (v) => parseFloat(v).toFixed(2) },
  { key: 'humidity', label: 'HUM', unit: '%', format: (v) => parseFloat(v).toFixed(2) },
  { key: 'ldr', label: 'LDR', unit: '%', format: (v) => parseFloat(v).toFixed(2) },
  { key: 'flex', label: 'FLEX', unit: '%', format: (v) => parseFloat(v).toFixed(2) },
  { key: 'g_force', label: 'G', unit: 'g', format: (v) => parseFloat(v).toFixed(2) },
];

function formatTimestamp(ts) {
  if (!ts) return 'No data';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      year: 'numeric',
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

function PeakRow({ item, peakData, lastChange, index, justUpdated }) {
  const value = peakData?.[item.key];
  const displayValue = value != null && value !== '' && value !== undefined 
    ? item.format(String(value)) + (item.unit || '') 
    : 'No data';
  const displayTime = lastChange ? formatTimestamp(lastChange) : 'No data';

  return (
    <div
      className={`peak-data-row ${justUpdated ? 'peak-data-row-updated' : ''} ${value == null ? 'peak-data-row-empty' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="peak-data-label">
        {item.label}: <span className="peak-data-value">{displayValue}</span>
      </div>
      <div className="peak-data-time">{displayTime}</div>
    </div>
  );
}

export default function PeakDataSection({ peakData, lastChange }) {
  const [justUpdated, setJustUpdated] = useState({});
  const prevPeakRef = React.useRef(null);

  useEffect(() => {
    if (!peakData || !prevPeakRef.current) {
      prevPeakRef.current = peakData ? { ...peakData } : {};
      return;
    }
    const next = {};
    PEAK_KEYS.forEach(({ key }) => {
      const prevVal = prevPeakRef.current[key];
      const currVal = peakData[key];
      if (currVal != null && currVal !== '' && String(currVal) !== String(prevVal)) {
        next[key] = true;
      }
    });
    if (Object.keys(next).length > 0) {
      setJustUpdated(next);
      const t = setTimeout(() => setJustUpdated({}), 800);
      return () => clearTimeout(t);
    }
    prevPeakRef.current = peakData ? { ...peakData } : {};
  }, [peakData]);

  // Check if we have any peak data
  const hasData = peakData && Object.values(peakData).some(
    val => val != null && val !== '' && val !== undefined
  );

  return (
    <section className="peak-data-section">
      <div className="peak-data-card">
        <div className="peak-data-header">
          <h2 className="peak-data-title">Peak Data (BLE)</h2>
        </div>
        {!hasData ? (
          <div className="peak-data-empty">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-text">No peak data available</p>
            <p className="empty-state-description">
              Connect ESP32 to start receiving peak sensor values
            </p>
          </div>
        ) : (
          <div className="peak-data-list">
            {PEAK_KEYS.map((item, index) => (
              <PeakRow
                key={item.key}
                item={item}
                peakData={peakData}
                lastChange={lastChange}
                index={index}
                justUpdated={justUpdated[item.key]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
