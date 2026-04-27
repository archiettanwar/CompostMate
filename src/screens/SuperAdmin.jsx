import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";

const SuperAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [societies, setSocieties] = useState({});
  const [localities, setLocalities] = useState([]);
  
  // CSV Modal State & Filters
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState('ALL'); 
  const [filterParam, setFilterParam] = useState(''); 
  
  const navigate = useNavigate();

  useEffect(() => {
    const initSuperAdmin = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          navigate("/auth");
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role !== 'super_admin') {
              navigate("/dashboard");
              return;
            }
            
            // Authorized
            await fetchGlobalData();
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          navigate("/");
        }
      });
      return () => unsubscribe();
    };
    
    initSuperAdmin();
  }, [navigate]);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const socSnap = await getDocs(collection(db, "societies"));
      const socData = {};
      const uniqueCities = new Set();
      
      socSnap.docs.forEach(doc => {
        const data = doc.data();
        socData[doc.id] = { ...data, id: doc.id };
        if (data.city) uniqueCities.add(data.city.trim().toUpperCase());
      });
      
      setSocieties(socData);
      setLocalities(Array.from(uniqueCities).sort());

      const usersSnap = await getDocs(collection(db, "users"));
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (err) {
      console.error("Failed to load global data", err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      if (filterMode === 'ALL') return true;
      if (filterMode === 'UNASSIGNED') return !user.societyId;
      if (filterMode === 'SOCIETY') return user.societyId === filterParam;
      if (filterMode === 'LOCALITY') {
        if (!user.societyId) return false; 
        const soc = societies[user.societyId];
        return soc && soc.city && soc.city.toUpperCase() === filterParam;
      }
      return true;
    });
  };

  const currentUsers = getFilteredUsers();

  const handleDownloadCSV = () => {
    if (currentUsers.length === 0) {
        alert("No users found to export!");
        return;
    }

    const headers = [
      "User ID",
      "Name",
      "Role",
      "XP Points",
      "Total Waste Diverted (KG)",
      "Streak (Days)",
      "Society ID",
      "Society Name",
      "Locality (City)",
      "Flat Number"
    ];

    const rows = currentUsers.map(user => {
      const soc = user.societyId ? societies[user.societyId] : null;
      
      return [
        user.id,
        `"${(user.name || 'Anonymous').replace(/"/g, '""')}"`,
        user.role || 'resident',
        user.xp || 0,
        user.totalWasteKg || 0,
        user.streak || 0,
        user.societyId || 'UNASSIGNED',
        `"${(soc ? soc.name : 'N/A').replace(/"/g, '""')}"`,
        `"${(soc ? soc.city : 'N/A').replace(/"/g, '""')}"`,
        `"${(user.flatNumber || 'N/A').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    let fileNameExt = 'ALL_USERS';
    if (filterMode === 'UNASSIGNED') fileNameExt = 'UNASSIGNED_RESIDENTS';
    if (filterMode === 'SOCIETY' && societies[filterParam]) fileNameExt = `SOCIETY_${societies[filterParam].name.replace(/\s+/g, '_').toUpperCase()}`;
    if (filterMode === 'LOCALITY') fileNameExt = `LOCALITY_${filterParam}`;

    link.download = `CompostMate_Export_${fileNameExt}_${dateStr}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsModalOpen(false);
  };

  // --- Mutators Engine ---
  const handleRoleChange = async (userId, targetRole) => {
    if (userId === auth.currentUser.uid) {
        alert("Action Denied: You cannot manually mutate your own God-Mode session.");
        return;
    }
    if (window.confirm(`Are you sure you want to transition this user to ${targetRole.toUpperCase()}?`)) {
      try {
        await updateDoc(doc(db, "users", userId), { role: targetRole });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
      } catch(err) {
        alert("Failed to update user privilege scope.");
      }
    }
  };

  const handleWipeData = async (userId) => {
    if(window.confirm("WARNING: Do you want to completely erase this user's logging history (XP, Waste, Streak = 0)?")) {
      try {
        await updateDoc(doc(db, "users", userId), { totalWasteKg: 0, xp: 0, streak: 0 });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, totalWasteKg: 0, xp: 0, streak: 0 } : u));
      } catch(err) {
        alert("Failed to execute data wipe protocol.");
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === auth.currentUser.uid) {
        alert("Action Denied: You cannot delete your own session.");
        return;
    }
    if(window.confirm("CRITICAL: Are you sure you want to permanently delete this user document from the global Firestore matrix?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch(err) {
        alert("Deletion payload failed.");
      }
    }
  };

  // --- Analytical Calculations ---
  const totalWaste = users.reduce((sum, u) => sum + (u.totalWasteKg || 0), 0);
  const activeSocietiesCount = Object.keys(societies).length;

  const societyWasteMap = {};
  users.forEach(u => {
      if (u.societyId && u.totalWasteKg) {
          societyWasteMap[u.societyId] = (societyWasteMap[u.societyId] || 0) + u.totalWasteKg;
      }
  });

  const topSocieties = Object.entries(societyWasteMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, waste]) => ({
          name: societies[id]?.name || 'Unknown',
          waste
      }));
  const maxSocietyWaste = topSocieties.length > 0 ? topSocieties[0].waste : 1;

  // Pie Chart Demographics
  const totalUsers = users.length || 1;
  const residentsCount = users.filter(u => u.role !== 'society_admin' && u.role !== 'super_admin' && u.role !== 'banned' && u.societyId).length;
  const sysAdminsCount = users.filter(u => u.role === 'society_admin').length;
  const superCount = users.filter(u => u.role === 'super_admin').length;
  const unassignedCount = users.filter(u => !u.societyId && u.role !== 'banned').length;
  const bannedCount = users.filter(u => u.role === 'banned').length;

  const residentPct = (residentsCount / totalUsers) * 100;
  const sysAdminPct = (sysAdminsCount / totalUsers) * 100;
  const superPct = (superCount / totalUsers) * 100;
  const bannedPct = (bannedCount / totalUsers) * 100;

  // Conic stops mapping
  const p1 = residentPct;
  const p2 = p1 + sysAdminPct;
  const p3 = p2 + superPct;
  const p4 = p3 + bannedPct;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#14b8a6]">Connecting to Global Matrix...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />

      {/* CSV EXPORT MODAL OVERLAY */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
              <div className="w-full max-w-lg rounded-2xl p-10 border shadow-2xl relative animate-in fade-in zoom-in-95 duration-300" style={{ backgroundColor: '#0f0f0f', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <button 
                      onClick={() => setIsModalOpen(false)}
                      className="absolute top-6 right-6 text-2xl opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                  >×</button>
                  <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-3">
                      <span className="text-[#14b8a6]">⬇️</span> Export Matrix Data
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-8 pb-6 border-b border-white/5">Generate offline CSV spreadsheets</p>

                  <div className="space-y-6 mb-10">
                       <div>
                           <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Target Segment</label>
                           <select 
                               value={filterMode} 
                               onChange={(e) => {
                                   setFilterMode(e.target.value);
                                   setFilterParam('');
                               }}
                               className="w-full bg-black/40 text-sm text-white font-bold p-4 rounded-xl border outline-none"
                               style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                           >
                               <option value="ALL">Entire Global Registry</option>
                               <option value="UNASSIGNED">Unassigned Residents</option>
                               <option value="SOCIETY">Specific Society</option>
                               <option value="LOCALITY">Locality / City</option>
                           </select>
                       </div>

                       {filterMode === 'SOCIETY' && (
                           <div className="animate-in slide-in-from-top-2 duration-300">
                               <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Select Cluster</label>
                               <select 
                                   value={filterParam} 
                                   onChange={(e) => setFilterParam(e.target.value)}
                                   className="w-full bg-black/40 text-sm text-[#14b8a6] p-4 rounded-xl border outline-none font-bold"
                                   style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                               >
                                   <option value="" disabled>Choose a Society...</option>
                                   {Object.values(societies).map(soc => (
                                       <option key={soc.id} value={soc.id}>{soc.name} ({soc.city})</option>
                                   ))}
                               </select>
                           </div>
                       )}

                       {filterMode === 'LOCALITY' && (
                           <div className="animate-in slide-in-from-top-2 duration-300">
                               <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Select Region</label>
                               <select 
                                   value={filterParam} 
                                   onChange={(e) => setFilterParam(e.target.value)}
                                   className="w-full bg-black/40 text-sm text-[#14b8a6] p-4 rounded-xl border outline-none font-bold"
                                   style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                               >
                                   <option value="" disabled>Choose a Locality...</option>
                                   {localities.map(city => (
                                       <option key={city} value={city}>{city}</option>
                                   ))}
                               </select>
                           </div>
                       )}
                  </div>

                  <button 
                      onClick={handleDownloadCSV}
                      disabled={
                          currentUsers.length === 0 || 
                          (filterMode === 'SOCIETY' && !filterParam) || 
                          (filterMode === 'LOCALITY' && !filterParam)
                      }
                      className="w-full py-5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-30 disabled:scale-100 hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(to right, #14b8a6, #0d9488)', color: 'white', boxShadow: '0 8px 32px rgba(20,184,166,0.3)' }}
                  >
                      Generate & Download .CSV
                  </button>
                  <p className="text-[10px] font-bold text-center text-gray-500 mt-4 uppercase tracking-widest">
                      {currentUsers.length} Records matched
                  </p>
              </div>
          </div>
      )}


      <div className="flex-1 ml-64 p-10">
        
        {/* Header */}
        <div className="rounded-3xl p-10 mb-10 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-end gap-6" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.08) 100%)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 pointer-events-none">
            <span className="text-9xl">🌍</span>
          </div>
          <div className="relative z-10 w-full flex flex-col xl:flex-row justify-between xl:items-end gap-8">
             <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: '#14b8a6' }}>System Command Privilege</p>
                <h1 className="text-5xl font-bold tracking-tight mt-2 mb-2">Global Operations</h1>
                <p className="max-w-xl text-sm font-semibold opacity-70 leading-relaxed uppercase tracking-widest mt-6">Overseeing planet-wide metrics and localized deployment clusters.</p>
             </div>
             <div className="flex flex-wrap gap-4 relative z-10">
                 <div className="px-6 py-4 rounded-xl border bg-black/20 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                     <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Total Network Waste</p>
                     <p className="text-2xl font-bold text-white">{totalWaste.toFixed(1)} KG</p>
                 </div>
                 <div className="px-6 py-4 rounded-xl border bg-black/20 backdrop-blur-sm" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                     <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Active Clusters</p>
                     <p className="text-2xl font-bold text-white">{activeSocietiesCount}</p>
                 </div>
                 <button 
                     onClick={() => setIsModalOpen(true)}
                     className="px-8 py-4 rounded-xl border font-bold text-xs uppercase tracking-widest cursor-pointer transition-all hover:bg-white/10"
                     style={{ borderColor: 'rgba(20,184,166,0.4)', backgroundColor: 'rgba(20,184,166,0.1)' }}
                 >
                     Export Data ⬇️
                 </button>
             </div>
          </div>
        </div>

        {/* Analytics Top Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Roles Distribution Pie Chart */}
            <div className="p-8 rounded-2xl border flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex-1">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Demographics Map</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#14b8a6]"></span>
                            <span className="text-[9px] font-bold uppercase text-gray-400">Assigned Residents</span>
                            <span className="text-xs font-bold text-white ml-auto">{residentPct.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                            <span className="text-[9px] font-bold uppercase text-gray-400">Society Admins</span>
                            <span className="text-xs font-bold text-white ml-auto">{sysAdminPct.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
                            <span className="text-[9px] font-bold uppercase text-gray-400">Super Admins</span>
                            <span className="text-xs font-bold text-white ml-auto">{superPct.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                            <span className="text-[9px] font-bold uppercase text-gray-400">Banned/Suspended</span>
                            <span className="text-xs font-bold text-white ml-auto">{bannedPct.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-600"></span>
                            <span className="text-[9px] font-bold uppercase text-gray-400">Unassigned</span>
                        </div>
                    </div>
                </div>
                <div className="relative w-40 h-40 shrink-0 ml-10">
                    <div className="w-full h-full rounded-full shadow-2xl relative" style={{
                        background: `conic-gradient(
                            #14b8a6 0% ${p1}%, 
                            #f59e0b ${p1}% ${p2}%, 
                            #3b82f6 ${p2}% ${p3}%,
                            #ef4444 ${p3}% ${p4}%,
                            #4b5563 ${p4}% 100%
                        )`
                    }}></div>
                    <div className="absolute inset-[25%] bg-[#0a0a0a] rounded-full flex items-center justify-center flex-col">
                        <span className="text-xs font-bold text-white">{totalUsers}</span>
                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">Users</span>
                    </div>
                </div>
            </div>

            {/* Top Societies Output Bar Chart */}
            <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Top Generating Clusters</h3>
                 {topSocieties.length === 0 ? (
                      <p className="text-xs font-bold uppercase text-gray-600 tracking-widest">No society data compiled.</p>
                 ) : (
                     <div className="space-y-4">
                         {topSocieties.map((soc, idx) => (
                             <div key={idx} className="relative">
                                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white mb-2 relative z-10">
                                     <span className="truncate max-w-[200px]">{soc.name}</span>
                                     <span className="text-[#14b8a6]">{soc.waste.toFixed(1)} KG</span>
                                 </div>
                                 <div className="h-2 w-full rounded-full overflow-hidden bg-white/5 relative">
                                     <div 
                                         className="h-full rounded-full transition-all duration-1000 bg-[#14b8a6]"
                                         style={{ width: `${(soc.waste / maxSocietyWaste) * 100}%` }}
                                     ></div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </div>
        </div>

        {/* Global Registry Grid */}
        <div className="p-8 rounded-2xl border flex-1 block" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between items-end mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Live Registry & Operations</h3>
                <span className="text-[10px] font-bold uppercase text-gray-500 bg-white/5 px-3 py-1 rounded-lg">Showing {Math.min(100, users.length)} / {users.length} Users</span>
            </div>
            
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr>
                            <th className="pb-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest pr-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>User / Identity</th>
                            <th className="pb-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest pr-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>Impact</th>
                            <th className="pb-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest pr-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>Status</th>
                            <th className="pb-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest pr-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>Assigned Cluster / City</th>
                            <th className="pb-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>Remote Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.slice(0, 100).map((user) => {
                            const soc = user.societyId ? societies[user.societyId] : null;
                            const isSelf = user.id === auth.currentUser?.uid;

                            return (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 pr-6">
                                        <div className="font-bold text-sm text-white">{user.name || 'Anonymous Protocol'}</div>
                                    </td>
                                    <td className="py-4 pr-6">
                                        <div className="text-sm font-bold text-[#14b8a6]">{user.totalWasteKg?.toFixed(1) || 0} KG</div>
                                    </td>
                                    <td className="py-4 pr-6">
                                        <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md ${
                                            user.role === 'super_admin' ? 'bg-teal-500/10 text-teal-500' :
                                            user.role === 'society_admin' ? 'bg-amber-500/10 text-amber-500' : 
                                            user.role === 'banned' ? 'bg-red-500/10 text-red-500' :
                                            'bg-white/5 text-gray-400'
                                        }`}>
                                            {user.role === 'society_admin' ? 'Secretary' : user.role || 'Resident'}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-6">
                                        {soc ? (
                                            <div>
                                                <p className="text-sm font-bold text-white">{soc.name}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#14b8a6] mt-0.5">{soc.city}</p>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] font-bold uppercase text-red-500/80 tracking-widest bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">Unassigned Orbit</span>
                                        )}
                                    </td>

                                    {/* Remote Operations Column */}
                                    <td className="py-4">
                                        {isSelf ? (
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-600 bg-white/5 px-3 py-1 rounded-full">God-Mode Access Safe</span>
                                        ) : (
                                            <div className="flex gap-2 opacity-10 lg:opacity-30 group-hover:opacity-100 transition-opacity">
                                                {/* Promote / Demote */}
                                                {user.role !== 'super_admin' ? (
                                                     <button 
                                                        onClick={() => handleRoleChange(user.id, 'super_admin')}
                                                        className="px-3 py-1 bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-[#3b82f6]/20 transition-colors"
                                                        title="Promote to Global Admin"
                                                     >Promote</button>
                                                ) : (
                                                     <button 
                                                        onClick={() => handleRoleChange(user.id, 'resident')}
                                                        className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                                                        title="Revoke Global Privilege"
                                                     >Demote</button>
                                                )}

                                                {/* Ban / Restore */}
                                                {user.role !== 'banned' ? (
                                                      <button 
                                                        onClick={() => handleRoleChange(user.id, 'banned')}
                                                        className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-colors"
                                                        title="Suspend Account"
                                                     >Ban</button>
                                                ) : (
                                                      <button 
                                                        onClick={() => handleRoleChange(user.id, 'resident')}
                                                        className="px-3 py-1 bg-teal-500/10 text-teal-500 border border-teal-500/20 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-teal-500/20 transition-colors"
                                                        title="Restore Account"
                                                     >Restore</button>
                                                )}

                                                {/* Wipe Data */}
                                                <button 
                                                    onClick={() => handleWipeData(user.id)}
                                                    className="px-3 py-1 bg-white/5 text-gray-400 border border-white/10 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                                                    title="Reset XP and Waste data to 0"
                                                >Wipe</button>

                                                {/* Hard Delete */}
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md text-[8px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                                                    title="Permanently Delete Document"
                                                >Delete</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {currentUsers.length > 100 && (
                    <div className="text-center pt-8">
                        <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest bg-amber-500/10 inline-block px-4 py-2 rounded-xl border border-amber-500/20">
                            Showing top 100 records in UI. Use CSV extract to view all.
                        </p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdmin;
