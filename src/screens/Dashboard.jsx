import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sendChatMessage } from "../lib/gemini.js";
import Sidebar from "../components/Sidebar";
import { articles } from "../data/articles";
import { useNotifications } from "../hooks/useNotifications";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readArticles, setReadArticles] = useState([]);
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('readArticles') || '[]');
    setReadArticles(saved);
  }, []);

  // Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/auth");
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
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      setMessages([
        {
          text: "Hi! I'm CompostBot 🌱 Ask me anything about composting!",
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isChatOpen, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatLoading, isChatOpen]);

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isChatLoading) return;

    const userMessage = {
      text: inputText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputText;
    setInputText("");
    setIsChatLoading(true);

    try {
      const reply = await sendChatMessage(messageToSend);
      const botMessage = {
        text: reply,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again.",
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase" style={{ color: '#22c55e' }}>Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 p-10 min-h-screen">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Good morning, {user?.displayName?.split(' ')[0] || userData?.name?.split(' ')[0] || "Composter"} 👋
            </h1>
            <p className="mt-2 uppercase text-xs tracking-widest font-semibold" style={{ color: '#6b7280' }}>{getDateString()}</p>
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className="hidden lg:flex items-center justify-center w-14 h-14 rounded-xl relative transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer" 
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
             <span className="text-2xl filter drop-shadow-md">🔔</span>
             {unreadCount > 0 && (
               <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white animate-pulse" style={{ backgroundColor: '#ef4444', border: '2px solid #0a0a0a' }}>
                 {unreadCount > 9 ? '9+' : unreadCount}
               </div>
             )}
          </button>
        </div>

        {/* Join Society Banner */}
        {userData?.societyId === null && (
          <div className="mb-10 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <span className="text-9xl">🏢</span>
            </div>
            
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-xl font-bold text-white tracking-tight mb-2">Unlock Society Features 🏢</h2>
              <p className="text-xs font-semibold uppercase tracking-widest leading-relaxed max-w-lg" style={{ color: '#9ca3af' }}>
                You haven't joined a society yet. Join now to unlock building leaderboard 🏆 and maintenance discounts! 💰
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/join-society')}
              className="relative z-10 px-8 py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
            >
              Join Your Society 🚀
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* XP Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300 group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Total Growth</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-white tracking-tight group-hover:text-[#22c55e] transition-colors">{userData?.xp ?? 0}</p>
              <p className="text-sm font-semibold uppercase" style={{ color: '#6b7280' }}>XP</p>
            </div>
          </div>

          {/* Level Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Ranking</p>
            <p className="text-4xl font-bold text-white tracking-tight">Level {userData?.level ?? 1}</p>
            <p className="text-xs font-bold mt-2 uppercase tracking-wider" style={{ color: '#22c55e' }}>Seedling 🌱</p>
          </div>

          {/* Streak Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Persistence</p>
            <div className="flex items-center gap-3">
              <p className="text-4xl font-bold text-white tracking-tight">{userData?.streak ?? 0} Days</p>
              <span className="text-2xl animate-bounce">🔥</span>
            </div>
          </div>

          {/* Waste Diverted Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Impact</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-white tracking-tight">{userData?.totalWasteKg ?? 0}</p>
              <p className="text-sm font-semibold uppercase" style={{ color: '#6b7280' }}>KG</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl p-8 relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-xl font-bold text-white tracking-tight mb-8">Cycle Maturity Tracking</h2>
              <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="10"
                      strokeDasharray="0 345"
                      strokeLinecap="round"
                    />
                    <text x="60" y="68" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#22c55e" className="transform rotate-90 origin-center translate-y-[2px]">
                      0%
                    </text>
                  </svg>
                </div>
                <p className="text-lg font-bold text-white mb-2">Initialize Your Cycle</p>
                <p className="font-semibold mb-8 text-center max-w-sm text-sm" style={{ color: '#6b7280' }}>Set up your first composting bin to start tracking maturity and diverting waste.</p>
                <button
                  className="px-10 py-4 rounded-xl font-bold text-white hover:scale-105 transition-all duration-300 uppercase text-xs tracking-widest cursor-pointer"
                  style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.25)' }}
                >
                  Configure Bin Profile
                </button>
              </div>
            </div>

            <div className="rounded-xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-xl font-bold text-white tracking-tight mb-8">Recent Waste Logs</h2>
              <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                 <div className="text-5xl mb-4 opacity-20">🍃</div>
                <p className="font-bold text-center uppercase tracking-widest text-xs" style={{ color: '#6b7280' }}>Awaiting first log...</p>
                <p className="text-[10px] font-semibold text-center mt-2 uppercase tracking-widest" style={{ color: '#4b5563' }}>
                  Start logging your waste to build your compost matrix
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#6b7280' }}>Control Center</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/log')}
                  className="w-full py-4 px-5 rounded-xl font-bold text-white hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group cursor-pointer"
                  style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.2)' }}
                >
                  <span className="uppercase text-xs tracking-widest">Log Waste Batch</span>
                  <span className="text-xl group-hover:rotate-12 transition-transform">📝</span>
                </button>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="w-full py-4 px-5 rounded-xl font-bold transition-all duration-300 flex items-center justify-between cursor-pointer"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
                >
                  <span className="uppercase text-xs tracking-widest">Ask CompostBot</span>
                  <span className="text-xl">💬</span>
                </button>
                <button
                  className="w-full py-4 px-5 rounded-xl font-bold transition-all duration-300 flex items-center justify-between cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                >
                  <span className="uppercase text-xs tracking-widest">Vision Analysis</span>
                  <span className="text-xl">📸</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl p-6 text-center relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
               <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: 'linear-gradient(to right, #22c55e, #f59e0b)', opacity: 0.3 }}></div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#6b7280' }}>C:N Matrix</h2>
              <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <p className="text-6xl font-bold mb-4" style={{ color: 'rgba(255,255,255,0.1)' }}>—</p>
                <p className="text-[10px] font-bold uppercase tracking-widest max-w-[140px] leading-relaxed" style={{ color: '#6b7280' }}>Insufficient data for ratio projection</p>
              </div>
            </div>

            {/* Keep Learning Widget */}
            <div className="rounded-xl p-6 relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
               <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: '#6b7280' }}>📚 Keep Learning</h2>
               <div className="space-y-3">
                 {articles.filter(a => !readArticles.includes(a.id)).slice(0, 2).length > 0 ? (
                   articles.filter(a => !readArticles.includes(a.id)).slice(0, 2).map((article) => (
                     <div key={article.id} className="p-4 rounded-xl group transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                       <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#f59e0b' }}>{article.topic}</p>
                       <h4 className="text-xs font-bold text-white leading-tight mb-2 group-hover:text-[#22c55e] transition-colors">{article.title}</h4>
                       <button 
                         onClick={() => navigate('/learn')} 
                         className="text-[10px] font-bold uppercase tracking-widest hover:underline cursor-pointer"
                         style={{ color: '#22c55e' }}
                       >
                         Read →
                       </button>
                     </div>
                   ))
                 ) : (
                   <div className="py-6 text-center">
                     <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>🎉 You've read all articles!</p>
                     <p className="text-[8px] uppercase mt-1" style={{ color: '#4b5563' }}>Check back soon for more guides.</p>
                   </div>
                 )}
               </div>
            </div>

            {/* TOOLS & ACCESSORIES WIDGET */}
            <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">🛠️ Tools</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: '#6b7280' }}>Curated Selection</p>
                </div>
                <button 
                  onClick={() => navigate("/tools")}
                  className="font-bold text-xs uppercase tracking-widest hover:translate-x-1 transition-all cursor-pointer"
                  style={{ color: '#22c55e' }}
                >
                  All →
                </button>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { name: "20L Bin", price: "₹800+", image: "/assets/tools/bin_20l.jpg" },
                  { name: "Aerator", price: "₹400+", image: "/assets/tools/aerator.jpg" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-3 rounded-xl transition-all group cursor-pointer" style={{ border: '1px solid transparent' }} onClick={() => navigate("/tools")}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-xs text-white">{item.name}</h4>
                      <p className="font-bold text-[10px]" style={{ color: '#22c55e' }}>{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate("/tools")}
                className="w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer text-white"
                style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.2)' }}
              >
                Browse All Tools
              </button>
            </div>

             <div className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-center gap-2 mb-4">
                   <span className="text-xl">💡</span>
                   <h3 className="font-bold text-xs uppercase tracking-widest text-white">Eco Tip</h3>
                </div>
                <p className="font-medium text-sm leading-relaxed italic" style={{ color: '#9ca3af' }}>
                  "Maintain a 30:1 carbon-to-nitrogen ratio for the most efficient decomposition process."
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* --- Floating Chat Widget --- */}
      
      {/* Chat Popup */}
      <div 
        className={`fixed bottom-[110px] right-8 z-50 w-[380px] h-[500px] rounded-2xl flex flex-col transition-all duration-300 origin-bottom-right ${
          isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'
        }`}
        style={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="rounded-t-2xl p-4 flex flex-col justify-center shrink-0" style={{ background: 'linear-gradient(to right, #16a34a, #22c55e)' }}>
          <h3 className="text-white font-bold tracking-tight text-lg mb-0.5">🌱 CompostBot</h3>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>Ask me anything about composting</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: '#0a0a0a' }}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                  msg.sender === "user"
                    ? "text-white rounded-tr-none"
                    : "text-[#9ca3af] rounded-tl-none"
                }`}
                style={msg.sender === "user" 
                  ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)' }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {msg.text}
              </div>
              <span className="text-[10px] font-semibold uppercase mt-1 px-1" style={{ color: '#4b5563' }}>
                {msg.timestamp}
              </span>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex flex-col items-start">
               <div className="text-[10px] font-semibold rounded-2xl px-4 py-2 italic animate-pulse" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleChatSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-full px-5 py-2.5 text-xs font-semibold text-white focus:outline-none transition-all"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputText.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-90 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-8 right-8 z-50 w-[60px] h-[60px] rounded-full flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer"
        style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
      >
        {isChatOpen ? (
          <span className="text-white text-xl">✕</span>
        ) : (
          <span className="filter drop-shadow-md">🌱</span>
        )}
      </button>
    </div>
  );
}
