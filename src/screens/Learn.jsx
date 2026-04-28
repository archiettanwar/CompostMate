import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from "../components/TopNav";
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { articles, learningBadges } from '../data/articles';
import { useNotification } from '../context/NotificationContext';

const Learn = () => {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [readArticles, setReadArticles] = useState(() => JSON.parse(localStorage.getItem('readArticles') || '[]'));
  const [savedArticles, setSavedArticles] = useState(() => JSON.parse(localStorage.getItem('savedArticles') || '[]'));
  const [likes, setLikes] = useState(() => JSON.parse(localStorage.getItem('articleLikes') || '{}'));
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  
  const navigate = useNavigate();
  const { showToast } = useNotification();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/auth");
      setUser(u);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('readArticles', JSON.stringify(readArticles));
    localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
    localStorage.setItem('articleLikes', JSON.stringify(likes));
  }, [readArticles, savedArticles, likes]);

  const handleLike = (id, delta) => {
    setLikes(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: Math.max(0, current + delta) };
    });
  };

  const toggleSave = (id) => {
    setSavedArticles(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
    showToast(savedArticles.includes(id) ? "Article removed from bookmarks" : "Article bookmarked! 🔖");
  };

  const markAsRead = async (article) => {
    if (readArticles.includes(article.id)) return;
    
    try {
      const newReadRooms = [...readArticles, article.id];
      setReadArticles(newReadRooms);
      
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          xp: increment(15)
        });
      }

      showToast("Article read! +15 XP earned ✨");

      const count = newReadRooms.length;
      learningBadges.forEach(badge => {
        if (count === badge.threshold) {
          showToast(`🎉 Badge unlocked: ${badge.name}!`);
        }
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const askCompostBot = async () => {
    if (!aiQuestion || !selectedArticle) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { 
              role: "system", 
              content: `You are CompostBot. The user is reading an article titled '${selectedArticle.title}'. Answer their question about this specific topic in under 100 words. Be practical and encouraging.` 
            },
            { role: "user", content: aiQuestion }
          ],
          max_tokens: 150
        }),
      });
      const data = await response.json();
      setAiAnswer(data.choices[0].message.content);
    } catch (err) {
      console.error("CompostBot Error:", err);
      setAiAnswer("Sorry, I'm having trouble thinking right now. 🌱 Try again?");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === "All" || a.level === selectedLevel;
    const matchesTopic = selectedTopic === "All" || a.topic === selectedTopic;
    return matchesSearch && matchesLevel && matchesTopic;
  });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      <TopNav />
      <div className="flex-1 pt-24 md:pt-28 p-8">
        {!selectedArticle ? (
          <>
            {/* HERO SECTION */}
            <div className="rounded-3xl p-6 md:p-12 mb-10 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12">
                <div className="max-w-xl">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 animate-in slide-in-from-left duration-700 leading-[1.1]">Knowledge Hub 🌱</h1>
                  <p className="text-base md:text-lg font-medium opacity-80" style={{ color: '#9ca3af' }}>Master the art of composting with curated guides, videos, and AI.</p>
                </div>

                <div className="flex-1 w-full max-w-xl">
                  <div className="relative group mb-8">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                      <span className="text-xl opacity-40">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 py-5 pl-16 pr-8 rounded-2xl text-lg font-semibold outline-none focus:bg-white/10 transition-all duration-300"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setSelectedLevel("All"); setSelectedTopic("All"); }}
                      className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                        selectedLevel === "All" && selectedTopic === "All" ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                      }`}
                      style={(selectedLevel === "All" && selectedTopic === "All") ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' } : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      All
                    </button>
                    {["Beginner", "Intermediate", "Advanced"].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)}
                        className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                          selectedLevel === lvl ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                        }`}
                        style={selectedLevel === lvl ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)' } : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {lvl}
                      </button>
                    ))}
                    {["Science", "Methods", "Urban"].map(tpc => (
                      <button
                        key={tpc}
                        onClick={() => setSelectedTopic(tpc)}
                        className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                          selectedTopic === tpc ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                        }`}
                        style={selectedTopic === tpc ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)' } : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {tpc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-[0.02] rounded-full -mr-32 -mt-32 blur-3xl"></div>
            </div>

            {/* STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
              {[
                { label: "Completion", value: `${Math.round((readArticles.length/articles.length)*100)}%`, sub: `${readArticles.length}/${articles.length} Read`, icon: "🏆" },
                { label: "Bookmarks", value: savedArticles.length, sub: "Guides", icon: "🔖" },
                { label: "Learning PR", value: learningBadges.filter(b => readArticles.length >= b.threshold).length, sub: "Trophies", icon: "💎" },
                { label: "Streak", value: "3", sub: "Reading days", icon: "🔥" }
              ].map((stat, i) => (
                <div key={i} className="p-4 md:p-6 rounded-xl transition-all group" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>{stat.label}</span>
                    <span className="text-xl md:text-2xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* ARTICLES GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {filteredArticles.map((article, i) => (
                <div 
                  key={article.id}
                  className="rounded-2xl overflow-hidden shadow-2xl flex flex-col hover:translate-y-[-4px] transition-all duration-300 group"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <span className={`absolute top-4 left-4 px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest ${
                      article.level === 'Beginner' ? 'bg-green-500 text-white' : 
                      article.level === 'Intermediate' ? 'bg-yellow-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {article.level}
                    </span>
                    <button 
                      onClick={() => toggleSave(article.id)}
                      className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur-md rounded-lg flex items-center justify-center text-white hover:bg-white hover:text-[#000] transition-all"
                    >
                      {savedArticles.includes(article.id) ? "🔖" : "📑"}
                    </button>
                  </div>
                  
                  <div className="p-7 flex-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-3 block" style={{ color: '#22c55e' }}>{article.topic}</span>
                    <h3 className="text-xl font-bold text-white leading-tight mb-3 group-hover:text-[#22c55e] transition-colors">{article.title}</h3>
                    <p className="text-sm font-medium line-clamp-2 leading-relaxed" style={{ color: '#9ca3af' }}>{article.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>
                      <span>⏱️ {article.readTime}</span>
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex gap-2">
                      <button onClick={() => handleLike(article.id, 1)} className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white">👍 {likes[article.id] || 0}</button>
                    </div>
                    <button 
                      onClick={() => setSelectedArticle(article)}
                      className="font-bold text-[10px] uppercase tracking-widest hover:translate-x-1 transition-all"
                      style={{ color: '#22c55e' }}
                    >
                      Read Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* BADGES SECTION */}
            <div className="mt-16 p-12 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h2 className="text-xl font-bold text-white tracking-tight mb-8 flex items-center gap-3 uppercase text-xs tracking-widest" style={{ color: '#6b7280' }}>
                <span className="text-xl">📚</span> Library Trophies
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                {learningBadges.map((badge) => {
                  const unlocked = readArticles.length >= badge.threshold;
                  return (
                    <div key={badge.id} className={`p-6 md:p-8 rounded-xl text-center border transition-all ${
                      unlocked ? 'border-[#22c55e]/30' : 'border-white/5 opacity-40'
                    }`}
                    style={{ backgroundColor: unlocked ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)' }}
                    >
                      <div className={`text-4xl md:text-5xl mb-4 md:mb-6 inline-block p-3 md:p-4 rounded-xl ${unlocked ? 'grayscale-0' : 'grayscale opacity-30'}`}>{badge.icon}</div>
                      <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${unlocked ? 'text-[#22c55e]' : 'text-gray-500'}`}>{badge.name}</p>
                      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{badge.condition}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* ARTICLE DETAIL VIEW */
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button 
              onClick={() => setSelectedArticle(null)}
              className="mb-8 flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all group"
              style={{ color: '#4b5563' }}
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Hub
            </button>

            <div className="rounded-3xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="h-[400px] relative">
                <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                <div className="absolute bottom-10 left-10 right-10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block" style={{ color: '#f59e0b' }}>{selectedArticle.topic}</span>
                  <h1 className="text-4xl font-bold text-white tracking-tight mb-4 leading-tight">{selectedArticle.title}</h1>
                  <div className="flex items-center gap-4 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    <span className="px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>{selectedArticle.level}</span>
                    <span>⏱️ {selectedArticle.readTime}</span>
                  </div>
                </div>
              </div>

              <div className="p-12">
                <div className="rounded-2xl overflow-hidden shadow-2xl mb-12" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <iframe 
                    width="100%" 
                    height="450" 
                    src={`https://www.youtube.com/embed/${selectedArticle.youtubeId}`}
                    title="YouTube video" 
                    frameBorder="0" 
                    allowFullScreen 
                    className="w-full"
                  />
                </div>

                <div className="prose prose-invert prose-lg max-w-none font-medium leading-relaxed mb-12 whitespace-pre-line" style={{ color: '#9ca3af' }}>
                  {selectedArticle.content}
                </div>

                {!readArticles.includes(selectedArticle.id) ? (
                  <button 
                    onClick={() => markAsRead(selectedArticle)}
                    className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all mb-16 cursor-pointer"
                    style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
                  >
                    ✅ Mark as Read (+15 XP)
                  </button>
                ) : (
                  <div className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-widest text-center mb-16" style={{ backgroundColor: 'rgba(34,197,94,0.05)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                    ✨ GUIDE COMPLETED ✨
                  </div>
                )}

                {/* AI DOUBT ASSISTANT */}
                <div className="p-10 rounded-2xl relative overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="absolute top-0 right-0 p-8 opacity-5 grayscale pointer-events-none">
                    <span className="text-8xl">🤖</span>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
                      CompostBot AI
                    </h3>
                    <p className="font-semibold text-[10px] uppercase tracking-widest mb-8" style={{ color: '#4b5563' }}>Have a doubt? Ask about {selectedArticle.topic}</p>
                    
                    <div className="flex gap-4 mb-6">
                      <input
                        type="text"
                        placeholder={`Ask anything about ${selectedArticle.title.toLowerCase()}...`}
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        className="flex-1 px-6 py-4 rounded-xl font-bold text-white outline-none transition-all"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onKeyDown={(e) => e.key === 'Enter' && askCompostBot()}
                      />
                      <button 
                        disabled={aiLoading}
                        onClick={askCompostBot}
                        className="px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                        style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.2)' }}
                      >
                        {aiLoading ? "Thinking..." : "ASK BOT 🤖"}
                      </button>
                    </div>

                    {aiAnswer && (
                      <div className="p-8 rounded-xl border animate-in slide-in-from-top-4 duration-500" style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}>
                        <p className="font-semibold leading-relaxed text-sm" style={{ color: '#22c55e' }}>{aiAnswer}</p>
                      </div>
                    )}
                    {aiLoading && (
                      <div className="flex items-center gap-3 font-bold text-[10px] uppercase tracking-widest animate-pulse" style={{ color: '#22c55e' }}>
                        <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: '#22c55e' }}></div>
                        CompostBot is thinking... 🌱
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Learn;
