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
import Sidebar from "../components/Sidebar";
import { useNotification } from "../context/NotificationContext";

const AdminDashboard = () => {
  const { showToast, showModal } = useNotification();
  const [activeTab, setActiveTab] = useState('Overview');
  const [userData, setUserData] = useState(null);
  const [society, setSociety] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountNote, setDiscountNote] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const checkRoleAndFetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/");
        return;
      }

      const role = await getUserRole(user.uid);
      if (role !== "society_admin" && role !== "super_admin") {
        navigate("/dashboard");
        return;
      }

      try {
        // Fetch Admin Data
        const adminSnap = await getDoc(doc(db, "users", user.uid));
        if (adminSnap.exists()) {
          const adminData = adminSnap.data();
          setUserData(adminData);

          if (adminData.societyId) {
            // Fetch Society Data
            const socSnap = await getDoc(doc(db, "societies", adminData.societyId));
            if (socSnap.exists()) setSociety(socSnap.data());

            // Fetch Members
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
      // 1. Write to discounts collection
      await addDoc(collection(db, "discounts"), {
        userId: selectedMember.id,
        societyId: userData.societyId,
        percent: Number(discountPercent),
        note: discountNote,
        setBy: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // 2. Update User document
      await updateDoc(doc(db, "users", selectedMember.id), {
        discount: Number(discountPercent),
        discountNote: discountNote
      });

      // Update local state
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
        // In a real app, we'd fetch all logs for these users. 
        // For now, let's fetch the last 100 logs in the society if they exist
        // or just generate from member summaries. 
        // The user specifically asked for wasteLogs where userId in memberIds.
        
        // Since we don't have a global wasteLogs yet (we have users/{uid}/logs), 
        // we'd need a collectionGroup or a flattened logs collection. 
        // If it's the sub-collection pattern, we iterate.
        
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

  if (loading && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse text-xl uppercase tracking-widest">Admin Access...</div>
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
              <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-black/5 hover:scale-[1.02] transition-transform duration-300">
                <div className="text-3xl mb-4">{stat.icon}</div>
                <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
              </div>
            ))}
          </div>
        );
      case 'Members':
        return (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Resident</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Stats / Contribution</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Benefit</th>
                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50/30 transition-all group">
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-[#1A5C38] font-black text-lg overflow-hidden border border-gray-100">
                            {member.profilePic ? (
                              <img src={member.profilePic} className="w-full h-full object-cover" alt={member.name} />
                            ) : (
                              member.name?.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-gray-900 text-sm tracking-tight">{member.name}</p>
                              {member.flatNumber && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[8px] font-black text-gray-400 border border-gray-50 uppercase tracking-widest">
                                  {member.flatNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center">
                        <p className="font-black text-sm text-gray-900">{member.xp || 0} <span className="text-[10px] text-gray-400 uppercase ml-1">XP</span></p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{(member.totalWasteKg || 0).toFixed(1)} kg logged</p>
                      </td>
                      <td className="px-10 py-8 text-center">
                        {member.discount > 0 ? (
                            <div className="inline-flex items-baseline gap-1 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                                <span className="text-lg font-black text-[#1A5C38]">{member.discount}</span>
                                <span className="text-[10px] font-black text-[#1A5C38]">%</span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Perk</span>
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
                          className="px-6 py-3 rounded-xl bg-[#1A5C38] text-white font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-900/10 cursor-pointer"
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
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-black/5 p-4 md:p-10">
            {/* Same leaderboard code as before ... */}
            <div className="space-y-4">
                {members.sort((a,b) => (b.xp || 0) - (a.xp || 0)).map((m, i) => (
                   <div key={m.id} className="flex items-center justify-between p-8 hover:bg-[#F9FBF9] rounded-[32px] transition-all border border-transparent hover:border-gray-100 group">
                      <div className="flex items-center gap-8">
                        <span className={`text-3xl font-black ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-100'}`}>
                            {(i+1).toString().padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-center text-xl font-black text-[#1A5C38] overflow-hidden">
                                {m.profilePic ? (
                                    <img src={m.profilePic} className="w-full h-full object-cover" alt={m.name} />
                                ) : (
                                    m.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <p className="font-black text-gray-900 text-lg tracking-tight leading-none mb-2">{m.name}</p>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-green-50 rounded-lg text-[10px] font-black text-[#1A5C38] uppercase tracking-widest">{m.xp || 0} XP</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{(m.totalWasteKg || 0).toFixed(1)} kg diverted</span>
                                </div>
                            </div>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1 text-center">Reward</p>
                        <div className={`px-5 py-2 rounded-xl font-black text-sm ${m.discount > 0 ? 'bg-[#1A5C38] text-white shadow-lg shadow-green-900/10' : 'bg-gray-50 text-gray-300'}`}>
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
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-black/5 p-20 text-center relative overflow-hidden group">
             {/* Decor */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-1000"></div>
             
             <div className="max-w-md mx-auto relative z-10">
                <div className="w-24 h-24 bg-green-50 rounded-[32px] flex items-center justify-center text-4xl mx-auto mb-10 shadow-sm border border-green-100">📊</div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-4 uppercase">Society Ledger</h3>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-12 leading-relaxed px-6">
                    Generate a full CSV audit of all waste logs within {society?.name}. Essential for building records and zero-waste compliance.
                </p>
                <button 
                    onClick={exportCSV}
                    className="w-full py-6 rounded-2xl bg-[#1A5C38] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-3"
                >
                    Export Society Data (CSV) 📥
                </button>
             </div>
          </div>
        );
      case 'Settings':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white p-12 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Update Cluster Profile</h3>
                <div className="space-y-6">
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Society Name</label>
                      <input 
                         type="text" 
                         value={society?.name || ""} 
                         onChange={async (e) => {
                            const newName = e.target.value;
                            setSociety(prev => ({ ...prev, name: newName }));
                            await updateDoc(doc(db, "societies", userData.societyId), { name: newName });
                         }}
                         className="w-full bg-[#F9FBF9] border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 focus:border-[#1A5C38] transition-all outline-none"
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest ml-1">Location / City</label>
                      <input 
                         type="text" 
                         value={society?.city || ""} 
                         onChange={async (e) => {
                            const newCity = e.target.value;
                            setSociety(prev => ({ ...prev, city: newCity }));
                            await updateDoc(doc(db, "societies", userData.societyId), { city: newCity });
                         }}
                         className="w-full bg-[#F9FBF9] border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-gray-700 focus:border-[#1A5C38] transition-all outline-none"
                      />
                   </div>
                </div>
                <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                   Changes are saved automatically to the cloud ledger.
                </p>
             </div>

             <div className="bg-white p-12 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-10">Invite new residents to join your building's composting cluster</p>
                <div className="bg-[#F9FBF9] p-8 rounded-[32px] border border-gray-100 flex flex-col items-center justify-center mb-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Unique 6-Digit Code</p>
                    <p className="text-4xl font-black text-[#1A5C38] tracking-[0.3em] mb-4 bg-white px-6 py-3 rounded-2xl shadow-sm">{society?.inviteCode}</p>
                </div>
                <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm inline-block mx-auto mb-6">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=COMPOSTMATE-${society?.inviteCode}`} 
                      alt="QR Code"
                      className="w-32 h-32"
                    />
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(society?.inviteCode);
                    showToast("Invite code copied! 📋");
                  }}
                  className="block w-full text-[10px] font-black text-[#1A5C38] border-2 border-[#1A5C38]/5 bg-[#1A5C38]/5 py-4 rounded-xl uppercase tracking-widest hover:bg-[#1A5C38]/10 transition-all cursor-pointer"
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
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBF9' }}>
      <Sidebar />
      
      <div className="ml-64 p-10 min-h-screen">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Secretary Dashboard</h1>
            <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-widest leading-relaxed">
                Managing {society?.name || "Society"} • {society?.city || "City"}
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></div>
             <div className="px-4 py-2 bg-green-50 rounded-xl">
                <span className="text-[#1A5C38] font-black text-[10px] uppercase tracking-widest">Admin Control Active</span>
             </div>
          </div>
        </div>

        {/* Custom Admin Nav (Dashboard Control Center Style) */}
        <div className="flex gap-3 mb-12 overflow-x-auto pb-2 scrollbar-hide">
          {['Overview', 'Members', 'Leaderboard', 'Reports', 'Settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap shadow-sm border ${
                activeTab === tab 
                  ? 'bg-[#1A5C38] text-white border-[#1A5C38] shadow-green-900/10' 
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {renderTabContent()}
        </div>

        {/* Discount Modal (Dashboard UI style) */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-12 border border-gray-50 animate-in zoom-in-95 duration-300">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-green-100 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">🎁</div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Set Member Reward</h2>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2 px-10">Resident: {selectedMember?.name}</p>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Maintenance Discount %</label>
                        <div className="relative">
                            <input 
                                type="number"
                                min="0"
                                max="100"
                                value={discountPercent}
                                onChange={(e) => setDiscountPercent(e.target.value)}
                                className="w-full bg-[#F9FBF9] border-2 border-gray-50 rounded-2xl px-8 py-5 text-2xl font-black text-[#1A5C38] outline-none focus:border-[#1A5C38] transition-all"
                            />
                            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-2xl font-black text-[#1A5C38] opacity-50">%</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Reason / Note</label>
                        <textarea 
                            value={discountNote}
                            onChange={(e) => setDiscountNote(e.target.value)}
                            placeholder="e.g. Excellent waste segregation consistency"
                            className="w-full bg-[#F9FBF9] border-2 border-gray-50 rounded-2xl px-8 py-5 text-sm font-bold text-gray-700 outline-none focus:border-[#1A5C38] transition-all h-32 resize-none"
                        />
                    </div>
                    
                    <div className="flex gap-4 pt-6">
                        <button 
                            onClick={() => setShowDiscountModal(false)}
                            className="flex-1 py-5 rounded-2xl border-2 border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSetDiscount}
                            className="flex-1 py-5 rounded-2xl bg-[#1A5C38] text-white font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-green-900/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
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
