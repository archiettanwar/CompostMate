import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from "../lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Sidebar from "../components/Sidebar";
import { useNotification } from "../context/NotificationContext";
import XPBar from "../components/XPBar";
import { BADGES, checkBadges } from "../lib/badges";
import BadgeCard from "../components/BadgeCard";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [societyName, setSocietyName] = useState("");
  const [isEditingFlat, setIsEditingFlat] = useState(false);
  const [tempFlat, setTempFlat] = useState("");
  const [leaving, setLeaving] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { showToast, showModal } = useNotification();

  const handleUploadDP = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `profilePictures/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateProfile(user, { photoURL: downloadURL });
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });
      setUserData(prev => ({ ...prev, photoURL: downloadURL }));
      showToast("Profile picture updated! ✨");
    } catch (error) {
      console.error("Error uploading DP:", error);
      showToast("Failed to upload image. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = await showModal({
      title: "Delete Account?",
      message: "This action is permanent and will wipe all your waste logs, XP, and badges. Are you absolutely sure?",
      confirmLabel: "Yes, Delete Everything",
      cancelLabel: "No, Keep My Progress"
    });
    if (!confirmDelete) return;
    try {
      const logsRef = collection(db, "users", user.uid, "logs");
      const logsSnap = await getDocs(logsRef);
      const deletePromises = logsSnap.docs.map(logDoc => deleteDoc(logDoc.ref));
      await Promise.all(deletePromises);
      const userRef = doc(db, "users", user.uid);
      await deleteDoc(userRef);
      await user.delete();
      showToast("Account successfully wiped. Goodbye! 👋");
      navigate("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        showToast("Security check: Please relogin to delete account.", "error");
      } else {
        showToast("Failed to delete account.", "error");
      }
    } finally {
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { navigate("/auth"); return; }
      setUser(firebaseUser);
      try {
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setTempFlat(data.flatNumber || "");
          if (data.societyId) {
            const socSnap = await getDoc(doc(db, "societies", data.societyId));
            if (socSnap.exists()) setSocietyName(socSnap.data().name);
          }
        }
      } catch (error) { console.error("Error fetching user data:", error); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleUpdateFlat = async () => {
    if (!tempFlat.trim() || tempFlat === userData.flatNumber) { setIsEditingFlat(false); return; }
    try {
      if (userData.societyId) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("societyId", "==", userData.societyId), where("flatNumber", "==", tempFlat.trim()));
        const snap = await getDocs(q);
        if (!snap.empty) { showToast("This flat number is already taken.", "error"); return; }
      }
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { flatNumber: tempFlat.trim() });
      setUserData(prev => ({ ...prev, flatNumber: tempFlat.trim() }));
      setIsEditingFlat(false);
      showToast("Flat number updated! 🏠");
    } catch (err) { console.error("Flat Update Error:", err); showToast("Failed to update flat number.", "error"); }
  };

  const handleLeaveSociety = async () => {
    if (!userData.societyId) return;
    const confirm = await showModal({
      title: "Leave Society?", message: `Are you sure you want to leave ${societyName}?`,
      confirmLabel: "Yes, Leave Building", cancelLabel: "Stay"
    });
    if (!confirm) return;
    setLeaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const societyRef = doc(db, "societies", userData.societyId);
      const socSnap = await getDoc(societyRef);
      if (socSnap.exists()) {
        const members = socSnap.data().memberIds || [];
        const newMembers = members.filter(id => id !== user.uid);
        if (socSnap.data().adminId === user.uid && newMembers.length > 0) {
          showToast("Building Secretary cannot leave without transferring ownership.", "error");
          setLeaving(false); return;
        }
        await updateDoc(societyRef, { memberIds: newMembers });
      }
      await updateDoc(userRef, { societyId: null, role: "user", flatNumber: "" });
      setUserData(prev => ({ ...prev, societyId: null, role: "user", flatNumber: "" }));
      setSocietyName("");
      showToast("You have left the society.");
    } catch (err) { console.error("Leave Error:", err); showToast("Failed to leave society.", "error"); }
    finally { setLeaving(false); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); navigate("/auth"); }
    catch (error) { console.error("Logout Error:", error); }
  };

  const calculateCO2Offset = (wasteKg) => (wasteKg * 0.53).toFixed(2);
  const earnedBadgeIds = checkBadges(userData);
  const earnedBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase" style={{ color: '#22c55e' }}>Loading Profile...</div>
      </div>
    );
  }

  const userInitial = (user?.displayName || userData?.name || user?.email || "C")[0].toUpperCase();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      
      <div className="ml-64 p-10 min-h-screen max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center gap-8 p-8 rounded-xl relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(34,197,94,0.06)' }}></div>
            
            {/* Avatar */}
            <div className="relative group">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadDP} />
              <div 
                onClick={() => fileInputRef.current.click()}
                className="w-28 h-28 rounded-2xl flex items-center justify-center font-bold text-5xl shrink-0 relative z-10 overflow-hidden cursor-pointer transition-all duration-500"
                style={userData?.photoURL || user?.photoURL 
                  ? {} 
                  : { background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.1))', color: '#22c55e', border: '2px solid rgba(34,197,94,0.2)' }
                }
              >
                {uploading ? (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[8px] uppercase tracking-tighter mt-1 text-white">Uploading</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center z-20 transition-all text-[10px] uppercase font-bold tracking-widest text-white opacity-0 group-hover:opacity-100">
                    Change
                  </div>
                )}
                {userData?.photoURL || user?.photoURL ? (
                  <img src={userData?.photoURL || user?.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : userInitial}
              </div>
            </div>

            <div className="flex-1 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                    {userData?.name || user?.displayName || "Composter"}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold uppercase text-[9px] tracking-widest" style={{ color: '#6b7280' }}>{user?.email}</p>
                    {userData?.societyId && (
                      <>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#4b5563' }}></span>
                        <p className="font-bold uppercase text-[9px] tracking-widest" style={{ color: '#22c55e' }}>🏢 {societyName || "Loading..."}</p>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: '#4b5563' }}></span>
                        <div className="flex items-center gap-2 group/flat">
                          {isEditingFlat ? (
                            <div className="flex items-center gap-1">
                              <input value={tempFlat} onChange={e => setTempFlat(e.target.value)}
                                className="rounded px-2 py-0.5 text-[9px] font-bold w-16 outline-none text-white"
                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(34,197,94,0.3)' }}
                                autoFocus
                              />
                              <button onClick={handleUpdateFlat} className="font-bold text-[8px] hover:underline uppercase" style={{ color: '#22c55e' }}>Save</button>
                            </div>
                          ) : (
                            <>
                              <p className="font-bold uppercase text-[9px] tracking-widest" style={{ color: '#6b7280' }}>Flat: {userData?.flatNumber || "N/A"}</p>
                              <button onClick={() => setIsEditingFlat(true)}
                                className="opacity-0 group-hover/flat:opacity-100 transition-all text-[8px] font-bold uppercase tracking-widest hover:underline" style={{ color: '#22c55e' }}>Edit</button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {userData?.societyId && (
                    <button onClick={handleLeaveSociety} disabled={leaving}
                      className="px-5 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                    >{leaving ? "Leaving..." : "Leave Building"}</button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>Level {userData?.level || 1}</span>
                {earnedBadges.slice(0, 2).map((badge, index) => (
                  <span key={index} className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>{badge.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total XP", value: userData?.xp ?? 0, sub: "XP Points", icon: "✨" },
            { label: "Current Level", value: userData?.level ?? 1, sub: "Ranking Tier", icon: "📈" },
            { label: "Day Streak", value: userData?.streak ?? 0, sub: "Consecutive Days", icon: "🔥" },
            { label: "Waste Logged", value: (userData?.totalWasteKg ?? 0).toFixed(1), sub: "Kilograms", icon: "⚖️" }
          ].map((stat, i) => (
            <div key={i} className="p-6 rounded-xl hover:translate-y-[-4px] transition-all group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>{stat.label}</span>
                <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight mb-1">{stat.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Impact & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Card */}
          <div className="lg:col-span-2 rounded-xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-xl font-bold text-white tracking-tight mb-8">Composting Journey</h2>
            <XPBar currentXP={userData?.xp ?? 0} nextLevelXP={1000} />
            
            <div className="mt-12 flex justify-center pt-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
               <div className="flex items-start gap-4 text-center mx-auto">
                 <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>🌳</div>
                 <div className="text-left">
                   <p className="text-sm font-bold text-white uppercase tracking-tight">Environmental Impact</p>
                   <p className="text-2xl font-bold tracking-tight" style={{ color: '#22c55e' }}>{calculateCO2Offset(userData?.totalWasteKg ?? 0)} KG CO₂ Offset</p>
                   <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: '#6b7280' }}>Total carbon footprint reduction from landfill diversion</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="flex flex-col gap-8">
            <div className="rounded-xl p-6 flex-1 relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#6b7280' }}>Earned Badges</h2>
              <div className="space-y-3">
                {earnedBadges.length > 0 ? (
                  earnedBadges.slice(0, 3).map((badge, i) => (
                    <BadgeCard key={i} badge={badge} isUnlocked={true} />
                  ))
                ) : (
                  <div className="py-10 text-center rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p className="font-bold text-xs uppercase tracking-widest" style={{ color: '#6b7280' }}>No badges earned yet</p>
                    <p className="text-[10px] uppercase mt-1" style={{ color: '#4b5563' }}>Keep composting to unlock achievements!</p>
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/badges')}
                className="w-full mt-6 py-3 rounded-lg font-bold transition-all text-[10px] uppercase tracking-widest cursor-pointer"
                style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
              >View Full System</button>
            </div>

            {/* Logout & Account Settings */}
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={handleLogout}
                  className="w-full py-4 rounded-lg font-bold text-white hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer"
                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                >
                  <span className="uppercase text-xs tracking-widest">End Session</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>

                <button onClick={handleDeleteAccount}
                  className="w-full mt-3 py-2 rounded-lg font-bold transition-all text-[10px] uppercase tracking-[0.2em] cursor-pointer"
                  style={{ color: '#6b7280' }}
                >Delete Account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
