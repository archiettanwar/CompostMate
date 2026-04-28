import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, getUserRole } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import TopNav from "../components/TopNav";
import { useNotification } from "../context/NotificationContext";

const AdminDashboard = () => {
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState('Overview');
  const [userData, setUserData] = useState(null);
  const [society, setSociety] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountNote, setDiscountNote] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRoleAndFetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/auth");
        return;
      }

      const role = await getUserRole(user.uid);
      if (role !== "society_admin" && role !== "super_admin") {
        navigate("/dashboard");
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, "users", user.uid));
        if (adminSnap.exists()) {
          const adminData = adminSnap.data();
          setUserData(adminData);

          if (adminData.societyId) {
            const socSnap = await getDoc(doc(db, "societies", adminData.societyId));
            if (socSnap.exists()) setSociety(socSnap.data());

            const q = query(collection(db, "users"), where("societyId", "==", adminData.societyId));
            const memberSnaps = await getDocs(q);
            const memberList = memberSnaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(memberList);
          }
        }
      } catch (err) {
        console.error("Admin Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkRoleAndFetchData();
  }, [navigate]);

  const handleSetDiscount = async () => {
    if (!selectedMember || loading) return;
    setLoading(true);

    try {
      await addDoc(collection(db, "discounts"), {
        userId: selectedMember.id,
        societyId: userData.societyId,
        percent: Number(discountPercent),
        note: discountNote,
        setBy: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, "users", selectedMember.id), {
        discount: Number(discountPercent),
        discountNote: discountNote
      });

      setMembers(prev => prev.map(m => 
        m.id === selectedMember.id 
          ? { ...m, discount: Number(discountPercent), discountNote: discountNote } 
          : m
      ));

      showToast(`Discount set for ${selectedMember.name}! 🎁`);
      setShowDiscountModal(false);
      setSelectedMember(null);
      setDiscountNote("");
      setDiscountPercent(0);
    } catch (err) {
      console.error("Discount Error:", err);
      showToast("Failed to set discount.", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
        setLoading(true);
        let csvContent = "Member Name,Date,Greens (kg),Browns (kg),C:N Ratio,Status,XP Awarded\n";
        
        for (const member of members) {
             const logsRef = collection(db, "users", member.id, "logs");
             const logSnaps = await getDocs(logsRef);
             logSnaps.forEach(logDoc => {
                 const log = logDoc.data();
                 csvContent += `${member.name},${new Date(log.timestamp?.seconds * 1000).toLocaleDateString()},${log.greens},${log.browns},${log.cnRatio},${log.verified ? 'Verified' : 'Pending'},${log.xpAwarded || 0}\n`;
             });
        }

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `compostmate-${society?.name || 'report'}.csv`;
        a.click();
    } catch (err) {
        console.error("Export Error:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() || members.length === 0) return;
    setIsBroadcasting(true);
    
    try {
      // Import sequentially instead of dynamically grouping batch, 
      // Firestore batch limit is 500 which is plenty for our small society
      const { writeBatch, collection, serverTimestamp } = await import('firebase/firestore');
      const batch = writeBatch(db);
      
      members.forEach((member) => {
        const notifRef = doc(collection(db, "users", member.id, "notifications"));
        batch.set(notifRef, {
          type: 'admin',
          title: '📢 Secretary Broadcast',
          message: broadcastMessage,
          timestamp: serverTimestamp(),
          read: false
        });
      });
      
      await batch.commit();
      showToast('Broadcast sent successfully to all members! 📢');
      setBroadcastMessage("");
    } catch (err) {
      console.error("Broadcast error:", err);
      showToast("Failed to send broadcast.", "error");
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (loading && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase" style={{ color: '#22c55e' }}>Admin Access...</div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'Overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: "Total Members", value: members.length, icon: "👥" },
              { label: "Waste Diverted", value: `${members.reduce((acc, m) => acc + (m.totalWasteKg || 0), 0).toFixed(1)}kg`, icon: "⚖️" },
              { label: "Active This Week", value: members.length, icon: "🔥" },
              { label: "Discounts Given", value: members.filter(m => m.discount > 0).length, icon: "🎁" }
            ].map((stat, i) => (
              <div key={i} className="p-8 rounded-2xl transition-all group" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="text-2xl mb-4 grayscale group-hover:grayscale-0 transition-all">{stat.icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
              </div>
            ))}
            
            {/* Broadcast Widget */}
            <div className="md:col-span-2 lg:col-span-4 mt-8 rounded-2xl p-8" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
               <h3 className="text-xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>📢 Society Broadcast</h3>
               <p className="text-[10px] font-bold uppercase tracking-widest mb-6" style={{ color: '#f59e0b' }}>Send a real-time push alert to every member's inbox</p>
               <div className="flex flex-col md:flex-row gap-4">
                 <input 
                   type="text" 
                   value={broadcastMessage}
                   onChange={(e) => setBroadcastMessage(e.target.value)}
                   disabled={isBroadcasting}
                   placeholder="e.g. Please secure your bins, heavy rain expected tomorrow..."
                   className="flex-1 rounded-xl px-6 py-4 font-bold outline-none transition-all"
                   style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                 />
                 <button 
                   onClick={handleBroadcast}
                   disabled={isBroadcasting || !broadcastMessage.trim()}
                   className="px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                   style={{ background: 'linear-gradient(to right, #f59e0b, #d97706)', color: 'white', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}
                 >
                   {isBroadcasting ? 'Broadcasting...' : 'Blast Alert 🚀'}
                 </button>
               </div>
            </div>
          </div>
        );
      case 'Members':
        return (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                    <th className="px-10 py-6 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-[var(--color-border)]">Resident</th>
                    <th className="px-10 py-6 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-[var(--color-border)] text-center">Stats / Contribution</th>
                    <th className="px-10 py-6 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-[var(--color-border)] text-center">Benefit</th>
                    <th className="px-10 py-6 text-[9px] font-bold text-gray-500 uppercase tracking-widest border-b border-[var(--color-border)] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-white/5 transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden shrink-0" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                            {member.profilePic ? (
                              <img src={member.profilePic} className="w-full h-full object-cover" alt={member.name} />
                            ) : (
                              <span className="opacity-40" style={{ color: 'var(--color-text-primary)' }}>{member.name?.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-bold text-sm tracking-tight uppercase truncate" style={{ color: 'var(--color-text-primary)' }}>{member.name}</p>
                              {member.flatNumber && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                                  {member.flatNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--color-text-muted)' }}>{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <p className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{member.xp || 0} <span className="text-[9px] uppercase ml-1" style={{ color: 'var(--color-text-muted)' }}>XP</span></p>
                        <p className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--color-text-muted)' }}>{(member.totalWasteKg || 0).toFixed(1)} kg logged</p>
                      </td>
                      <td className="px-10 py-8 text-center">
                        {member.discount > 0 ? (
                            <div className="inline-flex items-baseline gap-1 px-4 py-2 rounded-xl border border-[#22c55e]/20" style={{ backgroundColor: 'rgba(34,197,94,0.05)' }}>
                                <span className="text-lg font-bold text-[#22c55e]">{member.discount}</span>
                                <span className="text-[9px] font-bold text-[#22c55e]">%</span>
                            </div>
                        ) : (
                            <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">No Perk</span>
                        )}
                      </td>
                      <td className="px-10 py-8 text-right">
                        <button 
                          onClick={() => {
                            setSelectedMember(member);
                            setDiscountPercent(member.discount || 0);
                            setDiscountNote(member.discountNote || "");
                            setShowDiscountModal(true);
                          }}
                          className="px-6 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer"
                          style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white' }}
                        >
                          Reward 🎁
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'Leaderboard':
        return (
          <div className="p-10 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="space-y-4">
                {members.sort((a,b) => (b.xp || 0) - (a.xp || 0)).map((m, i) => (
                   <div key={m.id} className="flex items-center justify-between p-6 rounded-2xl transition-all border group" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center gap-8">
                        <span className={`text-2xl font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-orange-500' : 'text-white/10'}`}>
                            {(i+1).toString().padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {m.profilePic ? (
                                    <img src={m.profilePic} className="w-full h-full object-cover" alt={m.name} />
                                ) : (
                                    <span className="text-white opacity-40">{m.name?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-white text-lg tracking-tight uppercase leading-none mb-2">{m.name}</p>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{m.xp || 0} XP</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>{(m.totalWasteKg || 0).toFixed(1)} kg</span>
                                </div>
                            </div>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mb-1 text-center">Benefit</p>
                        <div className={`px-5 py-2 rounded-xl font-bold text-xs ${m.discount > 0 ? 'text-[#22c55e]' : 'text-gray-800'}`} style={{ backgroundColor: m.discount > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)' }}>
                            {m.discount || 0}%
                        </div>
                      </div>
                   </div>
                ))}
            </div>
          </div>
        );
      case 'Reports':
        return (
          <div className="p-20 rounded-2xl text-center relative overflow-hidden group border" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
             <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-5 hover:scale-150 transition-transform duration-1000" style={{ background: '#22c55e' }}></div>
             
             <div className="max-w-md mx-auto relative z-10">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-10 grayscale" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>📊</div>
                <h3 className="text-2xl font-bold text-white tracking-tight mb-4 uppercase">Society Ledger</h3>
                <p className="font-semibold text-[10px] uppercase tracking-widest mb-12 leading-relaxed px-6" style={{ color: '#4b5563' }}>
                    Generate a full CSV audit of all waste logs within {society?.name}. Essential for building records and zero-waste compliance.
                </p>
                <button 
                    onClick={exportCSV}
                    className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-3"
                    style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
                >
                    Export Society Data (CSV) 📥
                </button>
             </div>
          </div>
        );
      case 'Settings':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="p-10 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-8">Cluster Profile</h3>
                <div className="space-y-6">
                   <div>
                      <label className="block text-[9px] font-bold text-gray-600 mb-2 uppercase tracking-widest ml-1">Society Name</label>
                      <input 
                         type="text" 
                         value={society?.name || ""} 
                         onChange={async (e) => {
                            const newName = e.target.value;
                            setSociety(prev => ({ ...prev, name: newName }));
                            await updateDoc(doc(db, "societies", userData.societyId), { name: newName });
                         }}
                         className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white placeholder-gray-800 outline-none transition-all"
                         style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                   </div>
                   <div>
                      <label className="block text-[9px] font-bold text-gray-600 mb-2 uppercase tracking-widest ml-1">Location / City</label>
                      <input 
                         type="text" 
                         value={society?.city || ""} 
                         onChange={async (e) => {
                            const newCity = e.target.value;
                            setSociety(prev => ({ ...prev, city: newCity }));
                            await updateDoc(doc(db, "societies", userData.societyId), { city: newCity });
                         }}
                         className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white placeholder-gray-800 outline-none transition-all"
                         style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                   </div>
                </div>
             </div>

             <div className="p-10 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-6 px-10" style={{ color: '#4b5563' }}>Invite new residents to join your building's composting cluster</p>
                <div className="p-8 rounded-2xl border flex flex-col items-center justify-center mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4">Unique Invite Code</p>
                    <p className="text-4xl font-bold tracking-[0.3em] mb-4 px-6 py-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#22c55e' }}>{society?.inviteCode}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 inline-block mx-auto mb-6">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=COMPOSTMATE-${society?.inviteCode}&bgcolor=000&color=fff`} 
                      alt="QR Code"
                      className="w-24 h-24 invert opacity-80"
                    />
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(society?.inviteCode);
                    showToast("Invite code copied! 📋");
                  }}
                  className="block w-full text-[9px] font-bold py-4 rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#22c55e' }}
                >
                  Copy Code 📋
                </button>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopNav />
      
      <div className="flex-1 pt-24 md:pt-28 p-10 max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase mb-1" style={{ color: 'var(--color-text-primary)' }}>Secretary Cabinet</h1>
            <p className="font-semibold uppercase text-[10px] tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                Managing {society?.name || "Society"} • {society?.city || "City"}
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
             <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#22c55e' }}>Admin Control Active</span>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-3 mb-12 overflow-x-auto pb-2 scrollbar-hide">
          {['Overview', 'Members', 'Leaderboard', 'Reports', 'Settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === tab 
                  ? 'bg-[#22c55e] text-white border-[#22c55e]' 
                  : 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderTabContent()}
        </div>

        {/* Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl p-12 border animate-in zoom-in-95 duration-300" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 grayscale" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>🎁</div>
                    <h2 className="text-2xl font-bold tracking-tight uppercase" style={{ color: 'var(--color-text-primary)' }}>Set Member Reward</h2>
                    <p className="font-semibold text-[10px] uppercase tracking-widest mt-2 px-10" style={{ color: 'var(--color-text-muted)' }}>Resident: {selectedMember?.name}</p>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="block text-[9px] font-bold text-gray-600 mb-3 uppercase tracking-widest ml-1">Maintenance Discount %</label>
                        <div className="relative">
                            <input 
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                                className="w-full rounded-xl px-8 py-5 text-3xl font-bold text-center outline-none transition-all"
                                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#22c55e' }}
                            />
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-bold opacity-20" style={{ color: '#22c55e' }}>%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-600 mb-3 uppercase tracking-widest ml-1">Reason / Note</label>
                        <textarea 
                            value={discountNote}
                            onChange={(e) => setDiscountNote(e.target.value)}
                            placeholder="e.g. Excellent waste segregation consistency"
                            className="w-full rounded-xl px-8 py-5 text-sm font-bold text-white placeholder-gray-800 outline-none transition-all h-32 resize-none"
                            style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                        />
                    </div>
                    
                    <div className="flex gap-4 pt-6">
                        <button 
                            onClick={() => setShowDiscountModal(false)}
                            className="flex-1 py-5 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                            style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', color: '#4b5563' }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSetDiscount}
                            className="flex-1 py-5 rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] transition-all cursor-pointer"
                            style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
                        >
                            Save Reward 🎁
                        </button>
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
