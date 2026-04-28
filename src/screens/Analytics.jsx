import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import TopNav from "../components/TopNav";

const Analytics = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [societyRank, setSocietyRank] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        navigate("/auth");
        return;
      }
      setUser(firebaseUser);

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setUserData(uData);

          const logsQuery = query(
            collection(db, "users", firebaseUser.uid, "logs"),
            orderBy("timestamp", "desc")
          );
          const logsSnap = await getDocs(logsQuery);
          const logsData = logsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().timestamp?.toDate() || new Date()
          }));
          setLogs(logsData);

          const totalWaste = logsData.reduce((acc, log) => acc + (log.totalKg || 0), 0);
          const co2 = (totalWaste * 0.5).toFixed(1);
          
          const weeklyArray = Array(8).fill(0).map((_, i) => {
            const start = new Date();
            start.setDate(start.getDate() - (i * 7 + 7));
            const end = new Date();
            end.setDate(end.getDate() - (i * 7));
            const month = start.toLocaleDateString([], { month: 'short' });
            const weekNum = Math.ceil(start.getDate() / 7);
            const label = `${month} W${weekNum}`;
            const weight = logsData
              .filter(log => log.date >= start && log.date < end)
              .reduce((acc, log) => acc + (log.totalKg || 0), 0);
            return { label, value: weight };
          }).reverse();

          const now = new Date();
          const thisMonth = logsData
            .filter(log => log.date.getMonth() === now.getMonth() && log.date.getFullYear() === now.getFullYear())
            .reduce((acc, log) => acc + (log.totalKg || 0), 0);
          const lastMonthDate = new Date();
          lastMonthDate.setMonth(now.getMonth() - 1);
          const lastMonth = logsData
            .filter(log => log.date.getMonth() === lastMonthDate.getMonth() && log.date.getFullYear() === lastMonthDate.getFullYear())
            .reduce((acc, log) => acc + (log.totalKg || 0), 0);

          setStats({
            totalWasteKg: totalWaste,
            co2Offset: co2,
            totalLogs: logsData.length,
            treesEquivalent: (co2 / 21).toFixed(1),
            weeklyData: weeklyArray,
            cnHistory: logsData.slice(0, 10).map(log => ({ 
                date: log.date.toLocaleDateString([], { month: 'short', day: 'numeric' }), 
                ratio: log.cnRatio || 0 
            })).reverse(),
            thisMonthWaste: thisMonth,
            lastMonthWaste: lastMonth
          });

          if (uData.societyId) {
            const socQuery = query(
                collection(db, "users"), 
                where("societyId", "==", uData.societyId),
                orderBy("xp", "desc")
            );
            const socSnap = await getDocs(socQuery);
            const members = socSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const rank = members.findIndex(m => m.id === firebaseUser.uid) + 1;
            setSocietyRank({
                rank,
                totalMembers: members.length,
                topMembers: members.slice(0, 5),
                buildingAvg: members.reduce((acc, m) => acc + (m.totalWasteKg || 0), 0) / members.length
            });
          }
        }
      } catch (err) {
        console.error("Analytics Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Generating Insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopNav />
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-1">Impact Analytics</h1>
              <p className="font-semibold uppercase text-[10px] tracking-widest" style={{ color: '#6b7280' }}>Your detailed contribution ledger</p>
            </div>
            <div className="px-5 py-2.5 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#22c55e' }}>Real-time Data</span>
            </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-20 rounded-2xl border-2 border-dashed text-center animate-in zoom-in-95 duration-500" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
             <span className="text-6xl block mb-6">📊</span>
             <h2 className="text-xl font-bold text-white mb-2 uppercase">No Analytics Yet</h2>
             <p className="font-semibold uppercase text-[10px] tracking-widest mb-10" style={{ color: '#6b7280' }}>Start logging your waste to see your matrix come to life!</p>
             <button 
               onClick={() => navigate('/log')}
               className="px-10 py-5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
               style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
             >
               Start Logging Waste →
             </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    { label: "Waste Diverted", value: `${stats.totalWasteKg} KG`, icon: "⚖️" },
                    { label: "CO₂ Offset", value: `${stats.co2Offset} KG`, icon: "🌍" },
                    { label: "Total Batches", value: stats.totalLogs, icon: "📦" },
                    { label: "Persistence", value: `${userData?.streak || 0} Days`, icon: "🔥" }
                ].map((s, i) => (
                    <div key={i} className="p-6 rounded-xl transition-all group" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>{s.label}</span>
                            <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{s.icon}</span>
                        </div>
                        <p className="text-3xl font-bold text-white tracking-tight">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Waste Bar Chart */}
                <div className="p-8 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-10 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></span> Progress Trends
                    </h3>
                    <div className="flex items-end justify-between h-48 gap-3 pt-4 relative">
                        {/* Y-Axis Guideline */}
                        <div className="absolute left-0 top-4 bottom-0 w-px flex flex-col justify-between text-[6px] font-bold pr-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#4b5563' }}>
                            <span>MAX</span>
                            <span>MID</span>
                            <span>0</span>
                        </div>
                        <div className="w-4 shrink-0"></div> 
                        
                        {stats.weeklyData.map((w, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group relative">
                                <div 
                                    className="w-full rounded-t-lg group-hover:opacity-80 transition-all relative overflow-hidden flex items-end"
                                    style={{ 
                                        height: `${Math.max((w.value / (Math.max(...stats.weeklyData.map(d => d.value)) || 1)) * 100, 5)}%`,
                                        background: 'linear-gradient(to top, rgba(34,197,94,0.4), rgba(34,197,94,0.1))',
                                        border: '1px solid rgba(34,197,94,0.2)',
                                        borderBottom: 'none'
                                    }}
                                >
                                    <div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: '#22c55e', opacity: 0.5 }}></div>
                                </div>
                                <span className="text-[10px] font-bold uppercase mt-4 rotate-[-45deg] scale-75 origin-top-left" style={{ color: '#4b5563' }}>{w.label}</span>
                                
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#111] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap border border-white/10 shadow-2xl">
                                    {w.value.toFixed(1)} KG
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* C:N Ratio Line Chart (SVG) */}
                <div className="p-8 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}  >
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-10 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }}></span> C:N Ratio Stability
                    </h3>
                    <div className="h-48 relative pt-4">
                        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                            <rect x="0" y="10" width="100" height="10" fill="rgba(34,197,94,0.05)" />
                            <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" strokeDasharray="1,1" />
                            <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" strokeDasharray="1,1" />

                            <path
                                d={`M ${stats.cnHistory.map((h, i) => `${(i / (stats.cnHistory.length - 1)) * 100},${40 - (h.ratio / 60) * 40}`).join(' L ')}`}
                                fill="none"
                                stroke="#22c55e"
                                strokeWidth="0.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {stats.cnHistory.map((h, i) => (
                                <circle 
                                    key={i}
                                    cx={(i / (stats.cnHistory.length - 1)) * 100} 
                                    cy={40 - (h.ratio / 60) * 40} 
                                    r="1" 
                                    fill={h.ratio >= 25 && h.ratio <= 35 ? "#22c55e" : "#ef4444"}
                                />
                            ))}
                        </svg>
                        <div className="flex justify-between mt-6">
                            <span className="text-[8px] font-bold uppercase" style={{ color: '#4b5563' }}>Oldest</span>
                            <span className="text-[9px] font-bold text-[#22c55e] uppercase px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>Ideal Range (25-35)</span>
                            <span className="text-[8px] font-bold uppercase" style={{ color: '#4b5563' }}>Latest</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Impact Section */}
            <div className="p-10 rounded-2xl shadow-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-xl font-bold text-white tracking-tight uppercase mb-2">Impact Summary 🌍</h3>
                <p className="font-semibold text-[10px] uppercase tracking-widest mb-10" style={{ color: '#6b7280' }}>Translation of your composting efforts</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                   {[
                       { label: "Trees Saved", val: stats.treesEquivalent, sub: "Absorbed / Year", icon: "🌳" },
                       { label: "Landfill Diversion", val: stats.totalWasteKg, sub: "KG Preserved", icon: "♻️" },
                       { label: "Compost Est.", val: Math.round(stats.totalWasteKg * 3), sub: "Flowerpots eq.", icon: "🪴" }
                   ].map((item, i) => (
                       <div key={i} className="p-8 rounded-xl flex flex-col items-center text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <span className="text-4xl mb-4 grayscale group-hover:grayscale-0 transition-all">{item.icon}</span>
                           <p className="text-3xl font-bold text-white tracking-tighter mb-1">{item.val}</p>
                           <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>{item.label}</p>
                           <p className="text-[8px] font-bold uppercase mt-2" style={{ color: '#22c55e' }}>{item.sub}</p>
                       </div>
                   ))}
                </div>

                <div className="pt-10 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>Monthly Momentum</p>
                            <h4 className="text-xl font-bold text-white tracking-tight">Logged {stats.thisMonthWaste} KG this month</h4>
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl ${stats.thisMonthWaste >= stats.lastMonthWaste ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                            {stats.thisMonthWaste >= stats.lastMonthWaste ? '📈 Beating last month' : '📉 Catching up'}
                        </div>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <div 
                            className="transition-all duration-1000" 
                            style={{ 
                                width: `${Math.min((stats.thisMonthWaste / (stats.lastMonthWaste || 1)) * 100, 100)}%`,
                                background: 'linear-gradient(to right, #16a34a, #22c55e)'
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Society Rank (Conditional) */}
            {societyRank && (
                <div className="p-12 rounded-2xl relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-0 transition-all duration-700">
                        <span className="text-9xl">🏢</span>
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                        <div className="text-center md:text-left shrink-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#22c55e' }}>Building Rank</p>
                            <h2 className="text-7xl font-bold text-white tracking-tighter mb-2">#{societyRank.rank}</h2>
                            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Top {Math.round((societyRank.rank / societyRank.totalMembers) * 100)}% of Residents</p>
                        </div>
                        
                        <div className="flex-1 space-y-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest mb-6 text-white/60">Building Impact Leaders</h3>
                            
                            <div className="p-6 rounded-2xl border mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                                <p className="text-[9px] font-bold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>You vs Building Average</p>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[9px] font-bold uppercase mb-2 text-white">
                                            <span>Your Total</span>
                                            <span>{stats.totalWasteKg.toFixed(1)} KG</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                            <div 
                                                className="h-full transition-all duration-1000 shadow-[0_0_10px_#22c55e]" 
                                                style={{ 
                                                    width: `${Math.min((stats.totalWasteKg / (Math.max(stats.totalWasteKg, societyRank.buildingAvg) || 1)) * 100, 100)}%`,
                                                    backgroundColor: '#22c55e'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[9px] font-bold uppercase mb-2" style={{ color: '#4b5563' }}>
                                            <span>Building Avg</span>
                                            <span>{societyRank.buildingAvg.toFixed(1)} KG</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                            <div 
                                                className="h-full opacity-40 transition-all duration-1000" 
                                                style={{ 
                                                    width: `${Math.min((societyRank.buildingAvg / (Math.max(stats.totalWasteKg, societyRank.buildingAvg) || 1)) * 100, 100)}%`,
                                                    backgroundColor: '#9ca3af'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {societyRank.topMembers.map((m, i) => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{i+1}</span>
                                        <p className="font-bold text-sm text-white">{m.name}</p>
                                    </div>
                                    <p className="text-xs font-bold text-white">{m.totalWasteKg?.toFixed(1) || 0} KG</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
