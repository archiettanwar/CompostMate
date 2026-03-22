import React, { useState } from 'react';
import Sidebar from "../components/Sidebar";
import { useBin } from "../hooks/useBin";
import MaturityCircle from "../components/MaturityCircle";
import { auth, db } from "../lib/firebase";
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
    <div className="min-h-screen bg-[#F9FBF9] pb-20">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-[32px] font-black text-[#1A5C38] tracking-tighter uppercase">Maturity Tracker</h1>
          <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-[0.2em]">Monitor your active compost batches and lifecycle</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[#1A5C38] font-bold animate-pulse uppercase tracking-widest">Scanning Bins...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center">
            <span className="text-6xl block mb-6">🗑️</span>
            <h2 className="text-2xl font-black text-gray-900 mb-2">No Active Bins</h2>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-8">Start your composting journey today!</p>
            <button 
              onClick={() => window.location.href = '/log'}
              className="px-8 py-4 bg-[#1A5C38] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-green-500/10"
            >
              Log First Batch 🚀
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {logs.map((batch) => (
              <div key={batch.id} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-xl shadow-black/5 hover:translate-y-[-4px] transition-all relative overflow-hidden group">
                {/* Status Indicator */}
                <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest ${
                  batch.maturityProgress >= 100 ? 'bg-green-100 text-green-700' : 'bg-[#1A5C38]/10 text-[#1A5C38]'
                }`}>
                  {batch.maturityProgress >= 100 ? '✨ Ready to Use' : '⏳ Processing'}
                </div>

                <div className="flex items-start gap-8">
                  <MaturityCircle progress={batch.maturityProgress} />
                  
                  <div className="flex-1 pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">{batch.name}</h3>
                      <button 
                        onClick={() => handleEditName(batch.id, batch.name)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all group/edit"
                        title="Edit Name"
                      >
                        <span className="text-xs grayscale group-hover/edit:grayscale-0 transition-all opacity-40 group-hover/edit:opacity-100">✏️</span>
                      </button>
                    </div>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-4">
                      Logged {new Date(batch.timestamp).toLocaleDateString()}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weight</span>
                        <span className="text-sm font-black text-gray-900">{batch.totalKg.toFixed(1)} KG</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">C:N Ratio</span>
                        <span className="text-sm font-black text-[#1A5C38]">{batch.cnRatio?.toFixed(1) || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                         batch.verified ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                       }`}>
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
