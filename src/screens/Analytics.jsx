import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import Sidebar from "../components/Sidebar";

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
        navigate("/");
        return;
      }
      setUser(firebaseUser);

      try {
        // 1. Fetch User Data
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setUserData(uData);

          // 2. Fetch Logs
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

          // 3. Perform Calculations
          const totalWaste = logsData.reduce((acc, log) => acc + (log.totalKg || 0), 0);
          const co2 = (totalWaste * 0.5).toFixed(1);
          
          // Weekly Data (last 8 weeks)
          const weeklyArray = Array(8).fill(0).map((_, i) => {
            const start = new Date();
            start.setDate(start.getDate() - (i * 7 + 7));
            const end = new Date();
            end.setDate(end.getDate() - (i * 7));
            
            // Format label as "Jan W1"
            const month = start.toLocaleDateString([], { month: 'short' });
            const weekNum = Math.ceil(start.getDate() / 7);
            const label = `${month} W${weekNum}`;

            const weight = logsData
              .filter(log => log.date >= start && log.date < end)
              .reduce((acc, log) => acc + (log.totalKg || 0), 0);
            return { label, value: weight };
          }).reverse();

          // Monthly Comparison
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

          // 4. Fetch Society Rank
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-black animate-pulse text-xl uppercase tracking-widest">Generating Insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-1">Impact Analytics</h1>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">Your detailed environmental contribution ledger</p>
            </div>
            <div className="px-6 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Real-time Data Active</span>
            </div>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center animate-in zoom-in-95 duration-500">
             <span className="text-6xl block mb-6">📊</span>
             <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">No Analytics Yet</h2>
             <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-10">Start logging your waste to see your composting matrix come to life!</p>
             <button 
               onClick={() => navigate('/log')}
               className="px-10 py-5 bg-[#1A5C38] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-green-900/10 cursor-pointer"
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
                    <div key={i} className="bg-white p-8 rounded-3xl border border-gray-50 shadow-xl shadow-black/5 hover:translate-y-[-4px] transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
                            <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{s.icon}</span>
                        </div>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Waste Bar Chart */}
                <div className="bg-white p-10 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#1A5C38] rounded-full"></span> Monthly Waste Trends
                    </h3>
                    <div className="flex items-end justify-between h-48 gap-3 pt-4 relative">
                        {/* Y-Axis Guideline */}
                        <div className="absolute left-0 top-4 bottom-0 w-px bg-gray-100 flex flex-col justify-between text-[6px] font-black text-gray-300 pr-2">
                            <span>MAX</span>
                            <span>MID</span>
                            <span>0</span>
                        </div>
                        <div className="w-4 shrink-0"></div> {/* Spacer for Y-axis */}
                        
                        {stats.weeklyData.map((w, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center group relative">
                                <div 
                                    className="w-full bg-[#1A5C38]/10 rounded-t-xl group-hover:bg-[#1A5C38]/30 transition-all relative overflow-hidden flex items-end"
                                    style={{ height: `${Math.max((w.value / (Math.max(...stats.weeklyData.map(d => d.value)) || 1)) * 100, 5)}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A5C38]/20 to-transparent"></div>
                                </div>
                                <span className="text-[8px] font-black text-gray-300 uppercase mt-4 rotate-[-45deg]">{w.label}</span>
                                
                                {/* Tooltip */}
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                                    {w.value.toFixed(1)} KG
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* C:N Ratio Line Chart (SVG) */}
                <div className="bg-white p-10 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span> C:N Ratio Stability
                    </h3>
                    <div className="h-48 relative pt-4">
                        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                            {/* Guideline Range */}
                            <rect x="0" y="10" width="100" height="10" fill="#1A5C38" fillOpacity="0.03" />
                            <line x1="0" y1="10" x2="100" y2="10" stroke="#1A5C38" strokeWidth="0.2" strokeDasharray="1,1" />
                            <line x1="0" y1="20" x2="100" y2="20" stroke="#1A5C38" strokeWidth="0.2" strokeDasharray="1,1" />

                            {/* Line Chart */}
                            <path
                                d={`M ${stats.cnHistory.map((h, i) => `${(i / (stats.cnHistory.length - 1)) * 100},${40 - (h.ratio / 60) * 40}`).join(' L ')}`}
                                fill="none"
                                stroke="#1A5C38"
                                strokeWidth="0.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Points */}
                            {stats.cnHistory.map((h, i) => (
                                <circle 
                                    key={i}
                                    cx={(i / (stats.cnHistory.length - 1)) * 100} 
                                    cy={40 - (h.ratio / 60) * 40} 
                                    r="1.2" 
                                    fill={h.ratio >= 25 && h.ratio <= 35 ? "#1A5C38" : "#EF4444"}
                                    className="hover:r-2 transition-all cursor-crosshair"
                                />
                            ))}
                        </svg>
                        <div className="flex justify-between mt-4">
                            <span className="text-[8px] font-black text-gray-300 uppercase">Oldest</span>
                            <span className="text-[10px] font-black text-[#1A5C38] uppercase bg-green-50 px-3 py-1 rounded-lg">Ideal Range (25-35)</span>
                            <span className="text-[8px] font-black text-gray-300 uppercase">Latest</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Impact Section */}
            <div className="bg-white p-12 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50">
                <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase mb-2">Environmental Impact Summary 🌍</h3>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-10">Real-world translation of your composting efforts</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                   {[
                       { label: "Trees Worth of CO₂", val: stats.treesEquivalent, sub: "Absorbed / Year", icon: "🌳" },
                       { label: "Landfill Diversion", val: stats.totalWasteKg, sub: "KG Preserved", icon: "♻️" },
                       { label: "Compost Produced", val: Math.round(stats.totalWasteKg * 3), sub: "Flowerpots equivalent", icon: "🪴" }
                   ].map((item, i) => (
                       <div key={i} className="p-8 bg-[#F9FBF9] rounded-[32px] border border-gray-100 flex flex-col items-center text-center">
                           <span className="text-4xl mb-4">{item.icon}</span>
                           <p className="text-3xl font-black text-gray-900 tracking-tighter mb-1">{item.val}</p>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                           <p className="text-[8px] font-bold text-[#1A5C38] uppercase mt-2">{item.sub}</p>
                       </div>
                   ))}
                </div>

                <div className="pt-10 border-t border-gray-50">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Momentum</p>
                            <h4 className="text-2xl font-black text-gray-900 tracking-tighter">You've logged {stats.thisMonthWaste} KG this month</h4>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl ${stats.thisMonthWaste >= stats.lastMonthWaste ? 'bg-green-50 text-[#1A5C38]' : 'bg-orange-50 text-orange-600'}`}>
                            {stats.thisMonthWaste >= stats.lastMonthWaste ? '📈 Beating last month' : '📉 Catching up'}
                        </div>
                    </div>
                    <div className="w-full h-4 bg-gray-50 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                            className="bg-[#1A5C38] transition-all duration-1000" 
                            style={{ width: `${Math.min((stats.thisMonthWaste / (stats.lastMonthWaste || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Society Rank (Conditional) */}
            {societyRank && (
                <div className="bg-gradient-to-br from-[#1A5C38] to-[#2E8B57] p-12 rounded-[40px] shadow-2xl shadow-green-900/10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 group-hover:rotate-0 transition-all duration-700">
                        <span className="text-9xl">🏢</span>
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                        <div className="text-center md:text-left shrink-0">
                            <p className="text-[10px] font-black text-green-200 uppercase tracking-[0.3em] mb-4">Building Rank</p>
                            <h2 className="text-8xl font-black tracking-tighter mb-2">#{societyRank.rank}</h2>
                            <p className="text-xs font-bold text-green-100 uppercase tracking-widest pl-2">Top {Math.round((societyRank.rank / societyRank.totalMembers) * 100)}% of Residents</p>
                        </div>
                        
                        <div className="flex-1 space-y-6">
                            <h3 className="text-lg font-black uppercase tracking-widest mb-6">Building Impact Leaders</h3>
                            
                            {/* Comparative Mini-Chart */}
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mb-8">
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-200 mb-4">You vs Building Average</p>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                                            <span>Your Total</span>
                                            <span>{stats.totalWasteKg.toFixed(1)} KG</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000" 
                                                style={{ width: `${Math.min((stats.totalWasteKg / (Math.max(stats.totalWasteKg, societyRank.buildingAvg) || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                                            <span>Building Avg</span>
                                            <span>{societyRank.buildingAvg.toFixed(1)} KG</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-green-400 opacity-50 transition-all duration-1000" 
                                                style={{ width: `${Math.min((societyRank.buildingAvg / (Math.max(stats.totalWasteKg, societyRank.buildingAvg) || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {societyRank.topMembers.map((m, i) => (
                                <div key={m.id} className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                                        <p className="font-bold text-sm">{m.name}</p>
                                    </div>
                                    <p className="text-xs font-black">{m.totalWasteKg?.toFixed(1) || 0} KG</p>
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
