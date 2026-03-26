import React from 'react';

const BadgeCard = ({ badge, isUnlocked = false }) => {
  return (
    <div className={`p-4 rounded-xl transition-all duration-300 flex items-center gap-4 ${
      isUnlocked 
        ? 'opacity-100' 
        : 'grayscale opacity-40'
    }`}
    style={isUnlocked 
      ? { backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }
      : { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
    }>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}
        style={{ backgroundColor: isUnlocked ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}
      >
        {badge.icon}
      </div>
      <div>
        <p className={`text-xs font-bold tracking-tight ${isUnlocked ? 'text-white' : ''}`} style={!isUnlocked ? { color: '#6b7280' } : {}}>
          {badge.name}
        </p>
        <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight" style={{ color: '#6b7280' }}>
          {badge.description}
        </p>
      </div>
      
      {!isUnlocked && (
        <div className="ml-auto">
          <span className="text-xs">🔒</span>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;
