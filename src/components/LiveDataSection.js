import React from 'react';
import './LiveDataSection.css';
import AnimatedIcon from './AnimatedIcon';
import DataVisualization from './DataVisualization';

const LiveDataSection = ({ data }) => {
  const sensors = [
    { key: 'temp', label: 'Temperature', unit: '°C', icon: '🌡️' },
    { key: 'humidity', label: 'Humidity', unit: '%', icon: '💧' },
    { key: 'roll', label: 'Roll', unit: '', icon: '🔄' },
    { key: 'pitch', label: 'Pitch', unit: '', icon: '📐' },
    { key: 'yaw', label: 'Yaw', unit: '', icon: '🧭' },
    { key: 'g', label: 'G-Force', unit: 'g', icon: '⚡' },
    { key: 'ldr', label: 'LDR', unit: '%', icon: '💡' },
    { key: 'flex', label: 'FLEX', unit: '%', icon: '📏' },
  ];

  const getValue = (key) => {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const value = data[key];
    if (value === null || value === undefined || value === 'None' || value === '') {
      return null;
    }
    return value;
  };

  // Check if we have any real data
  const hasAnyData = sensors.some(sensor => getValue(sensor.key) !== null);

  return (
    <section className="live-data-section">
      <div className="live-data-card">
        <div className="card-header">
          <div className="card-title-wrapper">
            <AnimatedIcon type="sensor" className="title-icon" />
            <h2 className="card-title">Live Sensor Data</h2>
          </div>
          <div className="card-badge">Real-time</div>
        </div>
        {!hasAnyData ? (
          <div className="live-data-empty">
            <div className="empty-state-icon">📡</div>
            <p className="empty-state-text">No live data available</p>
            <p className="empty-state-description">
              Connect ESP32 to start receiving real-time sensor readings
            </p>
          </div>
        ) : (
          <div className="sensor-grid">
            {sensors.map((sensor, index) => {
              const value = getValue(sensor.key);
              const isEmpty = value === null;
              
              return (
                <div 
                  key={sensor.key} 
                  className={`sensor-card ${isEmpty ? 'sensor-card-empty' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="sensor-header">
                    <div className="sensor-icon-wrapper">
                      <div className="sensor-icon">{sensor.icon}</div>
                      {!isEmpty && <div className="sensor-pulse"></div>}
                    </div>
                    <div className="sensor-label">{sensor.label}</div>
                  </div>
                  <div className="sensor-value-container">
                    {isEmpty ? (
                      <div className="sensor-value-empty">No data</div>
                    ) : (
                      <>
                        {sensor.key === 'g' || sensor.key === 'ldr' || sensor.key === 'flex' ? (
                          <DataVisualization 
                            value={value} 
                            max={sensor.key === 'g' ? 10 : 100}
                            color={sensor.key === 'g' ? '#f59e0b' : sensor.key === 'ldr' ? '#3b82f6' : '#4da3e6'}
                          />
                        ) : null}
                        <div className="sensor-value">{value}</div>
                        {sensor.unit && (
                          <span className="sensor-unit">{sensor.unit}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default LiveDataSection;
