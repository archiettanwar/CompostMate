import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { analyzeCompostImage } from "../lib/gemini";
import TopNav from "../components/TopNav";
import { calculateCNRatio, calculateMaturity, getCNFeedback } from "../lib/algorithms.js";
import { useNotification } from "../context/NotificationContext";
import { useBin } from "../hooks/useBin";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const Tooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block ml-2 cursor-pointer"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-white/40 text-[9px] font-bold border border-white/10">?</span>
      {visible && (
        <div className="absolute z-50 left-6 top-0 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-4 text-[11px] text-gray-400 font-medium leading-relaxed animate-in fade-in zoom-in duration-200">
          {text}
        </div>
      )}
    </span>
  );
};

const Logger = () => {
  const [user, setUser] = useState(null);
  const [greens, setGreens] = useState(0);
  const [browns, setBrowns] = useState(0);
  const [image, setImage] = useState(null);
  const [batchName, setBatchName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [logging, setLogging] = useState(false);
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const { logs: bins } = useBin();
  const activeBins = bins?.filter(b => b.status === "filling") || [];
  const [selectedBinId, setSelectedBinId] = useState("new");

  useEffect(() => {
    if (analysisResult?.description && !batchName) {
      setBatchName(analysisResult.description);
    }
  }, [analysisResult]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/auth");
        return;
      }
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      processImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const takePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web if someone clicks it, though the input handle handles it
      document.getElementById('file-input').click();
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt // This gives the "Take Photo" or "Choose from Photos" option!
      });

      if (image.base64String) {
        processImage(`data:image/${image.format};base64,${image.base64String}`);
      }
    } catch (error) {
      console.error('Camera error:', error);
      if (error.message !== 'User cancelled photos app') {
        showToast("Could not access camera/photos", "error");
      }
    }
  };

  const processImage = async (base64) => {
    setImage(base64);
    setAnalyzing(true);
    try {
      const result = await analyzeCompostImage(base64);
      setAnalysisResult(result);
      if (result.verified) {
        if (result.category === 'Green') setGreens(result.weightEstimate);
        else setBrowns(result.weightEstimate);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogWaste = async () => {
    if (greens === 0 && browns === 0) return;
    setLogging(true);
    try {
      const totalWeight = Number(greens) + Number(browns);
      const xpEarned = Math.round(totalWeight * 20); // 20 XP per KG
      
      let targetBinRef;

      // 1. Resolve Target Bin (Existing or New)
      if (selectedBinId === "new") {
        targetBinRef = await addDoc(collection(db, "users", user.uid, "bins"), {
          name: batchName || `Kitchen Bin #${Math.floor(Math.random() * 1000)}`,
          status: "filling",
          totalKg: 0,
          greens: 0,
          browns: 0,
          cnRatio: 0,
          timestamp: serverTimestamp(),
          curingStartedAt: null
        });
      } else {
        targetBinRef = doc(db, "users", user.uid, "bins", selectedBinId);
      }

      // 2. Log exactly what was thrown today inside the bin
      await addDoc(collection(db, "users", user.uid, "bins", targetBinRef.id, "logs"), {
        greens: Number(greens),
        browns: Number(browns),
        totalKg: totalWeight,
        timestamp: serverTimestamp(),
        verified: image && analysisResult ? analysisResult.verified : false
      });

      // 3. Update the aggregate totals on the Bin itself
      const currentBinSnap = await getDoc(targetBinRef);
      const cbData = currentBinSnap.data();
      const newBinGreens = (cbData.greens || 0) + Number(greens);
      const newBinBrowns = (cbData.browns || 0) + Number(browns);
      
      await updateDoc(targetBinRef, {
        totalKg: increment(totalWeight),
        greens: increment(Number(greens)),
        browns: increment(Number(browns)),
        cnRatio: calculateCNRatio(newBinGreens, newBinBrowns) || 0
      });

      // 4. Update global user stats
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        totalWasteKg: increment(totalWeight),
        xp: increment(xpEarned),
      });
      
      showToast(`Success! Logged ${totalWeight.toFixed(1)}kg and earned ${xpEarned} XP! ✨`);
      navigate('/tracker'); 
    } catch (err) {
      console.error("Logging failed:", err);
      showToast("Error logging waste. Please try again.", "error");
    } finally {
      setLogging(false);
    }
  };

  const cnRatio = calculateCNRatio(greens, browns);
  const maturity = calculateMaturity(cnRatio);
  const feedback = getCNFeedback(cnRatio);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopNav />
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Log Your Impact 🚀</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest leading-relaxed" style={{ color: '#6b7280' }}>
            Snap a photo to verify your waste and earn rewards
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: AI & Upload */}
          <div className="space-y-8">
            <div className={`relative p-8 rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center min-h-[400px] overflow-hidden ${
              image ? 'border-transparent' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#22c55e]/30'
            }`}
            style={image ? { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' } : {}}
            >
              {image ? (
                <>
                  <img src={image} alt="Waste Proof" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
                  <div className="relative z-10 w-full h-full flex flex-col items-center">
                    <div className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl mb-6 transform transition-transform hover:scale-105">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    
                    {analyzing ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-4 border-[#22c55e]/20 border-t-[#22c55e] rounded-full animate-spin"></div>
                        <p className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#22c55e' }}>Analyzing Proof...</p>
                      </div>
                    ) : analysisResult ? (
                      <div className="text-center animate-in fade-in zoom-in duration-500">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest mb-4 ${
                          analysisResult.verified ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}
                        style={{ border: analysisResult.verified ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)' }}
                        >
                          {analysisResult.verified ? '✅ Verified Compostable' : '❌ Not Compostable'}
                        </div>
                        <p className="text-white font-bold text-xl tracking-tight mb-1">{analysisResult.description}</p>
                        <p className="font-semibold text-xs uppercase tracking-widest" style={{ color: '#22c55e' }}>Est. {analysisResult.weightEstimate} KG • {analysisResult.category}</p>
                      </div>
                    ) : null}

                    <button 
                      onClick={() => {setImage(null); setAnalysisResult(null); setGreens(0); setBrowns(0);}}
                      className="mt-8 font-bold text-[10px] uppercase tracking-widest transition-colors cursor-pointer"
                      style={{ color: '#ef4444' }}
                    >
                      Remove Photo
                    </button>
                  </div>
                </>
              ) : (
                <div 
                  onClick={takePhoto}
                  className="cursor-pointer flex flex-col items-center group"
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 shadow-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform group-hover:bg-[#22c55e]/10 group-hover:border-[#22c55e]/30">📸</div>
                  <span className="text-white font-bold text-lg tracking-tight">Snap Bio-Waste</span>
                  <span className="font-semibold text-[10px] uppercase tracking-widest mt-1" style={{ color: '#6b7280' }}>Camera or Gallery</span>
                  <input type="file" id="file-input" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              )}
            </div>

            {/* Smart Feedback */}
            <div className="p-8 rounded-2xl text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <span className="text-7xl">🌱</span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#22c55e' }}>C:N Science</p>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Ratio: {cnRatio !== null ? cnRatio.toFixed(1) : "N/A"}</h3>
              <p className="text-sm font-medium leading-relaxed mb-6" style={{ color: '#9ca3af' }}>{feedback}</p>
              <div className="inline-flex px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Status: <span className="ml-1" style={{ color: '#22c55e' }}>{maturity}</span>
              </div>
            </div>
          </div>

          {/* Right: Adjustments & Submit */}
          <div className="p-10 rounded-2xl flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h2 className="text-xl font-bold tracking-tight mb-8 uppercase text-xs tracking-widest" style={{ color: '#6b7280' }}>Verification & Weights</h2>
            
            <div className="space-y-10 flex-1">
              {/* Bin Selection Input */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#4b5563' }}>Select Active Bin</p>
                <select 
                  value={selectedBinId}
                  onChange={(e) => {
                    setSelectedBinId(e.target.value);
                    if(e.target.value !== "new") setBatchName("");
                  }}
                  className="w-full px-6 py-4 rounded-xl font-bold text-white outline-none transition-all mb-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="new" style={{color: "black"}}>+ Create New Bin</option>
                  {activeBins.map(b => (
                    <option key={b.id} value={b.id} style={{color: "black"}}>{b.name} ({(b.totalKg || 0).toFixed(1)}kg)</option>
                  ))}
                </select>

                {selectedBinId === "new" && (
                  <input 
                    type="text"
                    placeholder="New Bin Name (e.g. Balcony Bin 1)"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full px-6 py-4 rounded-xl font-bold text-white outline-none transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                )}
              </div>

              {/* Greens */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    🥦 Greens <Tooltip text="Nitrogen-rich scraps like fruit peels, veg waste, coffee grounds." />
                  </p>
                  <span className="font-bold text-lg" style={{ color: '#22c55e' }}>{greens.toFixed(1)} kg</span>
                </div>
                <input
                  type="range" min="0" max="20" step="0.1"
                  value={greens}
                  onChange={(e) => setGreens(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', accentColor: '#22c55e' }}
                />
              </div>

              {/* Browns */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    🍂 Browns <Tooltip text="Carbon-rich scraps like dry leaves, twigs, cardboard." />
                  </p>
                  <span className="font-bold text-lg" style={{ color: '#f59e0b' }}>{browns.toFixed(1)} kg</span>
                </div>
                <input
                  type="range" min="0" max="20" step="0.1"
                  value={browns}
                  onChange={(e) => setBrowns(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', accentColor: '#f59e0b' }}
                />
              </div>
            </div>

            <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>Total Weight</p>
                  <p className="text-3xl font-bold tracking-tighter" style={{ color: 'var(--color-text-primary)' }}>{(greens + browns).toFixed(1)} KG</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>XP Reward</p>
                  <p className="text-3xl font-bold tracking-tighter" style={{ color: '#22c55e' }}>+{Math.round((greens + browns) * 20)} ✨</p>
                </div>
              </div>

              <button 
                onClick={handleLogWaste}
                disabled={logging || (greens === 0 && browns === 0) || (image && analysisResult && !analysisResult.verified)}
                className={`w-full py-5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer ${
                  (greens === 0 && browns === 0) || logging || (image && analysisResult && !analysisResult.verified)
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                }`}
                style={{ 
                  background: (greens === 0 && browns === 0) || logging || (image && analysisResult && !analysisResult.verified)
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(to bottom, #22c55e, #16a34a)',
                  color: 'white',
                  boxShadow: (greens === 0 && browns === 0) || logging || (image && analysisResult && !analysisResult.verified)
                    ? 'none'
                    : '0 8px 32px rgba(34,197,94,0.3)'
                }}
              >
                {logging ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Confirm & Log Impact <span className="text-xl">🚀</span></>
                )}
              </button>
            </div>
          </div>

          {/* New Right Column: Active Bin Summary & Tips */}
          <div className="space-y-8">
            <div className="p-10 rounded-2xl flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface-light)', border: '1px solid var(--color-border)' }}>
              <h2 className="text-xl font-bold text-white tracking-tight mb-8 uppercase text-xs tracking-widest" style={{ color: '#6b7280' }}>
                {selectedBinId === 'new' ? 'Pro Tips' : 'Bin Status Breakdown'}
              </h2>

              {selectedBinId === 'new' ? (
                <div className="flex-1 space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="p-6 rounded-2xl relative overflow-hidden" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                    <h3 className="text-[#22c55e] font-bold text-xs uppercase tracking-widest mb-3">🥦 Greens (Nitrogen)</h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">Vegetable peelings, fruit scraps, coffee grounds, and tea bags. Fast to break down and provides vital moisture.</p>
                  </div>
                  <div className="p-6 rounded-2xl relative overflow-hidden" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <h3 className="text-[#f59e0b] font-bold text-xs uppercase tracking-widest mb-3">🍂 Browns (Carbon)</h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">Dry leaves, twigs, plain cardboard, egg cartons, and newspaper. Adds structure and prevents odors.</p>
                  </div>
                  <div className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-3">⚖️ The Target Ratio</h3>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed">Aim for roughly 2 parts browns to 1 part greens by volume. Too wet? Add browns. Too dry? Add greens!</p>
                  </div>
                </div>
              ) : (() => {
                 const currentBin = activeBins.find(b => b.id === selectedBinId);
                 if (!currentBin) return null;
                 return (
                   <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                     <div className="text-center mb-10 p-8 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                        <span className="text-6xl block mb-4 filter drop-shadow-lg object-scale-down transform transition-transform hover:scale-110">🗑️</span>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{currentBin.name}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#f59e0b] animate-pulse">Currently Filling</p>
                     </div>

                     <div className="space-y-6 mb-8 flex-1">
                        <div className="flex justify-between items-center pb-5 border-b border-white/5">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Base Weight</span>
                          <span className="text-lg font-black text-white">{currentBin.totalKg.toFixed(1)} <span className="text-xs font-bold text-gray-500">kg</span></span>
                        </div>
                        <div className="flex justify-between items-center pb-5 border-b border-white/5">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Greens</span>
                          <span className="text-lg font-black text-[#22c55e]">{currentBin.greens?.toFixed(1) || 0} <span className="text-xs font-bold text-[#22c55e]/50">kg</span></span>
                        </div>
                        <div className="flex justify-between items-center pb-5 border-b border-white/5">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Browns</span>
                          <span className="text-lg font-black text-[#f59e0b]">{currentBin.browns?.toFixed(1) || 0} <span className="text-xs font-bold text-[#f59e0b]/50">kg</span></span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current C:N Ratio</span>
                          <span className="text-xl font-black text-white">{currentBin.cnRatio?.toFixed(1) || 0}</span>
                        </div>
                     </div>

                     <div className="p-6 rounded-2xl" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                        <p className="text-[11px] text-gray-400 leading-relaxed text-center font-bold">
                          Adding today's scraps will instantly merge into <span className="text-white">{currentBin.name}</span> and recalculate the ratio balance!
                        </p>
                     </div>
                   </div>
                 );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logger;