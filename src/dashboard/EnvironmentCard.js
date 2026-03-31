import React from 'react';
import Gauge from './Gauge';
import './EnvironmentCard.css';

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export default function EnvironmentCard({ liveData }) {
  const temp = parseNum(liveData?.temp);
  const hum = parseNum(liveData?.humidity);
  const lux = parseNum(liveData?.ldr);

  return (
    <div className="dashboard-card" id="dash-environment">
      <div className="dashboard-card-title">Environmental Data</div>
      <div className="cargo-env-row">
        <Gauge
          label="Temperature"
          value={temp}
          unit="°C"
          min={-10}
          max={50}
          color="#38bdf8"
        />
        <Gauge
          label="Humidity"
          value={hum}
          unit="%"
          min={0}
          max={100}
          color="#a78bfa"
        />
        <Gauge label="LDR" value={lux} unit="%" min={0} max={100} color="#fbbf24" />
      </div>
    </div>
  );
}
