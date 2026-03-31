import React from 'react';
import './DropItem.css';

const DropItem = ({ drop, index }) => {
  const getIntensityClass = (intensity) => {
    const int = intensity?.toLowerCase();
    if (int === 'low') return 'intensity-low';
    if (int === 'medium') return 'intensity-medium';
    if (int === 'high') return 'intensity-high';
    return 'intensity-medium';
  };

  const formatValue = (value) => {
    if (!value || value === 'None' || value === '') return '—';
    return value;
  };

  const formatTime = (value) => {
    if (!value || value === 'None' || value === '') return '—';
    const str = String(value);
    if (str.length > 20) return str.slice(0, 19);
    return str;
  };

  return (
    <tr className="drop-row">
      <td className="drop-cell drop-cell-time" title={formatValue(drop.pc_time)}>
        {formatTime(drop.device_time || drop.pc_time)}
      </td>
      <td className="drop-cell drop-cell-intensity">
        <span className={`intensity-pill ${getIntensityClass(drop.intensity)}`}>
          {formatValue(drop.intensity)}
        </span>
      </td>
      <td className="drop-cell drop-cell-num">
        <span className="drop-num">{formatValue(drop.peak_g)}</span>
        <span className="drop-unit">g</span>
      </td>
      <td className="drop-cell drop-cell-num">
        <span className="drop-num">{formatValue(drop.height)}</span>
        <span className="drop-unit">m</span>
      </td>
      <td className="drop-cell drop-cell-num">
        <span className="drop-num">{formatValue(drop.ldr)}</span>
        <span className="drop-unit">%</span>
      </td>
      <td className="drop-cell drop-cell-num drop-cell-peak">
        <span className="drop-num peak">{formatValue(drop.peak_ldr || drop.ldr)}</span>
        <span className="drop-unit">%</span>
      </td>
      <td className="drop-cell drop-cell-num">
        <span className="drop-num">{formatValue(drop.flex)}</span>
        <span className="drop-unit">%</span>
      </td>
      <td className="drop-cell drop-cell-num drop-cell-peak">
        <span className="drop-num peak">{formatValue(drop.peak_flex || drop.flex)}</span>
        <span className="drop-unit">%</span>
      </td>
    </tr>
  );
};

export default DropItem;
