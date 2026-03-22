import React, { useState } from 'react';
import Sidebar from "../components/Sidebar";
import { calculateCNRatio, calculateMaturity, getCNFeedback } from "../lib/algorithms.js";

const Logger = () => {
  const [greens, setGreens] = useState(0);
  const [browns, setBrowns] = useState(0);

  const cnRatio = calculateCNRatio(greens, browns);
  const maturity = calculateMaturity(cnRatio);
  const feedback = getCNFeedback(cnRatio);

  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen">
        <h1 className="text-[32px] font-black text-[#1A5C38] tracking-tighter">Log Waste</h1>

        <p className="text-gray-400 font-bold mt-4">Add your greens and browns to calculate your C:N ratio</p>

        <div className="mt-8">
          <p className="text-[#2D2D2D] font-semibold">🥦 Greens (food scraps, grass): {greens} kg</p>
          <input
            type="range" min="0" max="20" step="0.5"
            value={greens}
            onChange={(e) => setGreens(Number(e.target.value))}
            className="w-full mt-2"
          />

          <p className="text-[#2D2D2D] font-semibold mt-6">🍂 Browns (cardboard, dry leaves): {browns} kg</p>
          <input
            type="range" min="0" max="20" step="0.5"
            value={browns}
            onChange={(e) => setBrowns(Number(e.target.value))}
            className="w-full mt-2"
          />

          <div className="mt-8">
            <p className="text-[#2D2D2D] font-bold">C:N Ratio: {cnRatio ?? "N/A"}</p>
            <p className="text-[#2D2D2D] font-bold">Maturity: {maturity}</p>
            <p className="text-[#1A5C38] font-bold mt-2">{feedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logger;