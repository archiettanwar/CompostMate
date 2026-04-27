import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { BADGES, checkBadges } from "../lib/badges";

const Sidebar = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let unsubscribeUser = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/auth");
        return;
      }
      setUser(firebaseUser);
      
      const { onSnapshot } = await import('firebase/firestore');
      unsubscribeUser = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      });
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [navigate]);

  // Global Badge Unlock Monitor
  useEffect(() => {
    if (!userData || !user) return;
    
    const earnedBadgeIds = checkBadges(userData);
    const prevUnlocked = userData.unlockedBadges || [];
    const newlyUnlocked = earnedBadgeIds.filter(id => !prevUnlocked.includes(id));
    
    if (newlyUnlocked.length > 0) {
      const triggerBadgeAlerts = async () => {
        try {
          const { writeBatch, collection, serverTimestamp } = await import('firebase/firestore');
          const batch = writeBatch(db);
          
          const newUnlockedList = [...prevUnlocked, ...newlyUnlocked];
          // Update the user doc to cache the unlocked ones
          batch.update(doc(db, "users", user.uid), { unlockedBadges: newUnlockedList });
          
          // Send notifications
          newlyUnlocked.forEach(badgeId => {
             const badgeInfo = BADGES.find(b => b.id === badgeId);
             if (badgeInfo) {
                 batch.set(doc(collection(db, "users", user.uid, "notifications")), {
                   type: 'badge',
                   badgeId: badgeId,
                   title: `New Badge Unlocked! ${badgeInfo.icon}`,
                   message: `Congratulations! You've earned the "${badgeInfo.name}" badge.`,
                   timestamp: serverTimestamp(),
                   read: false
                 });
             }
          });
          
          await batch.commit();
        } catch(e) {
          console.error("Badge trigger failed:", e);
        }
      };
      triggerBadgeAlerts();
    }
  }, [userData, user]);

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' },
    { id: 'tracker', label: 'Tracker', icon: '⏳', path: '/tracker' },
    { id: 'log', label: 'Log Waste', icon: '📝', path: '/log' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', path: '/leaderboard' },
    { id: 'badges', label: 'Badges', icon: '⭐', path: '/badges' },
    { id: 'learn', label: 'Learn', icon: '📚', path: '/learn' },
    { id: 'analytics', label: 'Analytics', icon: '📊', path: '/analytics' },
    { id: 'tools', label: 'Tools', icon: '🛠️', path: '/tools' },
    ...(userData?.role === 'resident' ? [{ id: 'perks', label: 'My Perks', icon: '🎁', path: '/perks' }] : []),
    ...(userData?.role === 'society_admin' || userData?.role === 'super_admin' ? [{ id: 'admin', label: 'Admin Panel', icon: '🔐', path: '/admin' }] : []),
    ...(userData?.societyId ? [{ id: 'my-society', label: 'My Building', icon: '🏢', path: '/my-society' }] : [{ id: 'join', label: 'Join Society', icon: '🏢', path: '/join-society' }]),
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 z-50 transition-all duration-300 border-r" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-8 py-8 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md">🌱</span>
            <h1 className="text-xl font-bold text-white tracking-tight">CompostMate</h1>
          </div>
          <p className="text-[10px] font-medium mt-1 ml-12" style={{ color: '#6b7280' }}>Turning waste into gold</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? 'text-white shadow-lg shadow-green-500/10'
                    : 'text-[#9ca3af] hover:text-white'
                }`}
                style={isActive ? {
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  borderLeft: '3px solid #22c55e'
                } : {
                  backgroundColor: 'transparent',
                  borderLeft: '3px solid transparent'
                }}
              >
                <span className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className="font-semibold text-sm">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div
          className="m-3 p-4 rounded-xl cursor-pointer transition-all duration-200"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
          onClick={() => navigate('/profile')}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-md text-base overflow-hidden shrink-0 ${
              userData?.photoURL || user?.photoURL ? 'bg-white' : ''
            }`}
            style={!(userData?.photoURL || user?.photoURL) ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' } : {}}
            >
              {userData?.photoURL || user?.photoURL ? (
                <img src={userData?.photoURL || user?.photoURL} alt="DP" className="w-full h-full object-cover" />
              ) : (
                (userData?.name || user?.displayName || user?.email || "C")[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {(userData?.name || user?.displayName || "Composter").split(' ')[0]}
              </p>
              <p className="text-[10px] font-medium truncate" style={{ color: '#6b7280' }}>
                {userData?.role === 'society_admin' ? 'Admin' : 'Resident'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
