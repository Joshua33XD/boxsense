import React, { useMemo } from 'react';
import { IconGear, IconIsoPackage } from './icons';
import './SafetyCard.css';

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export default function SafetyCard({ liveData, peakEvents, espConnected }) {
  const liveHeight = parseNum(liveData?.height ?? liveData?.Height);
  const peakHeight = useMemo(() => {
    const heightEvents = (peakEvents || []).filter((e) => e?.parameter === 'Height');
    if (heightEvents.length === 0) return null;
    return heightEvents.reduce((max, e) => {
      const v = Number(e?.value);
      if (Number.isNaN(v)) return max;
      return max == null || v > max ? v : max;
    }, null);
  }, [peakEvents]);
  const height = liveHeight ?? peakHeight;

  const impactCount = useMemo(
    () => peakEvents.filter((e) => e?.parameter === 'G-Force').length,
    [peakEvents],
  );

  let badgeText = 'SAFE';
  let statusClass = 'cargo-safety-badge--secure';
  let msgClass = 'cargo-safety-msg--secure';
  let detailMsg =
    'Kindly collect the parcel. You can trust BoxSense - it protects trust even before the seal is broken.';

  if (!espConnected) {
    badgeText = 'STANDBY';
    statusClass = 'cargo-safety-badge--standby';
    msgClass = 'cargo-safety-msg--standby';
    detailMsg = 'Waiting for ESP32 connection.';
  } else if (height != null && height > 0.8) {
    badgeText = 'CAUTION';
    statusClass = 'cargo-safety-badge--caution';
    msgClass = 'cargo-safety-msg--caution';
    detailMsg = 'Kindly reject the parcel. There is an high risk of damage.';
  }

  return (
    <div className={`dashboard-card cargo-safety-v2`} id="dash-safety">
      <div className="cargo-safety-v2-label">Safety status:</div>

      <div key={badgeText} className={`cargo-safety-badge ${statusClass}`}>
        {badgeText}
      </div>

      <div className="cargo-safety-v2-detail">
        <div className="cargo-safety-v2-detail-left">
          <span className="cargo-safety-icon-shell cargo-safety-icon-shell--gear" aria-hidden>
            <IconGear className="cargo-safety-gear" />
          </span>
          <span className={`cargo-safety-msg ${msgClass}`}>{detailMsg}</span>
        </div>
        <span className="cargo-safety-icon-shell cargo-safety-icon-shell--package" aria-hidden>
          <IconIsoPackage className="cargo-safety-package" />
        </span>
      </div>

      <div className="cargo-safety-v2-meta" aria-live="polite">
        <span>G-force events logged: {impactCount}</span>
      </div>
    </div>
  );
}
