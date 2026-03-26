import React, { useState } from 'react';
import Sidebar from "../components/Sidebar";
import { useBin } from "../hooks/useBin";
import MaturityCircle from "../components/MaturityCircle";
import { auth, db } from "../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNotification } from "../context/NotificationContext";

const Tracker = () => {
  const { logs, loading } = useBin();
  const { showModal, showToast } = useNotification();
  const [updating, setUpdating] = useState(null);

  const handleEditName = async (batchId, currentName) => {
    const newName = await showModal({
      title: "Rename Batch",
      message: "Enter a new descriptive name for this compost batch.",
      defaultValue: currentName,
      confirmLabel: "Update Name",
      cancelLabel: "Keep Original"
    });

    if (!newName || newName === currentName) return;

    setUpdating(batchId);
    try {
      const logRef = doc(db, "users", auth.currentUser.uid, "logs", batchId);
      await updateDoc(logRef, { name: newName });
      showToast("Batch renamed successfully!");
      // Simple reload to reflect changes for now
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("Failed to update name:", err);
      showToast("Error updating name.", "error");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Maturity Tracker</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Monitor your active compost batches and lifecycle</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="font-bold animate-pulse uppercase tracking-widest text-[#22c55e]">Scanning Bins...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 rounded-2xl border-2 border-dashed text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="text-6xl block mb-6 grayscale opacity-40">🗑️</span>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">No Active Bins</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {logs.map((batch) => (
              <div key={batch.id} className="p-8 rounded-2xl transition-all relative overflow-hidden group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Status Indicator */}
                <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-xl font-bold text-[9px] uppercase tracking-widest ${
                  batch.maturityProgress >= 100 ? 'text-[#22c55e]' : 'text-gray-400'
                }`}
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {batch.maturityProgress >= 100 ? '✨ READY' : '⏳ PROCESSING'}
                </div>

                <div className="flex items-start gap-8">
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
                      {new Date(batch.timestamp).toLocaleDateString()}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>Weight</span>
                        <span className="text-sm font-bold text-white">{batch.totalKg.toFixed(1)} KG</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>C:N Ratio</span>
                        <span className="text-sm font-bold" style={{ color: '#22c55e' }}>{batch.cnRatio?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                       <span className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest ${
                         batch.verified ? 'text-[#22c55e]' : 'text-gray-500'
                       }`}
                       style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                       >
                         {batch.verified ? 'Verified Photo' : 'Manual Entry'}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracker;
