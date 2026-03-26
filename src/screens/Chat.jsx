import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { sendChatMessage } from "../lib/gemini.js";
import Sidebar from "../components/Sidebar";

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
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/auth");
        return;
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Initializing Chat...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />

      {/* Main Chat Content Area */}
      <div className="ml-64 flex-1 flex flex-col h-screen relative">
        {/* Top Bar */}
        <header className="px-8 py-6 h-28 flex flex-col justify-center shrink-0 z-10" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>💬</span> CompostBot
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: '#6b7280' }}>
            Your AI composting assistant
          </p>
        </header>

        {/* Chat Messages Area */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar pb-32">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              {msg.sender === "bot" && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ml-1" style={{ color: '#22c55e' }}>
                  CompostBot 🌱
                </span>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-6 py-4 leading-relaxed text-sm font-medium ${
                  msg.sender === "user"
                    ? "text-white rounded-tr-none"
                    : "text-gray-300 rounded-tl-none"
                }`}
                style={msg.sender === "user"
                  ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.15)' }
                  : { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {msg.text}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-2 px-2" style={{ color: '#4b5563' }}>
                {msg.timestamp}
              </p>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ml-1" style={{ color: '#22c55e' }}>
                CompostBot 🌱
              </span>
              <div className="rounded-2xl px-6 py-4 flex items-center gap-3 font-bold text-xs italic" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#22c55e' }}>
                <span className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-bounce" style={{ animationDelay: '100ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-bounce" style={{ animationDelay: '200ms' }}></span>
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
              className="rounded-full p-2 pl-8 flex items-center gap-4 shadow-2xl backdrop-blur-md"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask me how to balance your nitrogen..."
                className="flex-1 bg-transparent text-sm font-semibold text-white placeholder-gray-600 border-none focus:ring-0 py-3"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 cursor-pointer"
                style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="white"
                  className="w-5 h-5 hover:translate-x-0.5 transition-transform"
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
