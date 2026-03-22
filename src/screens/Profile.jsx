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

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: downloadURL });

      // Update Firestore user document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });

      // Update local state
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

    setIsDeleting(true);
    try {
      // 1. Delete Firestore logs first (recursive wipe)
      const logsRef = collection(db, "users", user.uid, "logs");
      const logsSnap = await getDocs(logsRef);
      
      // Delete logs in parallel for speed
      const deletePromises = logsSnap.docs.map(logDoc => deleteDoc(logDoc.ref));
      await Promise.all(deletePromises);

      // 2. Delete the main User document
      const userRef = doc(db, "users", user.uid);
      await deleteDoc(userRef); 
      
      // 3. Delete the Auth user
      await user.delete();
      
      // 4. Clear data and navigate
      showToast("Account successfully wiped. Goodbye! 👋");
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        showToast("Security check: Please relogin to delete account.", "error");
      } else {
        showToast("Failed to delete account.", "error");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/");
        return;
      }
      setUser(firebaseUser);
      try {
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setTempFlat(data.flatNumber || "");
          
          if (data.societyId) {
            const socSnap = await getDoc(doc(db, "societies", data.societyId));
            if (socSnap.exists()) {
              setSocietyName(socSnap.data().name);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleUpdateFlat = async () => {
    if (!tempFlat.trim() || tempFlat === userData.flatNumber) {
      setIsEditingFlat(false);
      return;
    }

    try {
      // Check for uniqueness if in a society
      if (userData.societyId) {
        const usersRef = collection(db, "users");
        const q = query(
          usersRef, 
          where("societyId", "==", userData.societyId), 
          where("flatNumber", "==", tempFlat.trim())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          showToast("This flat number is already taken.", "error");
          return;
        }
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { flatNumber: tempFlat.trim() });
      setUserData(prev => ({ ...prev, flatNumber: tempFlat.trim() }));
      setIsEditingFlat(false);
      showToast("Flat number updated! 🏠");
    } catch (err) {
      console.error("Flat Update Error:", err);
      showToast("Failed to update flat number.", "error");
    }
  };

  const handleLeaveSociety = async () => {
    if (!userData.societyId) return;

    const confirm = await showModal({
      title: "Leave Society?",
      message: `Are you sure you want to leave ${societyName}? All your data remains, but you will lose access to building stats and rankings.`,
      confirmLabel: "Yes, Leave Building",
      cancelLabel: "Stay"
    });

    if (!confirm) return;

    setLeaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const societyRef = doc(db, "societies", userData.societyId);

      // 1. Remove UID from society memberIds
      const socSnap = await getDoc(societyRef);
      if (socSnap.exists()) {
        const members = socSnap.data().memberIds || [];
        const newMembers = members.filter(id => id !== user.uid);
        
        // Administrative check
        if (socSnap.data().adminId === user.uid && newMembers.length > 0) {
          showToast("Building Secretary cannot leave without transferring ownership.", "error");
          setLeaving(false);
          return;
        }

        await updateDoc(societyRef, { memberIds: newMembers });
      }

      // 2. Clear society fields from User
      await updateDoc(userRef, {
        societyId: null,
        role: "user",
        flatNumber: ""
      });

      setUserData(prev => ({ ...prev, societyId: null, role: "user", flatNumber: "" }));
      setSocietyName("");
      showToast("You have left the society.");
    } catch (err) {
      console.error("Leave Error:", err);
      showToast("Failed to leave society.", "error");
    } finally {
      setLeaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // Calculate CO2 offset (real calculation)
  const calculateCO2Offset = (wasteKg) => {
    return (wasteKg * 0.53).toFixed(2);
  };

  // Determine earned badges based on stats
  const earnedBadgeIds = checkBadges(userData);
  const earnedBadges = BADGES.filter(b => earnedBadgeIds.includes(b.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse text-xl tracking-widest uppercase">Loading Profile...</div>
      </div>
    );
  }

  const userInitial = (user?.displayName || userData?.name || user?.email || "C")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      
      <div className="ml-64 p-10 min-h-screen max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-8 bg-white p-10 rounded-[40px] shadow-2xl shadow-black/5 border border-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1A5C38]/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            {/* Avatar */}
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleUploadDP} 
              />
              <div 
                onClick={() => fileInputRef.current.click()}
                className={`w-32 h-32 rounded-[32px] flex items-center justify-center text-white font-black shadow-xl shadow-[#1A5C38]/20 border-4 border-white shrink-0 relative z-10 overflow-hidden cursor-pointer transition-all duration-500 ${
                  userData?.photoURL || user?.photoURL ? '' : 'bg-gradient-to-br from-[#1A5C38] to-[#2E8B57] text-5xl'
                }`}
              >
                {uploading ? (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center z-20">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-[8px] uppercase tracking-tighter mt-1">Uploading</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center z-20 transition-all text-[10px] uppercase font-black tracking-widest opacity-0 group-hover:opacity-100">
                    Change
                  </div>
                )}
                
                {userData?.photoURL || user?.photoURL ? (
                  <img src={userData?.photoURL || user?.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </div>
            </div>

            <div className="flex-1 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">
                    {userData?.name || user?.displayName || "Composter"}
                  </h1>
                  <div className="flex items-center gap-3">
                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest flex items-center gap-2">
                      {user?.email}
                    </p>
                    {userData?.societyId && (
                      <>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <p className="text-[#1A5C38] font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                          🏢 {societyName || "Loading..."}
                        </p>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <div className="flex items-center gap-2 group/flat">
                          {isEditingFlat ? (
                            <div className="flex items-center gap-1">
                              <input 
                                value={tempFlat} 
                                onChange={e => setTempFlat(e.target.value)}
                                className="bg-[#F9FBF9] border border-gray-100 rounded px-2 py-0.5 text-[9px] font-black w-16 outline-none focus:border-[#1A5C38]"
                                autoFocus
                              />
                              <button onClick={handleUpdateFlat} className="text-[#1A5C38] font-black text-[8px] hover:underline uppercase">Save</button>
                            </div>
                          ) : (
                            <>
                              <p className="text-gray-500 font-black uppercase text-[9px] tracking-widest">
                                Flat: {userData?.flatNumber || "N/A"}
                              </p>
                              <button 
                                onClick={() => setIsEditingFlat(true)}
                                className="opacity-0 group-hover/flat:opacity-100 transition-all text-[8px] font-black uppercase tracking-widest text-[#1A5C38] hover:underline"
                              >
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {userData?.societyId && (
                    <button 
                      onClick={handleLeaveSociety}
                      disabled={leaving}
                      className="px-6 py-3 rounded-2xl bg-white text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all border border-red-50 cursor-pointer disabled:opacity-50"
                    >
                      {leaving ? "Leaving..." : "Leave Building"}
                    </button>
                  )}
                  <button 
                    onClick={() => navigate('/edit-profile')}
                    className="px-6 py-3 rounded-2xl bg-[#1A5C38] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#1A5C38]/90 transition-all shadow-lg shadow-green-900/10 cursor-pointer"
                  >
                    Manage Account
                  </button>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <span className="px-4 py-1.5 bg-[#1A5C38]/10 text-[#1A5C38] rounded-full text-[10px] font-black uppercase tracking-widest"> Level {userData?.level || 1}</span>
                {earnedBadges.slice(0, 2).map((badge, index) => (
                  <span key={index} className="px-4 py-1.5 bg-green-100 text-[#1A5C38] rounded-full text-[10px] font-black uppercase tracking-widest"> {badge.name}</span>
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
            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-black/5 hover:translate-y-[-4px] transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{stat.label}</span>
                <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
              </div>
              <p className="text-3xl font-black text-gray-900 tracking-tighter mb-1">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Impact & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Card */}
          <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-gray-50 shadow-xl shadow-black/5">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Composting Journey</h2>
            <XPBar currentXP={userData?.xp ?? 0} nextLevelXP={1000} />
            
            <div className="mt-12 flex justify-center pt-10 border-t border-gray-50">
               <div className="flex items-start gap-4 text-center mx-auto">
                 <div className="w-16 h-16 rounded-[24px] bg-green-50 flex items-center justify-center text-[#1A5C38] text-2xl shadow-inner border border-green-100/50">🌳</div>
                 <div className="text-left">
                   <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Environmental Impact</p>
                   <p className="text-3xl font-black text-[#1A5C38] tracking-tighter">{calculateCO2Offset(userData?.totalWasteKg ?? 0)} KG CO₂ Offset</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total Carbon footprint reduction from landfill diversion</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Achievements (Real) */}
          <div className="flex flex-col gap-8">
            <div className="bg-white rounded-[40px] p-8 border border-gray-50 shadow-xl shadow-black/5 flex-1 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none drop-shadow-lg">
                <span className="text-8xl">🏆</span>
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6 uppercase text-xs tracking-[0.2em] text-gray-400">Earned Badges</h2>
              <div className="space-y-4">
                {earnedBadges.length > 0 ? (
                  earnedBadges.slice(0, 3).map((badge, i) => (
                    <BadgeCard key={i} badge={badge} isUnlocked={true} />
                  ))
                ) : (
                  <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                    <p className="text-gray-300 font-bold text-xs uppercase tracking-widest">No badges earned yet</p>
                    <p className="text-[10px] text-gray-300 uppercase mt-1">Keep composting to unlock achievements!</p>
                  </div>
                )}
              </div>
              <button 
                onClick={() => navigate('/badges')}
                className="w-full mt-6 py-4 rounded-2xl font-black text-[#1A5C38] border-2 border-[#1A5C38]/10 hover:bg-[#1A5C38]/5 transition-all text-[10px] uppercase tracking-widest cursor-pointer"
              >
                View Full System
              </button>
            </div>

            {/* Logout & Account Settings */}
            <div className="bg-white rounded-[40px] p-8 border border-gray-50 shadow-xl shadow-black/5 text-center">
                <button 
                  onClick={handleLogout}
                  className="w-full py-5 rounded-2xl font-black text-white hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-red-500/10 flex items-center justify-center gap-3 cursor-pointer"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  <span className="uppercase text-xs tracking-widest">End Session</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>

                <button 
                  onClick={handleDeleteAccount}
                  className="w-full mt-4 py-3 rounded-2xl font-black text-red-300 hover:text-red-500 transition-all text-[10px] uppercase tracking-[0.2em] cursor-pointer"
                >
                  Delete Account
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
