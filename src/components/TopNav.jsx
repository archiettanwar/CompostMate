import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { BADGES, checkBadges } from "../lib/badges";
import { useNotifications } from "../hooks/useNotifications";

const TopNav = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { unreadCount } = useNotifications();

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
          const data = docSnap.data();
          if (data.role === 'banned') {
             signOut(auth);
             alert("System Alert: Your account has been suspended by the Global Administrator.");
             window.location.href = "/";
             return;
          }
          setUserData(data);
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

  const baseSocietyItems = [
    ...(userData?.societyId ? [{ id: 'my-society', label: 'Overview', path: '/my-society' }] : [{ id: 'join', label: 'Join', path: '/join-society' }]),
    ...(userData?.role === 'society_admin' || userData?.role === 'super_admin' ? [{ id: 'admin', label: 'Manage', path: '/admin' }] : []),
  ];

  const navItems = [
    {
      id: 'dashboard_group', label: 'Dashboard',
      subItems: [
        { id: 'home', label: 'Dashboard', path: '/dashboard' },
        { id: 'tracker', label: 'Tracker', path: '/tracker' },
      ]
    },
    { id: 'log', label: 'Log', path: '/log' },
    {
      id: 'analytics_group', label: 'Performance',
      subItems: [
        { id: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
        { id: 'analytics', label: 'Analytics', path: '/analytics' },
      ]
    },
    { id: 'badges', label: 'Badges', path: '/badges' },
    {
      id: 'resources_group', label: 'Resources',
      subItems: [
        { id: 'learn', label: 'Learn', path: '/learn' },
        { id: 'tools', label: 'Tools', path: '/tools' },
      ]
    },
    ...(userData?.role === 'resident' ? [{ id: 'perks', label: 'Perks', path: '/perks' }] : []),
    ...(userData?.role === 'super_admin' ? [{ id: 'superadmin', label: 'System', path: '/superadmin' }] : []),
    ...((userData?.societyId || userData?.role === 'society_admin' || userData?.role === 'super_admin' || !userData?.societyId) ? [{
      id: 'society_group', label: 'Society',
      subItems: baseSocietyItems
    }] : []),
  ];

  // Mobile menu open state
  const [openMenus, setOpenMenus] = useState({});
  const toggleMobileMenuDropdown = (id) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b" style={{ backgroundColor: 'rgba(10, 10, 10, 0.95)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-full px-6 md:px-12 lg:px-16 h-20 flex items-center justify-between">
          
          {/* Branding */}
          <div className="flex items-center cursor-pointer shrink-0" onClick={() => navigate('/dashboard')}>
            <span className="text-3xl filter drop-shadow-md mr-3">🌱</span>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white tracking-tight">CompostMate</h1>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: '#6b7280' }}>Turning waste into gold</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-6 lg:gap-8 mx-4 flex-1 justify-center">
            {navItems.map((item) => {
              if (item.subItems) {
                const isGroupActive = item.subItems.some(sub => sub.path === location.pathname);
                
                return (
                  <div key={item.id} className="relative group px-1">
                    <button
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                        isGroupActive
                          ? 'text-[#22c55e]'
                          : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="font-semibold text-sm whitespace-nowrap">{item.label}</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="14" 
                        height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="transition-transform duration-300 group-hover:rotate-180 ml-1"
                      >
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                      {isGroupActive && (
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-[#22c55e]" />
                      )}
                    </button>
                    
                    {/* Dropdown */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border pointer-events-none group-hover:pointer-events-auto" style={{ backgroundColor: '#111111', borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="p-2 space-y-1">
                        {item.subItems.map(subItem => {
                          const isActive = location.pathname === subItem.path;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => navigate(subItem.path)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                                isActive
                                  ? 'text-white bg-green-500/10'
                                  : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <span className="font-medium text-sm whitespace-nowrap">{subItem.label}</span>
                              {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // Single Item
              const isActive = location.pathname === item.path;
              return (
                <div key={item.id} className="relative px-1">
                  <button
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer group ${
                      isActive
                        ? 'text-[#22c55e]'
                        : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="font-semibold text-sm whitespace-nowrap">{item.label}</span>
                    {isActive && (
                      <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-[#22c55e]" />
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Profile & Notifications & Hamburger */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Notification Bell */}
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2 text-[#9ca3af] hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white animate-pulse" style={{ backgroundColor: '#ef4444', border: '1px solid #0a0a0a' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {/* Desktop Profile */}
            <div
              className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 border"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(255,255,255,0.08)'
              }}
              onClick={() => navigate('/profile')}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
            >

              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md text-sm overflow-hidden shrink-0 ${
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
            </div>

            {/* Mobile Hamburger Menu */}
            <button 
              className="xl:hidden p-2 text-[#9ca3af] hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          
          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-72 flex flex-col border-l transition-transform transform translate-x-0" style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-20 border-b flex items-center px-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="text-lg font-bold text-white tracking-tight">Navigation</span>
            </div>
            
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                if (item.subItems) {
                  const isGroupActive = item.subItems.some(sub => sub.path === location.pathname);
                  const isOpen = openMenus[item.id] || isGroupActive;
                  
                  return (
                    <div key={item.id} className="space-y-1 mb-1">
                      <button
                        onClick={() => toggleMobileMenuDropdown(item.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                          isGroupActive && !isOpen
                            ? 'text-white bg-green-500/10'
                            : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-semibold text-sm">{item.label}</span>
                        </div>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {isOpen && (
                        <div className="pl-4 space-y-1 mt-1 mb-2">
                          {item.subItems.map(subItem => {
                            const isActive = location.pathname === subItem.path;
                            return (
                              <button
                                key={subItem.id}
                                onClick={() => { navigate(subItem.path); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                  isActive
                                    ? 'text-white bg-green-500/10'
                                    : 'text-[#9ca3af] hover:text-white'
                                }`}
                              >
                                <span className="text-base">{subItem.icon}</span>
                                <span className="font-medium text-sm">{subItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = location.pathname === item.path;
                return (
                  <div key={item.id} className="mb-1">
                    <button
                      onClick={() => { navigate(item.path); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'text-white bg-green-500/10'
                          : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-semibold text-sm">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </nav>

            {/* Mobile Profile */}
            <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
               <div
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }}
              >
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
      )}
    </>
  );
};

export default TopNav;
