import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import BadgeCard from "../components/BadgeCard";
import { BADGES, checkBadges } from "../lib/badges";

const Badges = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/");
        return;
      }
      try {
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse text-xl tracking-widest uppercase">Loading Badges...</div>
      </div>
    );
  }

  const earnedBadgeIds = checkBadges(userData);

  return (
    <div className="min-h-screen bg-[#F9FBF9]">
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-[32px] font-black text-[#1A5C38] tracking-tighter uppercase">Badge System</h1>
          <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-[0.2em]">Track your composting milestones and achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BADGES.map((badge) => (
            <BadgeCard 
              key={badge.id} 
              badge={badge} 
              isUnlocked={earnedBadgeIds.includes(badge.id)} 
            />
          ))}
        </div>

        <div className="mt-16 p-10 bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-black/5 text-center">
          <div className="max-w-2xl mx-auto">
            <span className="text-4xl mb-4 block">🚀</span>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-4 uppercase">More Badges Coming Soon</h2>
            <p className="text-gray-400 font-bold leading-relaxed">
              We're constantly adding new milestones for the CompostMate community. 
              Keep logging your waste to stay ahead of the curve!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Badges;
