import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { analyzeCompostImage } from "../lib/gemini";
import Sidebar from "../components/Sidebar";
import { calculateCNRatio, calculateMaturity, getCNFeedback } from "../lib/algorithms.js";
import { useNotification } from "../context/NotificationContext";

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
      const base64 = reader.result;
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
    reader.readAsDataURL(file);
  };

  const handleLogWaste = async () => {
    if (greens === 0 && browns === 0) return;
    setLogging(true);
    try {
      const totalWeight = Number(greens) + Number(browns);
      const xpEarned = Math.round(totalWeight * 20); // 20 XP per KG
      
      const userRef = doc(db, "users", user.uid);
      
      // 1. Create a NEW batch log entry
      const logRef = collection(db, "users", user.uid, "logs");
      await addDoc(logRef, {
        greens: Number(greens),
        browns: Number(browns),
        totalKg: totalWeight,
        cnRatio: cnRatio,
        timestamp: serverTimestamp(),
        verified: image && analysisResult ? analysisResult.verified : false,
        name: batchName || `Batch #${Math.floor(Math.random() * 1000)}`
      });

      // 2. Update global stats
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
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white tracking-tight">Log Your Impact 🚀</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest leading-relaxed" style={{ color: '#6b7280' }}>
            Snap a photo to verify your waste and earn rewards
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: AI & Upload */}
          <div className="space-y-8">
            <div className={`relative p-8 rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center min-h-[400px] overflow-hidden ${
              image ? 'border-transparent' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#22c55e]/30'
            }`}
            style={image ? { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
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
                <label className="cursor-pointer flex flex-col items-center group">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 shadow-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform group-hover:bg-[#22c55e]/10 group-hover:border-[#22c55e]/30">📸</div>
                  <span className="text-white font-bold text-lg tracking-tight">Snap Bio-Waste</span>
                  <span className="font-semibold text-[10px] uppercase tracking-widest mt-1" style={{ color: '#6b7280' }}>Upload proof for 2x XP</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
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
          <div className="p-10 rounded-2xl flex flex-col h-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-xl font-bold text-white tracking-tight mb-8 uppercase text-xs tracking-widest" style={{ color: '#6b7280' }}>Verification & Weights</h2>
            
            <div className="space-y-10 flex-1">
              {/* Batch Name Input */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#4b5563' }}>Custom Batch Name</p>
                <input 
                  type="text"
                  placeholder="e.g. Kitchen Scraps #1"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-6 py-4 rounded-xl font-bold text-white outline-none transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
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
                  <p className="text-3xl font-bold text-white tracking-tighter">{(greens + browns).toFixed(1)} KG</p>
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
        </div>
      </div>
    </div>
  );
};

export default Logger;