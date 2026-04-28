import React from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from "../components/TopNav";
import { useNotifications } from "../hooks/useNotifications";

const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case 'maturity': return '⏳';
      case 'admin': return '📢';
      case 'badge': return '🏆';
      default: return '🔔';
    }
  };

  const getThemeColor = (type) => {
    switch (type) {
      case 'maturity': return '#22c55e'; // Green
      case 'admin': return '#f59e0b'; // Amber
      case 'badge': return '#a855f7'; // Purple
      default: return '#6b7280'; // Gray
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <TopNav />
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Alerts & Updates</h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b7280' }}>
              You have <span className={unreadCount > 0 ? "text-[#22c55e]" : ""}>{unreadCount} unread</span> alerts
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
            >
              Mark All Read ✓
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Notifications List */}
          <div className="lg:col-span-2 space-y-4">
            {notifications.length === 0 ? (
            <div className="p-16 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
              <span className="text-4xl opacity-50 block mb-4">📭</span>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const themeColor = getThemeColor(notif.type);
              return (
                <div 
                  key={notif.id}
                  onClick={async () => {
                     if (!notif.read) await markAsRead(notif.id);
                     if (notif.type === 'badge' && notif.badgeId) navigate(`/badges?highlight=${notif.badgeId}`);
                     else if (notif.type === 'maturity') navigate(`/tracker`);
                  }}
                  className={`p-6 rounded-2xl flex gap-6 items-start transition-all ${
                    !notif.read ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-pointer opacity-70 hover:opacity-100'
                  }`}
                  style={{ 
                    backgroundColor: !notif.read ? `rgba(${notif.type === 'maturity' ? '34,197,94' : notif.type === 'admin' ? '245,158,11' : '168,85,247'}, 0.05)` : 'rgba(255,255,255,0.02)', 
                    border: `1px solid ${!notif.read ? themeColor + '40' : 'rgba(255,255,255,0.05)'}`
                  }}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0" 
                    style={{ backgroundColor: !notif.read ? themeColor + '20' : 'rgba(255,255,255,0.05)' }}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-bold tracking-tight ${!notif.read ? 'text-white text-lg' : 'text-gray-400 text-base'}`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: themeColor }}></div>
                      )}
                    </div>
                    <p className={`font-medium leading-relaxed mb-3 ${!notif.read ? 'text-gray-300' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>
                      {formatTimestamp(notif.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          </div>

          {/* Right Column: Info Panel */}
          <div className="space-y-8">
            <div className="p-10 rounded-2xl flex flex-col h-full" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 className="text-xl font-bold text-white tracking-tight mb-8 uppercase text-xs tracking-widest" style={{ color: '#6b7280' }}>
                Notification Center Protocol
              </h2>
              
              <div className="space-y-6">
                 <div className="p-8 rounded-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                    <div className="text-4xl mb-4 filter drop-shadow-lg">⏳</div>
                    <h3 className="text-[#22c55e] font-bold text-xs uppercase tracking-widest mb-3">Maturity Alerts</h3>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                      We automate the monitoring of your curing bins. When a bin hits <span className="text-white font-bold">100% maturity</span> (approx. 30 days after sealing), we securely ping you here so you can harvest your fresh compost!
                    </p>
                 </div>

                 <div className="p-8 rounded-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <div className="text-4xl mb-4 filter drop-shadow-lg">📢</div>
                    <h3 className="text-[#f59e0b] font-bold text-xs uppercase tracking-widest mb-3">Society Broadcasts</h3>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                      Direct top-down communication from your building's Secretary Admin. These alerts include essential maintenance notices, waste collection schedules, or vital society updates.
                    </p>
                 </div>

                 <div className="p-8 rounded-2xl transition-all hover:scale-[1.02]" style={{ backgroundColor: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.1)' }}>
                    <div className="text-4xl mb-4 filter drop-shadow-lg">🏆</div>
                    <h3 className="text-[#a855f7] font-bold text-xs uppercase tracking-widest mb-3">Global Milestones</h3>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                      Every time you log waste or maintain your daily streak, the <span className="text-white font-bold">CompostMate Engine</span> recalculates your position. Earning badges unlocks real-world society maintenance fee perks.
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
