import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sendChatMessage } from "../lib/gemini.js";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Initialize chat with welcome message when first opened
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse text-xl tracking-widest uppercase">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: '#F9FBF9' }}>
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 p-10 min-h-screen">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
              Good morning, {user?.displayName?.split(' ')[0] || userData?.name?.split(' ')[0] || "Composter"} 👋
            </h1>
            <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-widest">{getDateString()}</p>
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
             <div className="px-4 py-2 bg-green-50 rounded-xl">
                <span className="text-[#1A5C38] font-black text-xs uppercase tracking-widest">Active System</span>
             </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* XP Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-50 hover:scale-[1.02] transition-transform duration-300 group">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Total Growth</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black text-gray-900 tracking-tighter group-hover:text-[#1A5C38] transition-colors">{userData?.xp ?? 0}</p>
              <p className="text-sm font-bold text-gray-400 uppercase">XP</p>
            </div>
          </div>

          {/* Level Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-50 hover:scale-[1.02] transition-transform duration-300">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Ranking</p>
            <p className="text-4xl font-black text-gray-900 tracking-tighter">Level {userData?.level ?? 1}</p>
            <p className="text-xs font-black text-[#1A5C38] mt-2 uppercase tracking-wider">Seedling 🌱</p>
          </div>

          {/* Streak Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-50 hover:scale-[1.02] transition-transform duration-300">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Persistence</p>
            <div className="flex items-center gap-3">
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{userData?.streak ?? 0} Days</p>
              <span className="text-2xl animate-bounce">🔥</span>
            </div>
          </div>

          {/* Waste Diverted Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-50 hover:scale-[1.02] transition-transform duration-300">
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Impact</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black text-gray-900 tracking-tighter">{userData?.totalWasteKg ?? 0}</p>
              <p className="text-sm font-bold text-gray-400 uppercase">KG</p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-10 border border-gray-50 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <svg width="150" height="150" viewBox="0 0 100 100">
                  <path d="M50 10 Q70 30 50 60 Q30 30 50 10" fill="#1A5C38" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Cycle Maturity Tracking</h2>
              <div className="flex flex-col items-center justify-center py-10 bg-[#F9FBF9]/50 rounded-[40px] border border-[#1A5C38]/5">
                <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full transform -rotate-90 filter drop-shadow-lg" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="#1A5C38"
                      strokeWidth="10"
                      strokeDasharray="0 345"
                      strokeLinecap="round"
                    />
                    <text x="60" y="68" textAnchor="middle" fontSize="28" fontWeight="black" fill="#1A5C38" className="tracking-tighter transform rotate-90 origin-center translate-y-[2px]">
                      0%
                    </text>
                  </svg>
                </div>
                <p className="text-xl font-black text-gray-900 mb-2">Initialize Your Cycle</p>
                <p className="text-gray-400 font-bold mb-8 text-center max-w-sm text-sm uppercase tracking-tight">Set up your first composting bin to start tracking maturity and Diverting waste.</p>
                <button
                  className="px-10 py-4 rounded-2xl font-black text-white hover:scale-105 transition-all duration-300 shadow-xl shadow-[#1A5C38]/20 uppercase text-xs tracking-widest cursor-pointer"
                  style={{ backgroundColor: '#1A5C38' }}
                >
                  Configure Bin Profile
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-10 border border-gray-50">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Recent Waste Logs</h2>
              <div className="flex flex-col items-center justify-center py-16 bg-[#F9FBF9]/50 rounded-[40px] border border-dashed border-gray-200">
                 <div className="text-5xl mb-4 grayscale opacity-20">🍃</div>
                <p className="text-gray-400 font-black text-center uppercase tracking-widest text-xs">Awaiting first log...</p>
                <p className="text-gray-300 text-[10px] font-bold text-center mt-2 uppercase tracking-widest">
                  Start logging your waste to build your compost matrix
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-50">
              <h2 className="text-xl font-black text-gray-900 tracking-tight mb-6 uppercase text-xs tracking-[0.2em] text-gray-400">Control Center</h2>
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/log')}
                  className="w-full py-5 px-6 rounded-2xl font-black text-white hover:scale-[1.02] transition-all duration-300 shadow-xl shadow-[#1A5C38]/10 flex items-center justify-between group cursor-pointer"
                  style={{ backgroundColor: '#1A5C38' }}
                >
                  <span className="uppercase text-xs tracking-widest">Log Waste Batch</span>
                  <span className="text-xl group-hover:rotate-12 transition-transform">📝</span>
                </button>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="w-full py-5 px-6 rounded-2xl font-black text-[#1A5C38] border-2 border-[#1A5C38]/20 hover:bg-[#1A5C38]/5 transition-all duration-300 flex items-center justify-between cursor-pointer"
                >
                  <span className="uppercase text-xs tracking-widest">Ask CompostBot</span>
                  <span className="text-xl">💬</span>
                </button>
                <button
                  className="w-full py-5 px-6 rounded-2xl font-black text-gray-700 border-2 border-gray-100 hover:bg-gray-50 transition-all duration-300 flex items-center justify-between cursor-pointer"
                >
                  <span className="uppercase text-xs tracking-widest">Vision Analysis</span>
                  <span className="text-xl">📸</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-8 border border-gray-50 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-amber-500 opacity-20"></div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight mb-6 uppercase text-xs tracking-[0.2em] text-gray-400">C:N Matrix</h2>
              <div className="flex flex-col items-center justify-center py-10 rounded-[32px] bg-gray-50/50">
                <p className="text-6xl font-black text-gray-200 tracking-tighter mb-4">—</p>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest max-w-[140px] leading-relaxed">Insufficient data for ratio projection</p>
              </div>
            </div>

             <div className="bg-gradient-to-br from-[#1A5C38] to-[#2E8B57] rounded-3xl shadow-xl shadow-[#1A5C38]/20 p-8 text-white">
                <div className="flex items-center gap-2 mb-4">
                   <span className="text-xl">💡</span>
                   <h3 className="font-black text-xs uppercase tracking-widest">Eco Tip</h3>
                </div>
                <p className="font-bold text-sm leading-relaxed opacity-90 italic">
                  "Maintain a 30:1 carbon-to-nitrogen ratio for the most efficient decomposition process."
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* --- Floating Chat Widget --- */}
      
      {/* Chat Popup */}
      <div 
        className={`fixed bottom-[110px] right-8 z-50 w-[380px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col transition-all duration-300 origin-bottom-right ${
          isChatOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-[#1A5C38] rounded-t-2xl p-4 flex flex-col justify-center shrink-0 shadow-lg">
          <h3 className="text-white font-black tracking-tight text-lg mb-0.5">🌱 CompostBot</h3>
          <p className="text-[#A7D7BC] text-[10px] font-bold uppercase tracking-wider">Ask me anything about composting</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9FBF9] custom-scrollbar">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm font-medium leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#1A5C38] text-white rounded-tr-none"
                    : "bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-black/5"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] font-bold text-gray-300 uppercase mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex flex-col items-start">
               <div className="bg-white text-[#1A5C38] text-[10px] font-bold border border-[#1A5C38]/10 rounded-2xl px-4 py-2 shadow-sm italic animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleChatSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1A5C38] transition-all"
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={isChatLoading || !inputText.trim()}
              className="w-10 h-10 rounded-full bg-[#1A5C38] flex items-center justify-center text-white shadow-lg shadow-[#1A5C38]/20 transition-all active:scale-90 disabled:opacity-50 cursor-pointer"
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
        className="fixed bottom-8 right-8 z-50 w-[60px] h-[60px] bg-[#1A5C38] rounded-full shadow-2xl shadow-[#1A5C38]/30 flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 active:scale-90 cursor-pointer"
      >
        {isChatOpen ? (
          <span className="text-white text-xl">✕</span>
        ) : (
          <span className="filter drop-shadow-md">🌱</span>
        )}
      </button>

      {/* --- Styles for Sidebar/Chat Scrollbar --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
      `}} />
    </div>
  );
}
