import React from 'react';
import Sidebar from "../components/Sidebar";

const Leaderboard = () => {
  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen">
        <h1 className="text-[32px] font-black text-[#1A5C38] tracking-tighter">Leaderboard</h1>
        <p className="text-gray-400 font-bold mt-4">Coming soon — this feature is being built 🌱</p>
      </div>
    </div>
  );
};

export default Leaderboard;
