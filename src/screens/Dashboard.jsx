import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sendChatMessage } from "../lib/gemini.js";
import TopNav from "../components/TopNav";
import { articles } from "../data/articles";
import { useNotifications } from "../hooks/useNotifications";
import { useBin } from "../hooks/useBin";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readArticles, setReadArticles] = useState([]);
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { logs: bins, loading: binsLoading } = useBin();
  const activeBin = bins?.find(b => b.status === "filling");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('readArticles') || '[]');
    setReadArticles(saved);
  }, []);

  const getGreetingIST = () => {
    const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat([], options);
    const hour = parseInt(formatter.format(new Date()), 10);
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const ECO_TIPS = [
    "Maintain a 30:1 carbon-to-nitrogen ratio for the most efficient decomposition process.",
    "Turn your compost every 3-4 days to introduce oxygen and speed up the breakdown.",
    "Avoid adding meat, dairy, or oily foods to prevent pests and bad odors.",
    "Crush eggshells before adding them; it helps them break down much faster.",
    "Keep your compost as damp as a wrung-out sponge for optimal microbial activity.",
    "Layering browns and greens prevents matting and promotes airflow."
  ];
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const nextTip = () => setCurrentTipIndex((prev) => (prev + 1) % ECO_TIPS.length);

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
          const data = docSnap.data();
          const isGodMode = data.email === 'archiettanwar71@gmail.com';
          if (data.role === 'super_admin' && !isGodMode) {
            navigate("/superadmin");
            return;
          }
          setUserData(data);
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase" style={{ color: '#22c55e' }}>Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopNav />

      {/* Main Content */}
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        {/* Top Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 pb-8 gap-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {getGreetingIST()}, {user?.displayName?.split(' ')[0] || userData?.name?.split(' ')[0] || "Composter"} 👋
            </h1>
            <p className="mt-2 uppercase text-xs tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>{getDateString()}</p>
          </div>
          
          {/* Top Eco Tip */}
          <div className="rounded-xl p-4 lg:max-w-md w-full relative group cursor-pointer" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }} onClick={nextTip}>
             <div className="flex justify-between items-start mb-2">
               <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <h3 className="font-bold text-[10px] uppercase tracking-widest text-[#22c55e]">Eco Tip</h3>
               </div>
               <button className="text-[#22c55e] hover:text-white transition-colors p-1" onClick={(e) => { e.stopPropagation(); nextTip(); }}>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                 </svg>
               </button>
             </div>
             <p className="font-medium text-xs leading-relaxed italic" style={{ color: '#9ca3af' }}>
               "{ECO_TIPS[currentTipIndex]}"
             </p>
          </div>
        </div>

        {/* Join Society Banner */}
        {userData?.societyId === null && (
          <div className="mb-10 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <span className="text-9xl">🏢</span>
            </div>
            
            <div className="relative z-10 text-center md:text-left">
              <h2 className="text-xl font-bold tracking-tight mb-2" style={{ color: '#ffffff' }}>Unlock Society Features 🏢</h2>
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
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300 group" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Total Growth</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{userData?.xp ?? 0}</p>
              <p className="text-sm font-semibold uppercase" style={{ color: '#6b7280' }}>XP</p>
            </div>
          </div>

          {/* Level Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Ranking</p>
            <p className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Level {userData?.level ?? 1}</p>
            <p className="text-xs font-bold mt-2 uppercase tracking-wider" style={{ color: '#22c55e' }}>Seedling 🌱</p>
          </div>

          {/* Streak Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Persistence</p>
            <div className="flex items-center gap-3">
              <p className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{userData?.streak ?? 0} Days</p>
              <span className="text-2xl animate-bounce">🔥</span>
            </div>
          </div>

          {/* Waste Diverted Card */}
          <div className="rounded-xl p-6 hover:scale-[1.02] transition-transform duration-300" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Impact</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>{userData?.totalWasteKg ?? 0}</p>
              <p className="text-sm font-semibold uppercase" style={{ color: '#6b7280' }}>KG</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-xl p-8 relative overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="text-xl font-bold tracking-tight mb-8" style={{ color: 'var(--color-text-primary)' }}>Cycle Maturity Tracking</h2>
              <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', opacity: 0.8 }}>
                <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-border)" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="10"
                      strokeDasharray={`${(activeBin?.maturityProgress || 0) * 3.4} 345`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }}
                    />
                    <text x="60" y="68" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#22c55e" className="transform rotate-90 origin-center translate-y-[2px]">
                      {Math.round(activeBin?.maturityProgress || 0)}%
                    </text>
                  </svg>
                </div>
                <p className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {activeBin ? activeBin.name : "Initialize Your Cycle"}
                </p>
                <p className="font-semibold mb-8 text-center max-w-sm text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {activeBin 
                    ? `Your bin is currently ${Math.round(activeBin.maturityProgress)}% through its maturity phase.` 
                    : "Set up your first composting bin to start tracking maturity and diverting waste."}
                </p>
                <button
                  onClick={() => navigate(activeBin ? '/tracker' : '/log')}
                  className="px-10 py-4 rounded-xl font-bold hover:scale-105 transition-all duration-300 uppercase text-xs tracking-widest cursor-pointer"
                  style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: '#ffffff', boxShadow: '0 8px 32px rgba(34,197,94,0.25)' }}
                >
                  {activeBin ? "View Details" : "Configure Bin Profile"}
                </button>
              </div>
            </div>

            <div className="rounded-xl p-8" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="text-xl font-bold tracking-tight mb-8" style={{ color: 'var(--color-text-primary)' }}>Recent Waste Logs</h2>
              <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: '1px dashed var(--color-border)' }}>
                 <div className="text-5xl mb-4 opacity-20">🍃</div>
                <p className="font-bold text-center uppercase tracking-widest text-xs" style={{ color: 'var(--color-text-muted)' }}>Awaiting first log...</p>
                <p className="text-[10px] font-semibold text-center mt-2 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  Start logging your waste to build your compost matrix
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--color-text-muted)' }}>Control Center</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/log')}
                  className="w-full py-4 px-5 rounded-xl font-bold hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group cursor-pointer"
                  style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: '#ffffff', boxShadow: '0 4px 24px rgba(34,197,94,0.2)' }}
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
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <span className="uppercase text-xs tracking-widest">Vision Analysis</span>
                  <span className="text-xl">📸</span>
                </button>
              </div>
            </div>

            <div className="rounded-xl p-6 text-center relative overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
               <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: 'linear-gradient(to right, #22c55e, #f59e0b)', opacity: 0.3 }}></div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--color-text-muted)' }}>C:N Matrix</h2>
              <div className="flex flex-col items-center justify-center py-10 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
                <p className="text-6xl font-bold mb-4" style={{ color: 'var(--color-border)' }}>—</p>
                <p className="text-[10px] font-bold uppercase tracking-widest max-w-[140px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>Insufficient data for ratio projection</p>
              </div>
            </div>

            {/* Keep Learning Widget */}
            <div className="rounded-xl p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
               <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--color-text-muted)' }}>📚 Keep Learning</h2>
               <div className="space-y-3">
                 {articles.filter(a => !readArticles.includes(a.id)).slice(0, 2).length > 0 ? (
                   articles.filter(a => !readArticles.includes(a.id)).slice(0, 2).map((article) => (
                     <div key={article.id} className="p-4 rounded-xl group transition-all" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                       <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#f59e0b' }}>{article.topic}</p>
                       <h4 className="text-xs font-bold leading-tight mb-2 group-hover:text-[#22c55e] transition-colors" style={{ color: 'var(--color-text-primary)' }}>{article.title}</h4>
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
                     <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>🎉 You've read all articles!</p>
                     <p className="text-[8px] uppercase mt-1" style={{ color: 'var(--color-text-muted)' }}>Check back soon for more guides.</p>
                   </div>
                 )}
               </div>
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
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="rounded-t-2xl p-4 flex flex-col justify-center shrink-0" style={{ background: 'linear-gradient(to right, #16a34a, #22c55e)' }}>
          <h3 className="text-white font-bold tracking-tight text-lg mb-0.5">🌱 CompostBot</h3>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>Ask me anything about composting</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--color-bg)' }}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                  msg.sender === "user"
                    ? "text-white rounded-tr-none"
                    : "text-inherit rounded-tl-none"
                }`}
                style={msg.sender === "user" 
                  ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)' }
                  : { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }
                }
              >
                {msg.text}
              </div>
              <span className="text-[10px] font-semibold uppercase mt-1 px-1" style={{ color: 'var(--color-text-muted)' }}>
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
        <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <form onSubmit={handleChatSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-full px-5 py-2.5 text-xs font-semibold focus:outline-none transition-all"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
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
