import React, { useEffect, useRef } from 'react';
import './DataVisualization.css';

const DataVisualization = ({ value, max = 100, color = '#66d9f9' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 60;
    canvas.width = size;
    canvas.height = size;

    let progress = 0;
    const targetProgress = (parseFloat(value) || 0) / max;

    const animate = () => {
      if (progress < targetProgress) {
        progress += 0.02;
        if (progress > targetProgress) progress = targetProgress;
      } else if (progress > targetProgress) {
        progress -= 0.02;
        if (progress < targetProgress) progress = targetProgress;
      }

      ctx.clearRect(0, 0, size, size);

      // Draw circle
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 5;

      // Background circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Progress circle
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2
      );
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (progress < targetProgress || progress > targetProgress) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, max, color]);

  return (
    <div className="data-visualization">
      <canvas ref={canvasRef} className="visualization-canvas" />
      <div className="visualization-value" style={{ color }}>
        {value || '--'}
      </div>
    </div>
  );
};

export default DataVisualization;
