import React from 'react';

const BadgeCard = ({ badge, isUnlocked = false }) => {
  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
      isUnlocked 
        ? `${badge.color} border-transparent shadow-lg shadow-black/5` 
        : 'bg-gray-50 border-gray-100 grayscale opacity-60'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${
        isUnlocked ? 'bg-white' : 'bg-gray-200/50'
      }`}>
        {badge.icon}
      </div>
      <div>
        <p className={`text-xs font-black tracking-tight ${isUnlocked ? 'text-gray-900' : 'text-gray-400'}`}>
          {badge.name}
        </p>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">
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
