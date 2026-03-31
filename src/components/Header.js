import React from 'react';
import './Header.css';
import AnimatedIcon from './AnimatedIcon';

const Header = ({ onRefresh, lastUpdate, espConnected }) => {
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="header-title">
          Real-Time Cargo Integrity and Safety Detection
          </h1>
          <p className="header-subtitle">
            Real-time sensor monitoring & drop analysis
          </p>
        </div>
        <div className="header-right">
          <div className={`esp-status ${espConnected ? 'esp-connected' : 'esp-disconnected'}`}>
            <span className="esp-status-dot" />
            <span className="esp-status-text">
              ESP32 {espConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <div className="header-status">
              <div className="status-indicator"></div>
              <span className="status-text">
                Updated {formatTime(lastUpdate)}
              </span>
            </div>
          )}
          <button 
            className="refresh-button" 
            onClick={onRefresh}
            aria-label="Refresh data"
          >
            <AnimatedIcon type="refresh" />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
