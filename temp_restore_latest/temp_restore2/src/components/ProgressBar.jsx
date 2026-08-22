import React from 'react';

export default function ProgressBar({ current, target, isCompleted, percent }) {
  const displayPercent = Math.max(percent, 2); // Minimum 2% to show a sliver of color

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
      <span className={`table-progress-label ${isCompleted ? 'completed-label' : ''}`}>
        {percent}% {isCompleted ? '🎯' : ''}
      </span>
    </div>
  );
}
