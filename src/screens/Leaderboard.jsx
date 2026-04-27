import React, { useState, useEffect, useRef } from 'react';
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
        navigate("/auth");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setUserData(uData);

          const globalQuery = query(collection(db, "users"), orderBy("xp", "desc"), limit(20));
          const globalSnap = await getDocs(globalQuery);
          const gUsers = globalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setGlobalUsers(gUsers);

          const fullGlobalQuery = query(collection(db, "users"), orderBy("xp", "desc"));
          const fullSnap = await getDocs(fullGlobalQuery); 
          const rankIndex = fullSnap.docs.findIndex(d => d.id === firebaseUser.uid);
          setUserRank(rankIndex + 1);

          if (uData.societyId) {
            const socQuery = query(
              collection(db, "users"), 
              where("societyId", "==", uData.societyId), 
              orderBy("xp", "desc")
            );
            const socSnap = await getDocs(socQuery);
            setSocietyUsers(socSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }

          const societiesSnap = await getDocs(collection(db, "societies"));
          const societiesList = [];
          
          for (const sDoc of societiesSnap.docs) {
            const sData = sDoc.data();
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
      if (user) fetchData(); else navigate("/auth");
    });
    return () => unsubscribe();
  }, [navigate]);

  const renderRank = (rank) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-sm font-bold opacity-40">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl uppercase tracking-widest text-[#22c55e]">Calculating Rankings...</div>
      </div>
    );
  }

  const currentLeaderboard = activeTab === 'Global' ? globalUsers : societyUsers;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-1">Champions Hall</h1>
            <p className="font-semibold uppercase text-[10px] tracking-widest" style={{ color: '#6b7280' }}>Top earth warriors and building clusters</p>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex p-1 rounded-xl self-stretch md:self-auto overflow-x-auto" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['Global', 'My Society', 'Society Map'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab 
                    ? 'text-white shadow-lg' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                style={activeTab === tab ? { backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' } : {}}
              >
                {tab === 'Global' ? '🌍 Global' : tab === 'My Society' ? '🏢 My Society' : '🗺️ Map'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'My Society' && !userData?.societyId ? (
          <div className="p-20 rounded-2xl border-2 border-dashed text-center animate-in zoom-in-95 duration-500 mb-12" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
            <span className="text-6xl block mb-6">🏢</span>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">Leaderboard Locked</h2>
            <p className="font-semibold uppercase text-[10px] tracking-widest mb-10" style={{ color: '#6b7280' }}>Join your society to compete with neighbors!</p>
            <button 
              onClick={() => navigate('/join-society')}
              className="px-10 py-5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
            >
              Join Your Society 🚀
            </button>
          </div>
        ) : activeTab === 'Society Map' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Map Container */}
            <div className="p-2 rounded-2xl overflow-hidden relative" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <MapContainer
                center={
                  userData?.societyId && societies.find(s => s.id === userData.societyId)?.lat 
                    ? [societies.find(s => s.id === userData.societyId).lat, societies.find(s => s.id === userData.societyId).lng]
                    : [19.0760, 72.8777]
                }
                zoom={userData?.societyId ? 13 : 11}
                style={{ width: "100%", height: "550px", borderRadius: "12px", zIndex: 1 }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                {societies.filter(s => s.lat && s.lng).map(society => {
                  const getMarkerColor = (totalWaste) => {
                    if (totalWaste >= 100) return "#22c55e";
                    if (totalWaste >= 50) return "#16a34a";
                    if (totalWaste >= 10) return "#4ade80";
                    return "#f59e0b";
                  };
                  const getMarkerSize = (totalWaste) => Math.max(10, Math.min(40, (totalWaste || 0) / 3 + 10));

                  return (
                    <CircleMarker
                      key={society.id}
                      center={[society.lat, society.lng]}
                      radius={getMarkerSize(society.totalWaste)}
                      fillColor={getMarkerColor(society.totalWaste)}
                      fillOpacity={0.6}
                      color={userData?.societyId === society.id ? "#22c55e" : "#FFFFFF50"}
                      weight={userData?.societyId === society.id ? 3 : 1}
                    >
                      <Popup className="dark-popup">
                        <div style={{ fontFamily: "Poppins, sans-serif", minWidth: "180px", padding: "8px", backgroundColor: '#111', color: '#fff' }}>
                          <h3 style={{ color: "#22c55e", margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700, textTransform: "uppercase" }}>
                            🏢 {society.name}
                          </h3>
                          <p style={{ margin: "4px 0", fontSize: "10px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase" }}>
                            📍 {society.city}
                          </p>
                          <div style={{ margin: "12px 0", padding: "10px", backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <p style={{ margin: "0", fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Total Impact</p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: 800, color: "#22c55e" }}>
                              {society.totalWaste?.toFixed(1)} <span style={{ fontSize: "10px" }}>KG</span>
                            </p>
                          </div>
                          <p style={{ margin: "4px 0", fontSize: "10px", fontWeight: 500 }}>
                            👥 {society.memberCount} active residents
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Legend & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 p-8 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#6b7280' }}>Map Legend</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { label: "Just Started", color: "#f59e0b", range: "0-10kg" },
                    { label: "Growing", color: "#4ade80", range: "10-50kg" },
                    { label: "Active", color: "#16a34a", range: "50-100kg" },
                    { label: "Champion", color: "#22c55e", range: "100kg+" }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">{item.label}</span>
                      </div>
                      <span className="text-[8px] font-semibold uppercase tracking-widest ml-5" style={{ color: '#4b5563' }}>{item.range}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-2xl text-white relative overflow-hidden flex flex-col justify-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                 <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#22c55e' }}>Network Impact</p>
                    <p className="text-4xl font-bold tracking-tighter mb-4">
                      {societies.reduce((acc, s) => acc + (s.totalWaste || 0), 0).toFixed(0)} <span className="text-lg">KG</span>
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest italic" style={{ color: '#9ca3af' }}>
                      Composted by {societies.length} societies
                    </p>
                 </div>
                 <span className="absolute -right-8 -bottom-8 text-9xl opacity-10 rotate-12">🌍</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Global Rank Banner */}
            {activeTab === 'Global' && (
              <div className="rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">🏆</div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight uppercase mb-1">Global Standing</h2>
                    <p className="font-semibold text-[10px] uppercase tracking-[0.2em]" style={{ color: '#9ca3af' }}>Join the hall of fame</p>
                  </div>
                  <div className="text-center md:text-right mt-6 md:mt-0">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#22c55e' }}>Rank</p>
                    <p className="text-5xl font-bold tracking-tighter">#{userRank}</p>
                  </div>
              </div>
            )}

            {/* Building Stats */}
            {activeTab === 'My Society' && userData?.societyId && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className="p-8 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Total Diverted</p>
                    <p className="text-3xl font-bold tracking-tighter" style={{ color: '#22c55e' }}>
                        {societyUsers.reduce((acc, m) => acc + (m.totalWasteKg || 0), 0).toFixed(1)} KG
                    </p>
                 </div>
                 <div className="p-8 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Active Composts</p>
                    <p className="text-3xl font-bold text-white tracking-tighter">{societyUsers.length}</p>
                 </div>
                 <div className="p-8 rounded-xl text-right" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Building MVP</p>
                    <p className="text-3xl font-bold text-amber-500 tracking-tighter uppercase truncate pl-4">
                        {societyUsers[0]?.name?.split(' ')[0] || "None"} 🌟
                    </p>
                 </div>
              </div>
            )}

            {/* Ranking Table */}
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Composter</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Level</th>
                        <th className="px-10 py-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      {currentLeaderboard.map((u, i) => {
                        const isMe = u.id === auth.currentUser.uid;
                        return (
                          <tr key={u.id} className={`transition-all ${isMe ? 'bg-white/5 shadow-inner' : 'hover:bg-white/2'}`}>
                            <td className="px-10 py-6">
                                {renderRank(i + 1)}
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                                  {u.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm tracking-tight">{u.name}</p>
                                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#4b5563' }}>{u.streak || 0} DAY STREAK 🔥</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <span className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>LVL {u.level || 1}</span>
                              <p className="text-[9px] font-bold text-gray-400 mt-2 tracking-widest uppercase">{u.xp || 0} XP</p>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <p className="text-xl font-bold text-white tracking-tighter">{u.totalWasteKg?.toFixed(1) || 0}</p>
                              <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>KG Diverted</p>
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
      </div>
    </div>
  );
};

export default Leaderboard;
