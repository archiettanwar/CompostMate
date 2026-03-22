import React, { useState } from 'react';
import Sidebar from "../components/Sidebar";
import { calculateCNRatio, calculateMaturity, getCNFeedback } from "../lib/algorithms.js";

const Tooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block ml-2 cursor-pointer"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-300 text-gray-700 text-xs font-bold">?</span>
      {visible && (
        <div className="absolute z-10 left-6 top-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-600 font-normal">
          {text}
        </div>
      )}
    </span>
  );
};

const Logger = () => {
  const [greens, setGreens] = useState(0);
  const [browns, setBrowns] = useState(0);

  const handleGreensInput = (val) => {
    const num = Math.min(20, Math.max(0, Number(val)));
    setGreens(isNaN(num) ? 0 : num);
  };

  const handleBrownsInput = (val) => {
    const num = Math.min(20, Math.max(0, Number(val)));
    setBrowns(isNaN(num) ? 0 : num);
  };

  const cnRatio = calculateCNRatio(greens, browns);
  const maturity = calculateMaturity(cnRatio);
  const feedback = getCNFeedback(cnRatio);

  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen">
        <h1 className="text-[32px] font-black text-[#1A5C38] tracking-tighter">Log Waste</h1>
        <p className="text-gray-400 font-bold mt-4">Add your greens and browns to calculate your C:N ratio</p>

        <div className="mt-8 space-y-10">

          {/* Greens Input */}
          <div>
            <div className="flex items-center mb-2">
              <p className="text-[#2D2D2D] font-semibold text-lg">🥦 Greens</p>
              <Tooltip text="Greens are nitrogen-rich materials like food scraps, vegetable peels, fruit waste, grass clippings, and coffee grounds. These add moisture and nutrients to your compost pile." />
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range" min="0" max="20" step="0.5"
                value={greens}
                onChange={(e) => handleGreensInput(e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#2E8B57' }}
              />
              <input
                type="number" min="0" max="20" step="0.5"
                value={greens}
                onChange={(e) => handleGreensInput(e.target.value)}
                className="w-20 border-2 border-[#2E8B57] rounded-lg p-2 text-center text-[#2D2D2D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#2E8B57]"
              />
              <span className="text-gray-500 font-medium">kg</span>
            </div>
          </div>

          {/* Browns Input */}
          <div>
            <div className="flex items-center mb-2">
              <p className="text-[#2D2D2D] font-semibold text-lg">🍂 Browns</p>
              <Tooltip text="Browns are carbon-rich materials like dry leaves, cardboard, newspaper, straw, and wood chips. These add structure and airflow to your compost pile." />
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range" min="0" max="20" step="0.5"
                value={browns}
                onChange={(e) => handleBrownsInput(e.target.value)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: '#8B4513' }}
              />
              <input
                type="number" min="0" max="20" step="0.5"
                value={browns}
                onChange={(e) => handleBrownsInput(e.target.value)}
                className="w-20 border-2 border-[#8B4513] rounded-lg p-2 text-center text-[#2D2D2D] font-semibold focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
              />
              <span className="text-gray-500 font-medium">kg</span>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-2xl shadow p-6 space-y-2">
            <p className="text-[#2D2D2D] font-bold text-lg">C:N Ratio: <span className="text-[#1A5C38]">{cnRatio ?? "N/A"}</span></p>
            <p className="text-[#2D2D2D] font-bold">Maturity: <span className="text-[#1A5C38]">{maturity}</span></p>
            <p className="text-[#1A5C38] font-bold mt-2">{feedback}</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Logger;