import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const highlightedBadgeId = searchParams.get('highlight');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/auth");
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Loading Badges...</div>
      </div>
    );
  }

  const earnedBadgeIds = checkBadges(userData);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="ml-64 p-10 min-h-screen">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Badge System</h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>Track your composting milestones and achievements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {BADGES.map((badge) => (
            <BadgeCard 
              key={badge.id} 
              badge={badge} 
              isUnlocked={earnedBadgeIds.includes(badge.id)} 
              isHighlighted={highlightedBadgeId === badge.id}
            />
          ))}
        </div>

        <div className="mt-16 p-12 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="max-w-2xl mx-auto">
            <span className="text-4xl mb-6 block">🚀</span>
            <h2 className="text-xl font-bold text-white tracking-tight mb-4 uppercase">More Achievements Coming</h2>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#9ca3af' }}>
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
