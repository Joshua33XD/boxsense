import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './OrientationCard.css';
import CssBox from './CssBox';

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function CargoModel({ roll, pitch, yaw }) {
  const gltf = useLoader(GLTFLoader, '/models/cardboard-box.glb');
  const rotation = useMemo(
    () => [(pitch * Math.PI) / 180, (yaw * Math.PI) / 180, (roll * Math.PI) / 180],
    [pitch, yaw, roll],
  );

  return (
    <group rotation={rotation}>
      <primitive object={gltf.scene} scale={1.2} />
    </group>
  );
}

export default function OrientationCard({ liveData }) {
  const [autoYaw, setAutoYaw] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const roll = parseNum(liveData?.roll) ?? 0;
  const pitch = parseNum(liveData?.pitch) ?? 0;
  const yaw = parseNum(liveData?.yaw) ?? 0;

  useEffect(() => {
    const id = setInterval(() => {
      setAutoYaw((prev) => (prev + 0.6) % 360);
    }, 40);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/models/cardboard-box.glb', { cache: 'no-store' })
      .then((res) => {
        if (!alive) return;
        setModelReady(res.ok);
      })
      .catch(() => {
        if (!alive) return;
        setModelReady(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="dashboard-card cargo-orient-v2">
      <div className="cargo-orient-v2-title">3D Cargo Orientation Visualization</div>

      <div className="cargo-orient-v2-body">
        <div className="cargo-orient-v2-viz">
          <div className="cargo-orient-v2-hint">
            {modelReady ? 'Live model view' : 'Live 3D view (drop GLB to use exact model)'}
          </div>
          <div
            className="cargo-orient-v2-stage"
            style={{
              perspective: '1200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
            }}
          >
            {modelReady ? (
              <Canvas camera={{ position: [0, 1, 3.6], fov: 35 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[2, 4, 3]} intensity={1} />
                <directionalLight position={[-2, 2, -3]} intensity={0.35} />
                <CargoModel roll={roll} pitch={pitch} yaw={yaw + autoYaw} />
              </Canvas>
            ) : (
              <div
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${pitch}deg) rotateY(${yaw + autoYaw}deg) rotateZ(${roll}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
              >
                <CssBox />
              </div>
            )}
          </div>
        </div>

        <div className="cargo-orient-v2-readouts" aria-label="Orientation values">
          <div className="cargo-orient-readout">
            <span className="cargo-orient-readout-label">ROLL</span>
            <span className="cargo-orient-readout-val">{roll.toFixed(1)}</span>
          </div>
          <div className="cargo-orient-readout">
            <span className="cargo-orient-readout-label">PITCH</span>
            <span className="cargo-orient-readout-val">{pitch.toFixed(1)}</span>
          </div>
          <div className="cargo-orient-readout">
            <span className="cargo-orient-readout-label">YAW</span>
            <span className="cargo-orient-readout-val">{yaw.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
