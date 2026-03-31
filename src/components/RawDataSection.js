import React, { useEffect, useRef } from 'react';
import './RawDataSection.css';
import AnimatedIcon from './AnimatedIcon';

const RawDataSection = ({ rawData }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rawData]);

  return (
    <section className="raw-data-section">
      <div className="raw-data-card">
        <div className="card-header">
          <div className="card-title-wrapper">
            <AnimatedIcon type="sensor" className="title-icon" />
            <h2 className="card-title">Raw Data</h2>
          </div>
          {rawData.length > 0 && (
            <span className="card-count">
              {rawData.length} {rawData.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        <div className="raw-data-content" ref={scrollRef}>
          {rawData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📡</div>
              <h3 className="empty-state-title">No raw data received</h3>
              <p className="empty-state-description">
                Raw BLE data will appear here in the same format as received.
              </p>
            </div>
          ) : (
            <div className="raw-data-list">
              {rawData.map((entry, index) => (
                <div key={index} className="raw-data-entry">
                  <span className="raw-data-timestamp">[{entry.timestamp}]</span>
                  <span className="raw-data-message">{entry.data}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RawDataSection;
