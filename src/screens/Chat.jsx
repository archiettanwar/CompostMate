import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sendChatMessage } from "../lib/gemini.js";

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm CompostBot 🌱 Ask me anything about composting!",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Sidebar & User State
  const [activeNav, setActiveNav] = useState('bot');
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' },
    { id: 'log', label: 'Log Waste', icon: '📝', path: '/logger' },
    { id: 'bot', label: 'CompostBot', icon: '💬', path: '/chat' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', path: '/leaderboard' },
    { id: 'badges', label: 'Badges', icon: '⭐', path: '/badges' },
    { id: 'analytics', label: 'Analytics', icon: '📊', path: '/analytics' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      text: inputText,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputText;
    setInputText("");
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse text-xl tracking-widest uppercase">Initializing Chat...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9FBF9] font-sans">
      {/* Sidebar (Exact same as Dashboard.jsx) */}
      <div className="fixed left-0 top-0 h-screen w-64 border-r border-gray-100 shadow-2xl z-50 transition-all duration-300" style={{ backgroundColor: '#1A5C38' }}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-8 py-10">
            <div className="flex items-center gap-3">
              <span className="text-3xl filter drop-shadow-md">🌱</span>
              <h1 className="text-2xl font-black text-white tracking-tighter">CompostMate</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.path) navigate(item.path);
                }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 group ${
                  activeNav === item.id || (item.id === 'bot' && window.location.pathname === '/chat')
                    ? 'bg-white text-[#1A5C38] shadow-lg shadow-black/10 scale-[1.02]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`text-xl transition-transform duration-300 ${activeNav === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User Profile at Bottom */}
          <div className="p-4 m-4 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#1A5C38] font-black shadow-md shadow-black/20 text-xl overflow-hidden border-2 border-white/20">
                {(user?.displayName || userData?.name || "C")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm truncate tracking-tight">
                  {user?.displayName || userData?.name || "Composter"}
                </p>
                <p className="text-white/60 text-[10px] truncate font-bold uppercase tracking-wider">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Content Area */}
      <div className="ml-64 flex-1 flex flex-col h-screen relative">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-8 py-6 h-28 flex flex-col justify-center shrink-0 z-10 shadow-sm">
          <h1 className="text-2xl font-black text-[#1A5C38] tracking-tight flex items-center gap-2">
            <span>💬</span> CompostBot
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            Your AI composting assistant
          </p>
        </header>

        {/* Chat Messages Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F9FBF9] custom-scrollbar pb-32">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              {msg.sender === "bot" && (
                <span className="text-[10px] font-black text-[#1A5C38] uppercase tracking-[0.2em] mb-2 ml-1">
                  CompostBot 🌱
                </span>
              )}
              <div
                className={`max-w-[60%] rounded-[2rem] px-6 py-4 shadow-xl shadow-black/5 leading-relaxed text-sm font-medium ${
                  msg.sender === "user"
                    ? "bg-[#1A5C38] text-white rounded-tr-sm"
                    : "bg-white text-gray-700 border border-gray-100 rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-2 px-2">
                {msg.timestamp}
              </p>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] font-black text-[#1A5C38] uppercase tracking-[0.2em] mb-2 ml-1">
                CompostBot 🌱
              </span>
              <div className="bg-white text-[#1A5C38] border border-[#1A5C38]/10 rounded-2xl px-6 py-3 shadow-sm flex items-center gap-2 font-bold text-xs italic">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A5C38] animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A5C38] animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A5C38] animate-bounce delay-200"></span>
                </span>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Bottom Input Area */}
        <footer className="absolute bottom-0 left-0 right-0 p-8 pt-0 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <form 
              onSubmit={handleSend} 
              className="bg-white border border-gray-100 rounded-[2.5rem] p-3 pl-8 flex items-center gap-4 shadow-2xl shadow-black/10 backdrop-blur-sm"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask me how to balance your nitrogen..."
                className="flex-1 bg-transparent text-sm font-bold text-gray-800 placeholder-gray-300 border-none focus:ring-0 py-3"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-[#1A5C38]/30 group"
                style={{ backgroundColor: "#1A5C38" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="white"
                  className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </form>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Chat;
