import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, increment, query, collection, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TopNav from "../components/TopNav";

const JoinSociety = () => {
  const [userData, setUserData] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
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
      const inviteRef = doc(db, "invites", code);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        setError("Invalid code. Check with your secretary.");
        setLoading(false);
        return;
      }

      const { societyId } = inviteSnap.data();

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

      const societyRef = doc(db, "societies", societyId);
      const societySnap = await getDoc(societyRef);
      const societyName = societySnap.exists() ? societySnap.data().name : "the society";

      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, { 
        societyId,
        flatNumber: flatNumber.trim()
      });

      await updateDoc(societyRef, {
        memberIds: arrayUnion(auth.currentUser.uid)
      });

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Verifying Status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <TopNav />
      
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-1">Join Society</h1>
            <p className="font-semibold uppercase text-[10px] tracking-widest" style={{ color: '#6b7280' }}>Connect with your building community</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#9ca3af' }}
          >
            ← Back
          </button>
        </div>

        <div className="max-w-xl mx-auto mt-20">
          <div className="p-12 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-8 grayscale" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>🏢</div>
            
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2 uppercase">Enter Invite Code</h2>
            <p className="font-semibold text-[10px] uppercase tracking-widest mb-10 leading-relaxed max-w-[280px] mx-auto" style={{ color: '#4b5563' }}>
              Provided by your building secretary
            </p>

            {error && (
              <div className="mb-8 p-4 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div className="mb-8 p-4 rounded-xl text-[#22c55e] text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
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
                className="w-full rounded-xl px-6 py-5 text-3xl font-bold text-center placeholder-gray-800 tracking-[0.3em] outline-none transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#22c55e' }}
                required
                disabled={loading || success}
              />

              <input
                type="text"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                placeholder="FLAT NO. (E.G. A-101)"
                className="w-full rounded-xl px-6 py-4 text-sm font-bold text-center text-white placeholder-gray-700 outline-none transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                required
                disabled={loading || success}
              />

              <button
                type="submit"
                disabled={loading || success || inviteCode.length < 3}
                className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
              >
                {loading ? "Confirming..." : "Join Society 🚀"}
              </button>
            </form>

            <div className="my-10 flex items-center gap-4">
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2d2d2d' }}>OR</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}></div>
            </div>

            <button className="w-full py-4 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', color: '#4b5563' }}>
              📸 Scan QR Code
            </button>

            <div className="mt-12 pt-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#4b5563' }}>
                Secretary? Setup your building
              </p>
              <button 
                onClick={() => navigate('/create-society')}
                className="font-bold text-[10px] uppercase tracking-[0.2em] mt-3 block mx-auto hover:underline cursor-pointer"
                style={{ color: '#22c55e' }}
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
