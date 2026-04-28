import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TopNav from "../components/TopNav";
import { useNotification } from '../context/NotificationContext';

const SuperAdmin = () => {
  const { showConfirm, showAlert, showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [societies, setSocieties] = useState({});
  const [localities, setLocalities] = useState([]);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState('WASTE_DESC'); 
  const [filterMode, setFilterMode] = useState('ALL'); 
  const [filterParam, setFilterParam] = useState(''); 

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
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

  // --- Broadcast System ---
  const handleBroadcast = async () => {
    const confirmed = await showConfirm({
      title: "Confirm Broadcast",
      message: "CRITICAL: This will send a notification to EVERY user in the network. Proceed?",
      confirmLabel: "DISPATCH",
      type: "warning"
    });
    if (!confirmed) return;

    setIsBroadcasting(true);
    try {
      await addDoc(collection(db, "system_broadcasts"), {
        title: broadcastTitle,
        message: broadcastMessage,
        timestamp: serverTimestamp(),
        sender: auth.currentUser.uid
      });
      
      showToast("Broadcast Payload Dispatched! 🚀");
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err) {
      showToast("Broadcast Failure: Protocol Interrupted.", "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // --- Filtering & Search ---
  const filteredUsers = users.filter(user => {
    const searchStr = `${user.name} ${user.email} ${user.role} ${user.societyId}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    
    if (filterMode === 'ALL') return matchesSearch;
    if (filterMode === 'UNASSIGNED') return !user.societyId && matchesSearch;
    if (filterMode === 'RESIDENT') return (user.role === 'resident' || !user.role) && matchesSearch;
    if (filterMode === 'SOCIETY') return user.societyId === filterParam && matchesSearch;
    if (filterMode === 'LOCALITY') {
      if (!user.societyId) return false; 
      const soc = societies[user.societyId];
      return soc && soc.city && soc.city.toUpperCase() === filterParam && matchesSearch;
    }
    return matchesSearch;
  }).sort((a, b) => {
    if (sortConfig === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
    if (sortConfig === 'WASTE_DESC') return (b.totalWasteKg || 0) - (a.totalWasteKg || 0);
    if (sortConfig === 'ROLE') return (a.role || 'resident').localeCompare(b.role || 'resident');
    return 0;
  });

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Waste(KG)', 'UID', 'SocietyID'];
    const rows = filteredUsers.map(u => [
      u.name || 'N/A',
      u.email || 'N/A',
      u.role || 'resident',
      u.totalWasteKg || 0,
      u.id,
      u.societyId || 'None'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compostmate_registry_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast("Matrix Downloaded Successfully");
  };

  const handleRoleChange = async (userId, targetRole) => {
    if (userId === auth.currentUser.uid) {
        showAlert({ title: "Denied", message: "Action Denied: You cannot mutate your own God-Mode session." });
        return;
    }
    const confirmed = await showConfirm({
      title: "Update Privilege",
      message: `Are you sure you want to transition this user to ${targetRole.toUpperCase()}?`,
      confirmLabel: "UPDATE"
    });
    if (confirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { role: targetRole });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
        showToast("User role updated successfully");
      } catch(err) {
        showToast("Failed to update user privilege scope.", "error");
      }
    }
  };

  const handleWipeData = async (userId) => {
    const confirmed = await showConfirm({
      title: "Data Wipe Protocol",
      message: "WARNING: Erase this user's logging history (XP, Waste, Streak = 0)?",
      confirmLabel: "WIPE DATA",
      type: "danger"
    });
    if (confirmed) {
      try {
        await updateDoc(doc(db, "users", userId), { totalWasteKg: 0, xp: 0, streak: 0 });
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, totalWasteKg: 0, xp: 0, streak: 0 } : u));
        showToast("User history erased");
      } catch(err) {
        showToast("Failed to execute data wipe protocol.", "error");
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === auth.currentUser.uid) {
        showAlert({ title: "Denied", message: "Action Denied: You cannot delete your own session." });
        return;
    }
    const confirmed = await showConfirm({
      title: "Terminal Deletion",
      message: "CRITICAL: Permanently delete this user from the registry?",
      confirmLabel: "DELETE USER",
      type: "danger"
    });
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "users", userId));
        setUsers(prev => prev.filter(u => u.id !== userId));
        showToast("User document terminated");
      } catch(err) {
        showToast("Deletion payload failed.", "error");
      }
    }
  };

  // --- Analytical Calculations ---
  const totalWaste = users.reduce((sum, u) => sum + (u.totalWasteKg || 0), 0);
  const carbonOffset = (totalWaste * 0.5).toFixed(1); // 0.5kg CO2 per kg waste offset (approx)
  
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#14b8a6]">Connecting to Command Center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
      <TopNav />
      
      <div className="pt-24 px-6 lg:px-12 pb-10 flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
        
        {/* TOP COMMAND HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight uppercase mb-2">Global Command</h1>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280]">System Status: Operational</p>
            </div>
          </div>

          <div className="flex bg-[#111] p-1 rounded-2xl border border-white/5">
            {[
              { id: 'DASHBOARD', label: 'Intelligence', icon: '📊' },
              { id: 'USERS', label: 'Registry', icon: '👥' },
              { id: 'BROADCAST', label: 'Operations', icon: '🛰️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-[#14b8a6] text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Network Waste", value: `${totalWaste.toFixed(1)} KG`, sub: "Total Diverted", icon: "🌍", color: "#14b8a6" },
                { label: "Carbon Offset", value: `${carbonOffset} KG`, sub: "CO2 Equivalent", icon: "🌱", color: "#22c55e" },
                { label: "Global Users", value: users.length, sub: "Active Nodes", icon: "👥", color: "#3b82f6" },
                { label: "Active Clusters", value: Object.keys(societies).length, sub: "Registered Societies", icon: "🏢", color: "#f59e0b" }
              ].map((m, i) => (
                <div key={i} className="p-8 rounded-3xl border border-white/5 bg-[#111] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="text-6xl">{m.icon}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{m.label}</p>
                  <p className="text-4xl font-bold text-white tracking-tighter mb-1">{m.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: m.color }}>{m.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Regional Leaders */}
              <div className="p-10 rounded-3xl border border-white/5 bg-[#111]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-8">Regional Impact Clusters</h3>
                <div className="space-y-6">
                  {topSocieties.map((soc, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-300">{soc.name}</span>
                        <span className="text-xs font-bold text-[#14b8a6]">{soc.waste.toFixed(1)} KG</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-full transition-all duration-1000" 
                          style={{ width: `${(soc.waste / maxSocietyWaste) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Network Demographics */}
              <div className="p-10 rounded-3xl border border-white/5 bg-[#111] flex flex-col justify-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-8 text-center">Identity Spectrum</h3>
                <div className="flex flex-wrap justify-center gap-10">
                  <div className="relative w-40 h-40">
                    <div className="w-full h-full rounded-full border-8 border-teal-500/10 flex items-center justify-center flex-col">
                      <span className="text-4xl font-bold text-white tracking-tighter">{users.length}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mt-1">Total Nodes</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Residents", count: users.filter(u => u.role === 'resident' || !u.role).length, color: "#14b8a6" },
                      { label: "Secretaries", count: users.filter(u => u.role === 'society_admin').length, color: "#f59e0b" },
                      { label: "Admins", count: users.filter(u => u.role === 'super_admin').length, color: "#3b82f6" },
                      { label: "Suspended", count: users.filter(u => u.role === 'banned').length, color: "#ef4444" }
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-24">{d.label}</span>
                        <span className="text-xs font-bold text-white">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS REGISTRY TAB */}
        {activeTab === 'USERS' && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="flex-1 relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111] border border-white/5 text-white py-5 pl-16 pr-8 rounded-2xl outline-none focus:border-[#14b8a6]/50 transition-all font-semibold"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                {/* Mode Filter */}
                <select 
                  value={filterMode}
                  onChange={(e) => { setFilterMode(e.target.value); setFilterParam(''); }}
                  className="bg-[#111] border border-white/5 text-white px-5 py-4 rounded-xl outline-none font-bold text-[9px] uppercase tracking-widest cursor-pointer hover:border-teal-500/30 transition-all"
                >
                  <option value="ALL">All Users</option>
                  <option value="UNASSIGNED">Solo Users (Unassigned)</option>
                  <option value="RESIDENT">Residents Only</option>
                  <option value="LOCALITY">Locality Wise</option>
                  <option value="SOCIETY">By Society</option>
                </select>

                {/* Sub-Filter Parameter (Localities or Societies) */}
                {(filterMode === 'LOCALITY' || filterMode === 'SOCIETY') && (
                  <select 
                    value={filterParam}
                    onChange={(e) => setFilterParam(e.target.value)}
                    className="bg-[#111] border border-teal-500/20 text-teal-400 px-5 py-4 rounded-xl outline-none font-bold text-[9px] uppercase tracking-widest cursor-pointer animate-in fade-in slide-in-from-left-2"
                  >
                    <option value="">Select {filterMode === 'LOCALITY' ? 'City' : 'Society'}...</option>
                    {filterMode === 'LOCALITY' ? 
                      localities.map(loc => <option key={loc} value={loc}>{loc}</option>) :
                      Object.values(societies).map(soc => <option key={soc.id} value={soc.id}>{soc.name}</option>)
                    }
                  </select>
                )}

                {/* Sorting */}
                <select 
                  value={sortConfig}
                  onChange={(e) => setSortConfig(e.target.value)}
                  className="bg-[#111] border border-white/5 text-white px-5 py-4 rounded-xl outline-none font-bold text-[9px] uppercase tracking-widest cursor-pointer hover:border-teal-500/30 transition-all"
                >
                  <option value="WASTE_DESC">Top Waste</option>
                  <option value="NAME_ASC">Name (A-Z)</option>
                  <option value="ROLE">Role</option>
                </select>

                <button 
                  onClick={downloadCSV}
                  className="px-6 py-4 bg-[#14b8a6] rounded-xl text-[9px] font-bold uppercase tracking-widest text-white hover:brightness-110 shadow-lg shadow-teal-900/20 transition-all flex items-center gap-2"
                >
                  <span>Export</span> ⬇️
                </button>
              </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Node Identity</th>
                      <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Contact Email</th>
                      <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Status</th>
                      <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Waste Log</th>
                      <th className="px-8 py-6 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.slice(0, 50).map(user => {
                      const isSelf = user.id === auth.currentUser?.uid;
                      return (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="font-bold text-white mb-1">{user.name || 'Anonymous Node'}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">UID: {user.id.slice(0,8)}...</div>
                          </td>
                          <td className="px-8 py-6 text-sm font-semibold text-gray-400">{user.email}</td>
                          <td className="px-8 py-6">
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                              user.role === 'super_admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              user.role === 'society_admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              user.role === 'banned' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                            }`}>
                              {user.role || 'Resident'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="font-bold text-white text-lg">{user.totalWasteKg?.toFixed(1) || 0}</div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">KG Diverted</div>
                          </td>
                          <td className="px-8 py-6">
                            {isSelf ? (
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 italic">Self Privilege Active</span>
                            ) : (
                              <div className="flex gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleRoleChange(user.id, 'super_admin')} className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-500 text-xs" title="Make SuperAdmin">🛰️</button>
                                <button onClick={() => handleRoleChange(user.id, 'society_admin')} className="p-2 hover:bg-amber-500/10 rounded-lg text-amber-500 text-xs" title="Make Secretary">🏢</button>
                                <button onClick={() => handleRoleChange(user.id, 'banned')} className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 text-xs" title="Suspend">🚫</button>
                                <button onClick={() => handleWipeData(user.id)} className="p-2 hover:bg-gray-500/10 rounded-lg text-gray-400 text-xs" title="Wipe Stats">🧼</button>
                                <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-600 text-xs" title="Delete">🗑️</button>
                              </div>
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

        {/* BROADCAST TAB */}
        {activeTab === 'BROADCAST' && (
          <div className="max-w-3xl mx-auto w-full animate-in zoom-in-95 duration-500">
            <div className="bg-[#111] border border-white/5 rounded-3xl p-10">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase mb-8 flex items-center gap-4">
                <span className="text-2xl">🛰️</span> System Broadcast Protocol
              </h2>
              <p className="text-xs font-semibold text-gray-500 leading-relaxed mb-10 uppercase tracking-widest">
                Sending a broadcast will trigger a push notification and in-app alert to every user globally. Use for critical updates or maintenance alerts only.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Broadcast Heading</label>
                  <input
                    type="text"
                    placeholder="e.g. SYSTEM MAINTENANCE"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white p-5 rounded-2xl outline-none focus:border-teal-500/50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">Announcement Content</label>
                  <textarea
                    rows="4"
                    placeholder="Detail the update or system message here..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white p-6 rounded-2xl outline-none focus:border-teal-500/50 font-medium resize-none"
                  ></textarea>
                </div>
                
                <button
                  onClick={handleBroadcast}
                  disabled={isBroadcasting || !broadcastTitle || !broadcastMessage}
                  className="w-full py-6 rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 disabled:scale-100 hover:scale-[1.02] mt-4"
                  style={{ background: 'linear-gradient(to right, #14b8a6, #0d9488)', color: 'white', boxShadow: '0 8px 32px rgba(20,184,166,0.3)' }}
                >
                  {isBroadcasting ? "DISPATCHING PROTOCOL..." : "INITIATE GLOBAL BROADCAST"}
                </button>
              </div>
            </div>
            
            {/* Maintenance Shortcuts */}
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-8 rounded-3xl border border-white/5 bg-[#111] hover:border-teal-500/30 transition-all cursor-pointer">
                <span className="text-2xl mb-4 block">🧹</span>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-1">Clear App Cache</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Force all clients to refresh</p>
              </div>
              <div className="p-8 rounded-3xl border border-white/5 bg-[#111] hover:border-teal-500/30 transition-all cursor-pointer">
                <span className="text-2xl mb-4 block">🔌</span>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white mb-1">Service Mode</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase">Toggle Maintenance Splash</p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SuperAdmin;
