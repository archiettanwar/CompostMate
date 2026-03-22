import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, increment, query, collection, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";

const JoinSociety = () => {
  const [userData, setUserData] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          if (data.societyId) {
            navigate('/dashboard');
          }
        }
      } else {
        navigate('/');
      }
      setInitialLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || loading || userData?.societyId) return;

    setLoading(true);
    setError("");
    const code = inviteCode.toUpperCase().trim();

    try {
      // 1. Check if invite exists
      const inviteRef = doc(db, "invites", code);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        setError("Invalid code. Check with your secretary.");
        setLoading(false);
        return;
      }

      const { societyId } = inviteSnap.data();

      // 2. Check if flat number is already taken in THIS society
      const usersRef = collection(db, "users");
      const flatQuery = query(
        usersRef, 
        where("societyId", "==", societyId), 
        where("flatNumber", "==", flatNumber.trim())
      );
      const flatSnap = await getDocs(flatQuery);

      if (!flatSnap.empty) {
        setError(`Flat ${flatNumber} is already registered in this building.`);
        setLoading(false);
        return;
      }

      // 3. Get Society Name for the success message
      const societyRef = doc(db, "societies", societyId);
      const societySnap = await getDoc(societyRef);
      const societyName = societySnap.exists() ? societySnap.data().name : "the society";

      // 3. Update User
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { 
        societyId,
        flatNumber: flatNumber.trim()
      });

      // 4. Update Society memberIds
      await updateDoc(societyRef, {
        memberIds: arrayUnion(auth.currentUser.uid)
      });

      // 5. Increment Invite uses
      await updateDoc(inviteRef, {
        uses: increment(1)
      });

      setSuccess(`Welcome to ${societyName}! 🎉`);
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

    } catch (err) {
      console.error("Join Error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      if (!success) setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse uppercase tracking-[0.2em]">Verifying Status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBF9' }}>
      <Sidebar />
      
      <div className="ml-64 p-10 min-h-screen">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Join Society</h1>
            <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-widest">Connect with your building community</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-2xl bg-white border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer shadow-sm"
          >
            ← Back to Home
          </button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-[40px] shadow-xl shadow-black/5 p-12 border border-gray-50 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-[#1A5C38]/10 rounded-[24px] flex items-center justify-center text-4xl mx-auto mb-8">🏢</div>
            
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-2 uppercase">Enter Invite Code</h2>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-10 leading-relaxed max-w-[280px] mx-auto">
              Provided by your building secretary
            </p>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-2xl text-[#1A5C38] text-[10px] font-black uppercase tracking-widest">
                {success}
              </div>
            )}

            <form onSubmit={handleJoin} className="space-y-6">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="INVITE CODE"
                className="w-full bg-[#F9FBF9] border-2 border-gray-100 rounded-3xl px-6 py-5 text-2xl font-black text-center text-[#1A5C38] placeholder-gray-200 tracking-[0.3em] focus:border-[#1A5C38] focus:ring-0 transition-all outline-none shadow-inner"
                required
                disabled={loading || success}
              />

              <input
                type="text"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                placeholder="FLAT NO. (E.G. A-101)"
                className="w-full bg-[#F9FBF9] border-2 border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-center text-gray-800 placeholder-gray-300 focus:border-[#1A5C38] focus:ring-0 transition-all outline-none"
                required
                disabled={loading || success}
              />

              <button
                type="submit"
                disabled={loading || success || inviteCode.length < 3}
                className="w-full py-5 rounded-2xl bg-[#1A5C38] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#1A5C38]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? "Confirming..." : "Join Society 🚀"}
              </button>
            </form>

            <div className="my-10 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-100"></div>
              <span className="text-[10px] text-gray-200 font-bold uppercase tracking-widest">OR</span>
              <div className="flex-1 h-px bg-gray-100"></div>
            </div>

            <button className="w-full py-4 rounded-xl border-2 border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
              📸 Scan QR Code
            </button>

            <div className="mt-12 pt-10 border-t border-gray-50">
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                Secretary? Setup your building
              </p>
              <button 
                onClick={() => navigate('/create-society')}
                className="text-[#1A5C38] font-black text-[10px] uppercase tracking-[0.2em] mt-3 block mx-auto hover:underline cursor-pointer"
              >
                Establish New Society →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSociety;
