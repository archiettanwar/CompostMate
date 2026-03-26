import React from 'react';

const XPBar = ({ currentXP = 0, nextLevelXP = 1000 }) => {
  const percentage = Math.min(Math.round((currentXP / nextLevelXP) * 100), 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>Progress</span>
          <div className="text-sm font-bold tracking-tight uppercase" style={{ color: '#22c55e' }}>To Next Level</div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-white tracking-tight">{percentage}%</span>
        </div>
      </div>
      
      <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${percentage}%`, background: 'linear-gradient(to right, #16a34a, #22c55e)' }}
        />
        
        <div 
          className="absolute top-0 left-0 h-full w-20 bg-white/10 blur-md skew-x-[45deg] animate-[shimmer_2s_infinite]"
          style={{ transform: `translateX(${(percentage * 4) - 100}%)` }}
        />
      </div>

      <div className="flex justify-between mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
          {currentXP} <span style={{ color: '#4b5563' }}>/ {nextLevelXP} XP</span>
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest italic" style={{ color: '#22c55e' }}>
          Almost there! 🌱
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-45deg); }
          100% { transform: translateX(150%) skewX(-45deg); }
        }
      `}} />
    </div>
  );
};

export default XPBar;
