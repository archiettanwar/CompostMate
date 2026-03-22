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
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#1A5C38]/10 text-[#1A5C38] text-[10px] font-bold">?</span>
      {visible && (
        <div className="absolute z-50 left-6 top-0 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 text-[11px] text-gray-500 font-bold leading-relaxed animate-in fade-in zoom-in duration-200">
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
        navigate("/");
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
      navigate('/tracker'); // Redirect to tracker instead of profile to see the new batch
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
    <div className="min-h-screen bg-[#F9FBF9] pb-20">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-[32px] font-black text-[#1A5C38] tracking-tighter uppercase">Log Your Impact</h1>
          <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-[0.2em]">Snap a photo to verify your waste and earn rewards</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: AI & Upload */}
          <div className="space-y-8">
            <div className={`relative p-8 rounded-[40px] border-4 border-dashed transition-all duration-500 flex flex-col items-center justify-center min-h-[400px] overflow-hidden ${
              image ? 'border-transparent bg-white shadow-2xl' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-[#1A5C38]/30'
            }`}>
              {image ? (
                <>
                  <img src={image} alt="Waste Proof" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />
                  <div className="relative z-10 w-full h-full flex flex-col items-center">
                    <div className="w-48 h-48 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl mb-6 scale-in">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    
                    {analyzing ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-4 border-[#1A5C38]/20 border-t-[#1A5C38] rounded-full animate-spin"></div>
                        <p className="text-[#1A5C38] font-black text-xs uppercase tracking-widest">Analyzing Proof...</p>
                      </div>
                    ) : analysisResult ? (
                      <div className="text-center animate-in fade-in zoom-in duration-500">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest mb-4 ${
                          analysisResult.verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {analysisResult.verified ? '✅ Verified Compostable' : '❌ Not Compostable'}
                        </div>
                        <p className="text-gray-900 font-black text-xl tracking-tight mb-1">{analysisResult.description}</p>
                        <p className="text-[#1A5C38] font-bold text-xs uppercase tracking-widest">Est. {analysisResult.weightEstimate} KG • {analysisResult.category}</p>
                      </div>
                    ) : null}

                    <button 
                      onClick={() => {setImage(null); setAnalysisResult(null); setGreens(0); setBrowns(0);}}
                      className="mt-8 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
                    >
                      Remove Photo
                    </button>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center group">
                  <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">📸</div>
                  <span className="text-gray-900 font-black text-lg tracking-tight">Snap Bio-Waste</span>
                  <span className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Upload proof for 2x XP</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>

            {/* Smart Feedback */}
            <div className="bg-[#1A5C38] p-8 rounded-[40px] text-white shadow-2xl shadow-[#1A5C38]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <span className="text-8xl">🌱</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-60">C:N Science</p>
              <h3 className="text-2xl font-black tracking-tight mb-2">Ratio: {cnRatio !== null ? cnRatio.toFixed(1) : "N/A"}</h3>
              <p className="text-sm font-bold opacity-80 leading-relaxed mb-6">{feedback}</p>
              <div className="inline-flex px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">
                Status: {maturity}
              </div>
            </div>
          </div>

          {/* Right: Adjustments & Submit */}
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-black/5 flex flex-col h-full">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Verification & Weights</h2>
            
            <div className="space-y-10 flex-1">
              {/* Batch Name Input */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Custom Batch Name</p>
                <input 
                  type="text"
                  placeholder="e.g. Kitchen Scraps #1"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent focus:border-[#1A5C38] focus:bg-white rounded-2xl font-bold text-gray-900 outline-none transition-all"
                />
              </div>

              {/* Greens */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-900 font-black text-sm uppercase tracking-tight flex items-center gap-2">
                    🥦 Greens <Tooltip text="Nitrogen-rich scraps like fruit peels, veg waste, coffee grounds." />
                  </p>
                  <span className="text-[#1A5C38] font-black text-lg">{greens.toFixed(1)} kg</span>
                </div>
                <input
                  type="range" min="0" max="20" step="0.1"
                  value={greens}
                  onChange={(e) => setGreens(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-100"
                  style={{ accentColor: '#1A5C38' }}
                />
              </div>

              {/* Browns */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-900 font-black text-sm uppercase tracking-tight flex items-center gap-2">
                    🍂 Browns <Tooltip text="Carbon-rich scraps like dry leaves, twigs, cardboard." />
                  </p>
                  <span className="text-[#8B4513] font-black text-lg">{browns.toFixed(1)} kg</span>
                </div>
                <input
                  type="range" min="0" max="20" step="0.1"
                  value={browns}
                  onChange={(e) => setBrowns(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-100"
                  style={{ accentColor: '#8B4513' }}
                />
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Weight</p>
                  <p className="text-3xl font-black text-gray-900 tracking-tighter">{(greens + browns).toFixed(1)} KG</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">XP Reward</p>
                  <p className="text-3xl font-black text-[#1A5C38] tracking-tighter">+{Math.round((greens + browns) * 20)} ✨</p>
                </div>
              </div>

              <button 
                onClick={handleLogWaste}
                disabled={logging || (greens === 0 && browns === 0) || (image && analysisResult && !analysisResult.verified)}
                className={`w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 shadow-xl flex items-center justify-center gap-3 cursor-pointer ${
                  (greens === 0 && browns === 0) || logging || (image && analysisResult && !analysisResult.verified)
                    ? 'bg-gray-100 text-gray-400 shadow-none cursor-not-allowed'
                    : 'bg-[#1A5C38] text-white shadow-[#1A5C38]/20 hover:scale-[1.02] active:scale-[0.98]'
                }`}
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