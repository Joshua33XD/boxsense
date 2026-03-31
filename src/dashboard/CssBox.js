import React from 'react';
import './CssBox.css';

export default function CssBox() {
  return (
    <div className="box">
      <div className="box-face box-face-front">
        <div className="box-tape box-tape-v" />
        <div className="box-label">
          <div className="box-barcode" />
          <div className="box-label-line" />
          <div className="box-label-line short" />
        </div>
      </div>
      <div className="box-face box-face-back">
        <div className="box-tape box-tape-v" />
      </div>
      <div className="box-face box-face-right">
        <div className="box-fragile">
          <div className="box-fragile-arrows">
            <span>↑</span><span>↑</span>
          </div>
          <div className="box-fragile-text">FRAGILE</div>
        </div>
      </div>
      <div className="box-face box-face-left">
        <div className="box-fragile">
          <div className="box-fragile-arrows">
            <span>↑</span><span>↑</span>
          </div>
          <div className="box-fragile-text">FRAGILE</div>
        </div>
      </div>
      <div className="box-face box-face-top">
        <div className="box-flap-line" />
        <div className="box-flap-line-h" />
        <div className="box-tape box-tape-v" />
      </div>
      <div className="box-face box-face-bottom">
        <div className="box-flap-line" />
        <div className="box-flap-line-h" />
        <div className="box-tape box-tape-v" />
      </div>
      {/* A fake shadow plane that rotates with the box to give a projection effect */}
      <div className="box-shadow-plane" />
    </div>
  );
}