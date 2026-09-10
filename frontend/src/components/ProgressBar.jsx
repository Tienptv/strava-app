import React from 'react';

export default function ProgressBar({ current, target, isCompleted, percent }) {
  const displayPercent = percent === 0 ? 0 : Math.max(percent, 2);
  const isHighPercent = percent > 50;

  return (
    <div 
      className="table-progress-container" 
      title={`${current.toFixed(1)} / ${target} km (${percent}%)`}
    >
      <div className="table-progress-bg">
        <div 
          className={`table-progress-fill ${isCompleted ? 'completed' : ''}`}
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      <span className={`table-progress-label ${isCompleted ? 'completed-label' : ''} ${isHighPercent ? 'text-white' : ''}`}>
        {percent}% {isCompleted ? '🎯' : ''}
      </span>
    </div>
  );
}
