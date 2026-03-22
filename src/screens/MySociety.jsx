import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
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
      // 1. Fetch Society Basic Info
      const societyDoc = await getDoc(doc(db, "societies", societyId));
      if (!societyDoc.exists()) return;
      const sData = societyDoc.data();
      setSociety(sData);

      // 2. Fetch All Members of this society
      const q = query(collection(db, "users"), where("societyId", "==", societyId));
      const memberSnaps = await getDocs(q);
      const memberList = memberSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(memberList.sort((a, b) => (b.xp || 0) - (a.xp || 0)));

      // 3. Calculate Building Stats
      const totalWaste = memberList.reduce((acc, m) => acc + (m.totalWasteKg || 0), 0);
      const co2 = totalWaste * 0.5;
      
      // 4. Determine Global Rank
      // Note: This is a heavy operation in Firestore. In production, we'd use a cloud function or pre-aggregated stats.
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-[#1A5C38] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-[#1A5C38] font-black uppercase tracking-[0.2em] animate-pulse">Analyzing Building Ecosystem...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBF9] flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-10">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-[#1A5C38] to-[#2E8B57] rounded-[40px] p-12 mb-10 text-white relative overflow-hidden shadow-2xl shadow-green-900/20">
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <span className="text-6xl drop-shadow-lg">🏢</span>
                <div>
                  <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2">{society?.name}</h1>
                  <p className="text-green-50/80 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    {society?.city} • Established {society?.createdAt ? new Date(society.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="px-8 py-4 bg-white/10 backdrop-blur-md rounded-[32px] border border-white/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Total Members</p>
                  <p className="text-3xl font-black">{members.length}</p>
                </div>
                <div className="px-8 py-4 bg-white/10 backdrop-blur-md rounded-[32px] border border-white/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Society Rank</p>
                  <p className="text-3xl font-black">#{stats.rank}<span className="text-xs opacity-40 ml-1">/{stats.totalSocieties}</span></p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT: MEMBER LIST */}
          <div className="lg:col-span-2 space-y-10">
            <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-xl shadow-black/5">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Building Directory</h2>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Real-time status of your composting community</p>
                </div>
                <div className="flex -space-x-3">
                  {members.slice(0, 5).map((m, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-black text-[#1A5C38] overflow-hidden shadow-sm">
                      {m.profilePic ? <img src={m.profilePic} className="w-full h-full object-cover" alt="" /> : ((m.name || m.username)?.charAt(0).toUpperCase() || 'U')}
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 shadow-sm">
                      +{members.length - 5}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {members.map((member, i) => (
                  <div key={member.id} className="flex items-center gap-4 p-5 bg-[#F9FBF9] rounded-[32px] border border-gray-50 hover:border-[#1A5C38]/20 transition-all group relative overflow-hidden">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center font-black text-[#1A5C38] text-xl shrink-0 group-hover:scale-105 transition-transform">
                      {member.profilePic ? (
                        <img src={member.profilePic} className="w-full h-full object-cover" alt={member.name || member.username} />
                      ) : (
                        ((member.name || member.username)?.charAt(0).toUpperCase() || 'U')
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-gray-900 truncate group-hover:text-[#1A5C38] transition-colors uppercase tracking-tight">
                          {member.name || member.username || 'Resident'}
                        </h4>
                        {member.flatNumber && (
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[8px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                            {member.flatNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {member.role === 'society_admin' ? '⭐ Building Secretary' : 'Building Resident'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-gray-900 tracking-tighter">{member.xp || 0}</p>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">XP SCORE</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: BUILDING STATS & INFO */}
          <div className="space-y-10">
            <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-xl shadow-black/5">
              <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase mb-8 flex items-center gap-3">
                <span className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">📈</span> 
                Building Metrics
              </h3>
              
              <div className="space-y-8">
                <div className="p-8 bg-gradient-to-br from-[#F9FBF9] to-white rounded-[40px] border border-gray-100 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Waste Diverted</p>
                    <div className="flex items-end gap-2">
                      <p className="text-5xl font-black text-[#1A5C38] tracking-tighter">{stats.totalWaste}</p>
                      <p className="text-xl font-black text-[#1A5C38] mb-1.5 uppercase">KG</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A5C38]" style={{ width: '65%' }}></div>
                      </div>
                      <span className="text-[10px] font-black text-gray-300">Target: 1T</span>
                    </div>
                  </div>
                  <span className="absolute -right-4 -bottom-4 text-7xl opacity-[0.03] grayscale group-hover:grayscale-0 transition-all rotate-12 group-hover:rotate-0">⚖️</span>
                </div>

                <div className="p-8 bg-gradient-to-br from-[#F9FBF9] to-white rounded-[40px] border border-gray-100 relative overflow-hidden group">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Net Carbon Offset</p>
                    <div className="flex items-end gap-2">
                       <p className="text-5xl font-black text-blue-600 tracking-tighter">{stats.co2Offset}</p>
                       <p className="text-xl font-black text-blue-600 mb-1.5 uppercase">KG</p>
                    </div>
                    <p className="text-[10px] font-bold text-gray-300 mt-4 italic flex items-center gap-2">
                      <span className="text-lg">🌳</span> Equivalent to sub-optimizing {stats.trees} trees
                    </p>
                  </div>
                  <span className="absolute -right-4 -bottom-4 text-7xl opacity-[0.03] grayscale group-hover:grayscale-0 transition-all -rotate-12 group-hover:rotate-0">🌍</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-[40px] p-10 border border-amber-100 relative overflow-hidden group">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter mb-4 flex items-center gap-3">
                <span className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">🛡️</span> 
                Read-Only Access
              </h3>
              <p className="text-xs text-amber-900/60 font-bold leading-relaxed uppercase tracking-tight">
                This is a summarized impact ledger for your building community. Administrative privileges (management, code updates, member audits) are restricted to the Building Secretary.
              </p>
              
              <div className="mt-8 pt-8 border-t border-amber-200/50">
                <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest mb-2">Building Secretary</p>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-amber-200/50 flex items-center justify-center font-black text-amber-900 text-[10px]">
                      {members.find(m => m.role === 'society_admin')?.username?.charAt(0) || 'A'}
                   </div>
                   <p className="font-black text-amber-900 text-sm tracking-tight uppercase">
                      {members.find(m => m.role === 'society_admin')?.username || 'Admin In Charge'}
                   </p>
                </div>
              </div>
              <span className="absolute -right-8 -top-8 text-9xl opacity-[0.02] -rotate-12 grayscale group-hover:grayscale-0 transition-all">🔐</span>
            </div>

            <button 
              onClick={() => navigate('/leaderboard')}
              className="w-full py-6 bg-[#1A5C38] text-white rounded-[32px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 hover:shadow-green-900/30 transition-all flex items-center justify-center gap-4 group"
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
