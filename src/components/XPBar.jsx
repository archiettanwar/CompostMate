import React from 'react';

const XPBar = ({ currentXP = 0, nextLevelXP = 1000 }) => {
  const percentage = Math.min(Math.round((currentXP / nextLevelXP) * 100), 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Progress</span>
          <div className="text-sm font-black text-[#1A5C38] tracking-tighter uppercase">To Next Level</div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-gray-900 tracking-tighter">{percentage}%</span>
        </div>
      </div>
      
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-50 shadow-inner">
        {/* Progress Fill */}
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#1A5C38] to-[#2E8B57] transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
        
        {/* Glow Effect */}
        <div 
          className="absolute top-0 left-0 h-full w-20 bg-white/20 blur-md skew-x-[45deg] animate-[shimmer_2s_infinite]"
          style={{ transform: `translateX(${(percentage * 4) - 100}%)` }}
        />
      </div>

      <div className="flex justify-between mt-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {currentXP} <span className="text-gray-300">/ {nextLevelXP} XP</span>
        </p>
        <p className="text-[10px] font-bold text-[#1A5C38] uppercase tracking-widest italic">
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
