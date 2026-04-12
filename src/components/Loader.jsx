import React from 'react';

export default function Loader({ size = 40 }) {
    return (
        <div style={{ width: size, height: size, animation: 'spin 1s linear infinite', display: 'inline-block' }}>
            <svg viewBox="0 0 40 40" width={size} height={size}>
                <polygon
                    points="20,4 36,34 4,34"
                    fill="none"
                    stroke="url(#triGrad)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(255,80,120,0.8))' }}
                />
                <defs>
                    <linearGradient id="triGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ff4488" />
                        <stop offset="100%" stopColor="#ff2244" />
                    </linearGradient>
                </defs>
            </svg>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );
}