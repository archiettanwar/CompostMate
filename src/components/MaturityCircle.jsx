import React from 'react';

const MaturityCircle = ({ progress, size = 120, strokeWidth = 10 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progress >= 100 ? "var(--color-success)" : "var(--color-primary)"}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: progress >= 100 ? 'drop-shadow(0 0 8px rgba(34,197,94,0.4))' : 'none' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>{progress}%</span>
        <span className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--color-text-muted)' }}>Mature</span>
      </div>
    </div>
  );
};

export default MaturityCircle;
