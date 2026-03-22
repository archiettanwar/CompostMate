import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const Sidebar = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

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
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' },
    { id: 'log', label: 'Log Waste', icon: '📝', path: '/log' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', path: '/leaderboard' },
    { id: 'badges', label: 'Badges', icon: '⭐', path: '/badges' },
    { id: 'analytics', label: 'Analytics', icon: '📊', path: '/analytics' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 border-r border-gray-100 shadow-2xl z-50 transition-all duration-300" style={{ backgroundColor: '#1A5C38' }}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-8 py-10 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md">🌱</span>
            <h1 className="text-2xl font-black text-white tracking-tighter">CompostMate</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#1A5C38] shadow-lg shadow-black/10 scale-[1.02]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="p-4 m-4 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Avatar Circle */}
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#1A5C38] font-black shadow-md shadow-black/20 text-xl overflow-hidden border-2 border-white/20 shrink-0">
              {(user?.displayName || userData?.name || user?.email || "C")[0].toUpperCase()}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm truncate tracking-tight">
                {userData?.name || user?.displayName || "Composter"}
              </p>
              <p className="text-white/60 text-[10px] truncate font-bold uppercase tracking-wider">
                {user?.email}
              </p>
            </div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer group shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-0.5 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
