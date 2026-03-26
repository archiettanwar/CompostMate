import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";

const MySociety = () => {
  const [user, setUser] = useState(null);
  const [society, setSociety] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWaste: 0,
    co2Offset: 0,
    trees: 0,
    rank: 0,
    totalSocieties: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, "users", u.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser(userData);
          if (userData.societyId) {
            fetchSocietyData(userData.societyId);
          } else {
            navigate('/join-society');
          }
        }
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchSocietyData = async (societyId) => {
    try {
      const societyDoc = await getDoc(doc(db, "societies", societyId));
      if (!societyDoc.exists()) return;
      const sData = societyDoc.data();
      setSociety(sData);

      const q = query(collection(db, "users"), where("societyId", "==", societyId));
      const memberSnaps = await getDocs(q);
      const memberList = memberSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(memberList.sort((a, b) => (b.xp || 0) - (a.xp || 0)));

      const totalWaste = memberList.reduce((acc, m) => acc + (m.totalWasteKg || 0), 0);
      const co2 = totalWaste * 0.5;
      
      const allSocietiesSnap = await getDocs(collection(db, "societies"));
      const societiesList = [];
      
      for (const sDoc of allSocietiesSnap.docs) {
        const mQuery = query(collection(db, "users"), where("societyId", "==", sDoc.id));
        const mSnap = await getDocs(mQuery);
        const sWaste = mSnap.docs.reduce((acc, d) => acc + (d.data().totalWasteKg || 0), 0);
        societiesList.push({ id: sDoc.id, totalWaste: sWaste });
      }

      const sortedSocieties = societiesList.sort((a, b) => b.totalWaste - a.totalWaste);
      const rank = sortedSocieties.findIndex(s => s.id === societyId) + 1;

      setStats({
        totalWaste: totalWaste.toFixed(1),
        co2Offset: co2.toFixed(1),
        trees: (co2 / 21).toFixed(1),
        rank: rank,
        totalSocieties: sortedSocieties.length
      });

    } catch (err) {
      console.error("Error fetching society data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Analyzing Building Ecosystem...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 ml-64 p-10 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="rounded-3xl p-12 mb-10 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <span className="text-6xl drop-shadow-2xl grayscale">🏢</span>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight uppercase mb-1">{society?.name}</h1>
                  <p className="font-semibold uppercase text-[10px] tracking-widest flex items-center gap-2" style={{ color: '#9ca3af' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e' }}></span>
                    {society?.city} • Established {society?.createdAt ? new Date(society.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="px-8 py-4 rounded-2xl border text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Members</p>
                  <p className="text-3xl font-bold">{members.length}</p>
                </div>
                <div className="px-8 py-4 rounded-2xl border text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Rank</p>
                  <p className="text-3xl font-bold">#{stats.rank}<span className="text-xs opacity-40 ml-1">/{stats.totalSocieties}</span></p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-[0.02] rounded-full -mr-32 -mt-32 blur-3xl"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT: MEMBER LIST */}
          <div className="lg:col-span-2 space-y-10">
            <div className="p-10 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight uppercase">Building Directory</h2>
                  <p className="font-semibold text-[10px] uppercase tracking-widest mt-1" style={{ color: '#4b5563' }}>Real-time status of your community</p>
                </div>
                <div className="flex -space-x-3">
                  {members.slice(0, 5).map((m, i) => (
                    <div key={i} className="w-9 h-9 rounded-xl border-2 border-[#111] bg-white/5 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-sm">
                      {m.profilePic ? <img src={m.profilePic} className="w-full h-full object-cover" alt="" /> : ((m.name || m.username)?.charAt(0).toUpperCase() || 'U')}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-5 rounded-2xl transition-all group relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-xl shrink-0 group-hover:scale-105 transition-transform">
                      {member.profilePic ? (
                        <img src={member.profilePic} className="w-full h-full object-cover" alt={member.name || member.username} />
                      ) : (
                        ((member.name || member.username)?.charAt(0).toUpperCase() || 'U')
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-white truncate group-hover:text-[#22c55e] transition-colors uppercase tracking-tight">
                          {member.name || member.username || 'Resident'}
                        </h4>
                        {member.flatNumber && (
                          <span className="px-2 py-0.5 rounded-md text-[8px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                            {member.flatNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>
                        {member.role === 'society_admin' ? '⭐ Building Secretary' : 'Building Resident'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-white tracking-tight">{member.xp || 0}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest text-gray-600">XP SCORE</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: BUILDING STATS & INFO */}
          <div className="space-y-10">
            <div className="p-10 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-10 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center grayscale" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>📈</span> 
                Building Metrics
              </h3>
              
              <div className="space-y-8">
                <div className="p-8 rounded-2xl relative overflow-hidden group border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="relative z-10">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Total Waste Diverted</p>
                    <div className="flex items-end gap-2">
                      <p className="text-5xl font-bold tracking-tight text-white">{stats.totalWaste}</p>
                      <p className="text-xl font-bold mb-1.5 uppercase" style={{ color: '#22c55e' }}>KG</p>
                    </div>
                  </div>
                  <span className="absolute -right-4 -bottom-4 text-7xl opacity-[0.03] grayscale transition-all rotate-12">⚖️</span>
                </div>

                <div className="p-8 rounded-2xl relative overflow-hidden group border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="relative z-10">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Carbon Offset</p>
                    <div className="flex items-end gap-2 text-white">
                       <p className="text-5xl font-bold tracking-tight">{stats.co2Offset}</p>
                       <p className="text-xl font-bold mb-1.5 uppercase opacity-40">KG</p>
                    </div>
                    <p className="text-[8px] font-bold mt-4 flex items-center gap-2 uppercase tracking-widest" style={{ color: '#4b5563' }}>
                      <span className="text-lg grayscale">🌳</span> Eq. to {stats.trees} Trees/Year
                    </p>
                  </div>
                  <span className="absolute -right-4 -bottom-4 text-7xl opacity-[0.03] grayscale transition-all -rotate-12">🌍</span>
                </div>
              </div>
            </div>

            <div className="p-10 rounded-2xl relative overflow-hidden group border" style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.1)' }}>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center grayscale" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>🛡️</span> 
                Security Notice
              </h3>
              <p className="text-[10px] font-semibold leading-relaxed uppercase tracking-tight" style={{ color: '#92400e' }}>
                Summary access only. Management privileges are restricted to the validated Building Secretary.
              </p>
              <span className="absolute -right-8 -top-8 text-9xl opacity-[0.02] -rotate-12 grayscale">🔐</span>
            </div>

            <button 
              onClick={() => navigate('/leaderboard')}
              className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 group cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
            >
              Building Leaderboard <span className="group-hover:translate-x-2 transition-transform">🏆 →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySociety;
