import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SensorGraph.css';

const SensorGraph = ({ data, title, dataKeys, colors, maxDataPoints = 50, yDomain = ['auto', 'auto'] }) => {
  const [chartData, setChartData] = useState([]);
  const dataIndexRef = useRef(0);
  const baselineRef = useRef(null);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

    // Check if we have any valid numeric values
    const hasValidData = dataKeys.some(key => {
      const value = data[key];
      return value !== null && value !== undefined && value !== 'None' && value !== '' && !isNaN(value);
    });

    if (!hasValidData) return;

    // Establish a baseline (first valid values) so we plot
    // differences relative to that baseline. This makes
    // 200000 vs 200010 show as a visible delta of ~10.
    if (!baselineRef.current) {
      baselineRef.current = {};
      dataKeys.forEach((key) => {
        const v = parseFloat(data[key]);
        baselineRef.current[key] = Number.isNaN(v) ? null : v;
      });
    }

    const newDataPoint = { index: dataIndexRef.current++ };
    dataKeys.forEach((key) => {
      const raw = parseFloat(data[key]);
      const base = baselineRef.current[key];
      if (!Number.isNaN(raw) && base != null) {
        newDataPoint[key] = raw - base;
      } else {
        newDataPoint[key] = null;
      }
    });

    setChartData(prev => {
      const updated = [...prev, newDataPoint];
      // Keep only last maxDataPoints
      return updated.slice(-maxDataPoints);
    });
  }, [data, dataKeys, maxDataPoints]);

  // Format tooltip values
  const formatTooltip = (value) => {
    if (value === null || value === undefined || value === 'None' || value === '') {
      return 'N/A';
    }
    return parseFloat(value).toFixed(2);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <div className="tooltip-label">Data Point #{payload[0].payload.index}</div>
          {payload.map((entry, index) => (
            <div key={index} className="tooltip-item" style={{ color: entry.color }}>
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-value">{formatTooltip(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="sensor-graph-container">
        <div className="graph-header">
          <h3 className="graph-title">{title}</h3>
        </div>
        <div className="graph-empty">
          <div className="empty-message">Waiting for data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sensor-graph-container">
      <div className="graph-header">
        <h3 className="graph-title">{title}</h3>
        <div className="graph-legend">
          {dataKeys.map((key, index) => (
            <div key={key} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: colors[index] || colors[0] }}
              ></div>
              <span className="legend-label">{key}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="graph-content">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis 
              dataKey="index" 
              stroke="#737373"
              tick={{ fill: '#a3a3a3', fontSize: 12 }}
              label={{ value: 'Time', position: 'insideBottom', offset: -5, fill: '#a3a3a3' }}
            />
            <YAxis 
              stroke="#737373"
              tick={{ fill: '#a3a3a3', fontSize: 12 }}
              domain={yDomain}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => <span style={{ color: '#a3a3a3' }}>{value}</span>}
            />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index] || colors[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: colors[index] || colors[0] }}
                animationDuration={300}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SensorGraph;
