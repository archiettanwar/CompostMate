import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from "../components/Sidebar";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for Leaflet default icon issues with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('Global');
  const [userData, setUserData] = useState(null);
  const [globalUsers, setGlobalUsers] = useState([]);
  const [societyUsers, setSocietyUsers] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [userRank, setUserRank] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        navigate("/");
        return;
      }

      try {
        // 1. Fetch current User Data
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setUserData(uData);

          // 2. Fetch Global Top 20
          const globalQuery = query(collection(db, "users"), orderBy("xp", "desc"), limit(20));
          const globalSnap = await getDocs(globalQuery);
          const gUsers = globalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setGlobalUsers(gUsers);

          // Find Global Rank position
          const fullGlobalQuery = query(collection(db, "users"), orderBy("xp", "desc"));
          const fullSnap = await getDocs(fullGlobalQuery); // In a production app, we'd use a server-side counter or index
          const rankIndex = fullSnap.docs.findIndex(d => d.id === firebaseUser.uid);
          setUserRank(rankIndex + 1);

          // 3. Fetch Society Users (if joined)
          if (uData.societyId) {
            const socQuery = query(
              collection(db, "users"), 
              where("societyId", "==", uData.societyId), 
              orderBy("xp", "desc")
            );
            const socSnap = await getDocs(socQuery);
            setSocietyUsers(socSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }

          // 4. Fetch Top Societies
          // For simplicity, we fetch all societies and sum their members' waste
          const societiesSnap = await getDocs(collection(db, "societies"));
          const societiesList = [];
          
          for (const sDoc of societiesSnap.docs) {
            const sData = sDoc.data();
            // Fetch members' total waste
            const mQuery = query(collection(db, "users"), where("societyId", "==", sDoc.id));
            const mSnap = await getDocs(mQuery);
            const totalWaste = mSnap.docs.reduce((acc, d) => acc + (d.data().totalWasteKg || 0), 0);
            societiesList.push({ 
                id: sDoc.id, 
                ...sData, 
                totalWaste,
                memberCount: mSnap.docs.length
            });
          }
          setSocieties(societiesList.sort((a,b) => b.totalWaste - a.totalWaste).slice(0, 5));
        }
      } catch (err) {
        console.error("Leaderboard Error:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchData(); else navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  const renderRank = (rank) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-sm font-black text-gray-400">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-black animate-pulse text-xl uppercase tracking-widest">Calculating Rankings...</div>
      </div>
    );
  }

  const currentLeaderboard = activeTab === 'Global' ? globalUsers : societyUsers;

  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-gray-100 pb-8 gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-1">Champions Hall</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest pl-1">Top earth warriors and building clusters</p>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm self-stretch md:self-auto overflow-x-auto">
            {['Global', 'My Society', 'Society Map'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-[#1A5C38] text-white shadow-lg shadow-green-900/10' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'Global' ? '🌍 Global' : tab === 'My Society' ? '🏢 My Society' : '🗺️ Society Map'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'My Society' && !userData?.societyId ? (
          <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center animate-in zoom-in-95 duration-500 mb-12">
            <span className="text-6xl block mb-6">🏢</span>
            <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase">Building Leaderboard Locked</h2>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-10">Join your society to compete with your neighbors and unlock building stats!</p>
            <button 
              onClick={() => navigate('/join-society')}
              className="px-10 py-5 bg-[#1A5C38] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-green-900/10 cursor-pointer"
            >
              Join Your Society 🚀
            </button>
          </div>
        ) : activeTab === 'Society Map' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Map Container */}
            <div className="bg-white p-4 rounded-[40px] shadow-2xl shadow-black/5 border border-gray-50 overflow-hidden relative">
              <MapContainer
                center={
                  userData?.societyId && societies.find(s => s.id === userData.societyId)?.lat 
                    ? [societies.find(s => s.id === userData.societyId).lat, societies.find(s => s.id === userData.societyId).lng]
                    : [19.0760, 72.8777]
                }
                zoom={userData?.societyId ? 13 : 11}
                style={{ width: "100%", height: "550px", borderRadius: "32px", zIndex: 1 }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {societies.filter(s => s.lat && s.lng).map(society => {
                  const getMarkerColor = (totalWaste) => {
                    if (totalWaste >= 100) return "#1A5C38";
                    if (totalWaste >= 50) return "#2E8B57";
                    if (totalWaste >= 10) return "#8BC34A";
                    return "#FF9800";
                  };
                  const getMarkerSize = (totalWaste) => Math.max(10, Math.min(40, (totalWaste || 0) / 3 + 10));

                  return (
                    <CircleMarker
                      key={society.id}
                      center={[society.lat, society.lng]}
                      radius={getMarkerSize(society.totalWaste)}
                      fillColor={getMarkerColor(society.totalWaste)}
                      fillOpacity={0.8}
                      color={userData?.societyId === society.id ? "#F4A300" : "#FFFFFF"}
                      weight={userData?.societyId === society.id ? 4 : 2}
                    >
                      <Popup>
                        <div style={{ fontFamily: "Inter, sans-serif", minWidth: "180px", padding: "4px" }}>
                          <h3 style={{ color: "#1A5C38", margin: "0 0 8px 0", fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.5px" }}>
                            🏢 {society.name}
                          </h3>
                          <p style={{ margin: "4px 0", fontSize: "11px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "1px" }}>
                            📍 {society.city}
                          </p>
                          <div style={{ margin: "12px 0", padding: "8px", background: "#F9FBF9", borderRadius: "12px", border: "1px solid #E8F5EE" }}>
                            <p style={{ margin: "0", fontSize: "10px", fontWeight: 800, color: "#999", textTransform: "uppercase" }}>Total Impact</p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "18px", fontWeight: 900, color: "#1A5C38" }}>
                              {society.totalWaste?.toFixed(1)} <span style={{ fontSize: "10px" }}>KG</span>
                            </p>
                          </div>
                          <p style={{ margin: "4px 0", fontSize: "11px", fontWeight: 600 }}>
                            👥 {society.memberCount} active residents
                          </p>
                          {userData?.societyId === society.id && (
                            <p style={{ margin: "8px 0 0 0", color: "#F4A300", fontWeight: 900, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                              ⭐ Your Building Cluster
                            </p>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              {societies.filter(s => s.lat && s.lng).length === 0 && (
                <div className="absolute inset-0 z-[10] flex items-center justify-center bg-white/40 backdrop-blur-sm">
                  <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 text-center max-w-sm">
                    <span className="text-5xl block mb-6">🗺️</span>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-3">No Mapped Societies</h3>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-8 leading-relaxed">
                      Be the change! Establish your society and put your building on the global impact map.
                    </p>
                    <button 
                      onClick={() => navigate('/create-society')}
                      className="w-full py-4 bg-[#1A5C38] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-900/10 cursor-pointer"
                    >
                      Create Your Society →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Legend & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-50 shadow-xl shadow-black/5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Map Legend</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { label: "Just Started", color: "#FF9800", range: "0-10kg", icon: "🟠" },
                    { label: "Growing", color: "#8BC34A", range: "10-50kg", icon: "🟢" },
                    { label: "Active", color: "#2E8B57", range: "50-100kg", icon: "💚" },
                    { label: "Champion", color: "#1A5C38", range: "100kg+", icon: "🏆" }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{item.label}</span>
                      </div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest ml-5">{item.range}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-50 flex flex-wrap gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-4 border-[#F4A300] bg-white"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Building Cluster</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">⭕</div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Circle size = Diverted waste</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1A5C38] p-8 rounded-[32px] text-white shadow-xl shadow-green-900/10 relative overflow-hidden flex flex-col justify-center">
                 <div className="relative z-10">
                    <p className="text-[10px] font-black text-green-200 uppercase tracking-widest mb-2">Global Network Impact</p>
                    <p className="text-4xl font-black tracking-tighter mb-4">
                      {societies.reduce((acc, s) => acc + (s.totalWaste || 0), 0).toFixed(0)} <span className="text-lg">KG</span>
                    </p>
                    <p className="text-[10px] font-bold text-green-300 uppercase tracking-widest italic">
                      Composted by {societies.length} societies across the platform
                    </p>
                 </div>
                 <span className="absolute -right-8 -bottom-8 text-9xl opacity-5 rotate-12">🌍</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Global Rank Banner (Only for Global Tab) */}
            {activeTab === 'Global' && (
              <div className="bg-[#1A5C38] rounded-[32px] p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-green-900/15 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">🏆</div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight uppercase mb-1">Your Global Stance</h2>
                    <p className="text-green-200 font-bold text-[10px] uppercase tracking-[0.2em] pl-0.5">Keep composting to climb the ladder</p>
                  </div>
                  <div className="text-center md:text-right mt-6 md:mt-0">
                    <p className="text-xs font-black text-green-200 uppercase tracking-widest mb-1">Rank</p>
                    <p className="text-5xl font-black tracking-tighter">#{userRank}</p>
                  </div>
              </div>
            )}

            {/* Building Stats (Only for Society Tab) */}
            {activeTab === 'My Society' && userData?.societyId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="bg-white p-8 rounded-3xl border border-gray-50 shadow-xl shadow-black/5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Building Total Diverted</p>
                    <p className="text-3xl font-black text-[#1A5C38] tracking-tighter">
                        {societyUsers.reduce((acc, m) => acc + (m.totalWasteKg || 0), 0).toFixed(1)} KG
                    </p>
                 </div>
                 <div className="bg-white p-8 rounded-3xl border border-gray-50 shadow-xl shadow-black/5 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Active Composters</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{societyUsers.length}</p>
                 </div>
                 <div className="bg-white p-8 rounded-3xl border border-gray-50 shadow-xl shadow-black/5 text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Building MVP</p>
                    <p className="text-3xl font-black text-amber-500 tracking-tighter uppercase truncate pl-4">
                        {societyUsers[0]?.name?.split(' ')[0] || "None"} 🌟
                    </p>
                 </div>
              </div>
            )}

            {/* Main Ranking Table */}
            <div className="bg-white rounded-[40px] shadow-2xl shadow-black/5 border border-gray-50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Rank</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Composter</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Growth</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Impact</th>
                        <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Top Badge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentLeaderboard.map((u, i) => {
                        const isMe = u.id === auth.currentUser.uid;
                        const badges = u.badges || [];
                        return (
                          <tr key={u.id} className={`hover:bg-gray-50/30 transition-all group ${isMe ? 'bg-[#E8F5EE]' : ''}`}>
                            <td className="px-10 py-8">
                                {renderRank(i + 1)}
                            </td>
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#1A5C38] rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-green-900/10">
                                  {u.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-black text-gray-900 text-sm tracking-tight">{u.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{u.streak || 0} DAY STREAK 🔥</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-8 text-center">
                              <span className="px-3 py-1 bg-green-50 rounded-lg text-[10px] font-black text-[#1A5C38] uppercase">LVL {u.level || 1}</span>
                              <p className="text-[10px] font-black text-gray-900 mt-2 tracking-widest">{u.xp || 0} XP</p>
                            </td>
                            <td className="px-10 py-8 text-center">
                              <p className="text-lg font-black text-gray-900 tracking-tighter">{u.totalWasteKg?.toFixed(1) || 0}</p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">KG DIVERTED</p>
                            </td>
                            <td className="px-10 py-8 text-right">
                              {badges.length > 0 ? (
                                <span className="inline-block px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-black text-[10px] uppercase tracking-widest shadow-sm">
                                  {badges[badges.length - 1].name || "Achiever"}
                                </span>
                              ) : (
                                <span className="text-gray-200 font-black text-[10px] tracking-[0.3em]">———</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        )}

        {/* Top Societies Section */}
        <div className="mt-20">
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase mb-2 flex items-center gap-4">
                🏆 Top Societies This Month
                <span className="h-px bg-gray-100 flex-1"></span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
                {societies.map((s, i) => {
                    const isMySoc = s.id === userData?.societyId;
                    return (
                        <div key={s.id} className={`p-8 rounded-[40px] shadow-xl shadow-black/5 border transition-all hover:scale-[1.02] ${isMySoc ? 'bg-green-50 border-green-100' : 'bg-white border-gray-50'}`}>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Building Rank #{i+1}</p>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-1 truncate">{s.name}</h3>
                            <p className="text-[10px] font-black text-[#1A5C38] uppercase tracking-widest mb-8">{s.city}</p>
                            
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-black text-gray-900 tracking-tighter">{s.totalWaste.toFixed(0)} KG</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Community Impact</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-gray-900 tracking-tight">{s.memberCount}</p>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Residents</p>
                                </div>
                            </div>

                            {!userData?.societyId && (
                                <button 
                                  onClick={() => navigate('/join-society')}
                                  className="w-full mt-8 py-4 bg-[#1A5C38] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-900/10 cursor-pointer"
                                >
                                  Join Building
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
