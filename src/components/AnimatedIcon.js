import React from 'react';
import './AnimatedIcon.css';

const AnimatedIcon = ({ type, className = '' }) => {
  const icons = {
    sensor: (
      <svg className={`animated-icon sensor-icon ${className}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="pulse-ring" />
        <circle cx="12" cy="12" r="6" fill="currentColor" className="pulse-dot" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
    drop: (
      <svg className={`animated-icon drop-icon ${className}`} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" fill="none" className="drop-path" />
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" fill="none" className="drop-path" />
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" fill="none" className="drop-path" />
      </svg>
    ),
    refresh: (
      <svg className={`animated-icon refresh-icon ${className}`} viewBox="0 0 24 24" fill="none">
        <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    alert: (
      <svg className={`animated-icon alert-icon ${className}`} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" fill="none" className="alert-shake" />
        <circle cx="12" cy="16" r="1" fill="currentColor" className="alert-blink" />
      </svg>
    ),
  };

  return icons[type] || null;
};

export default AnimatedIcon;
