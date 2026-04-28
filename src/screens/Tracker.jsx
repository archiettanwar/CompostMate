import React, { useState } from 'react';
import TopNav from "../components/TopNav";
import { useBin } from "../hooks/useBin";
import MaturityCircle from "../components/MaturityCircle";
import { auth, db } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNotification } from "../context/NotificationContext";

const Tracker = () => {
  const { logs: bins, loading } = useBin();
  const { showModal, showToast } = useNotification();
  const [updating, setUpdating] = useState(null);

  const activeBins = bins.filter(b => b.status === "filling");
  const processingBins = bins.filter(b => b.status !== "filling");

  const handleEditName = async (batchId, currentName) => {
    const newName = await showModal({
      title: "Rename Bin",
      message: "Enter a new descriptive name for this compost bin.",
      defaultValue: currentName,
      confirmLabel: "Update Name",
      cancelLabel: "Keep Original"
    });

    if (!newName || newName === currentName) return;

    setUpdating(batchId);
    try {
      const binRef = doc(db, "users", auth.currentUser.uid, "bins", batchId);
      await updateDoc(binRef, { name: newName });
      showToast("Bin renamed successfully!");
    } catch (err) {
      console.error("Failed to update name:", err);
      showToast("Error updating name.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkFull = async (binId) => {
    const confirmed = window.confirm("Are you sure? This will stop you from adding more everyday scraps to this bin and will start the 30-day curing timer.");
    if (!confirmed) return;
    
    try {
      const binRef = doc(db, "users", auth.currentUser.uid, "bins", binId);
      await updateDoc(binRef, {
        status: "curing",
        curingStartedAt: serverTimestamp()
      });
      showToast("Bin is full! The 30-day maturity curing phase has started.");
    } catch (err) {
      console.error(err);
      showToast("Error updating bin status.", "error");
    }
  };

  const renderBinCard = (batch, isActive) => (
    <div key={batch.id} className="p-8 rounded-2xl transition-all relative overflow-hidden group flex flex-col h-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Status Indicator */}
      <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-xl font-bold text-[9px] uppercase tracking-widest ${
        isActive ? 'text-[#f59e0b]' : batch.isMatured ? 'text-[#22c55e]' : 'text-gray-400'
      }`}
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        {isActive ? '🛠️ FILLING' : batch.isMatured ? '✨ MATURED' : '⏳ CURING'}
      </div>

      <div className="flex items-start gap-8 flex-1">
        <MaturityCircle progress={batch.maturityProgress} />
        
        <div className="flex-1 pt-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-white tracking-tight">{batch.name}</h3>
            <button 
              onClick={() => handleEditName(batch.id, batch.name)}
              className="p-2 hover:bg-white/5 rounded-lg transition-all group/edit"
              title="Edit Name"
            >
              <span className="text-xs grayscale group-hover/edit:grayscale-0 transition-all opacity-20 group-hover/edit:opacity-100">✏️</span>
            </button>
          </div>
          <p className="font-bold text-[10px] uppercase tracking-widest mb-5" style={{ color: '#4b5563' }}>
            Started: {new Date(batch.timestamp).toLocaleDateString()}
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>Total Weight</span>
              <span className="text-sm font-bold text-white">{(batch.totalKg || 0).toFixed(1)} KG</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>C:N Ratio</span>
              <span className="text-sm font-bold" style={{ color: '#22c55e' }}>{batch.cnRatio?.toFixed(1) || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {isActive && (
        <button 
           onClick={() => handleMarkFull(batch.id)}
           className="mt-6 w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
           style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          Mark Full & Start Curing Phase
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0a0a0a' }}>
      <TopNav />
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Maturity Tracker</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Manage your bins and lifecycle</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="font-bold animate-pulse uppercase tracking-widest text-[#22c55e]">Scanning Bins...</div>
          </div>
        ) : bins.length === 0 ? (
          <div className="p-20 rounded-2xl border-2 border-dashed text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="text-6xl block mb-6 grayscale opacity-40">🗑️</span>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">No Bins Found</h2>
            <p className="font-semibold uppercase text-[10px] tracking-widest mb-10" style={{ color: '#6b7280' }}>Start your composting journey today!</p>
            <button 
              onClick={() => window.location.href = '/log'}
              className="px-10 py-5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
            >
              Log First Batch 🚀
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Active Bins Section */}
            {activeBins.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse"></span>
                  Active Bins (Filling)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {activeBins.map((bin) => renderBinCard(bin, true))}
                </div>
              </div>
            )}

            {/* Processing Bins Section */}
            {processingBins.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
                  Curing & Matured Bins
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {processingBins.map((bin) => renderBinCard(bin, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracker;
