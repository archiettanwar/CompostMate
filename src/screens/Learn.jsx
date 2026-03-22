import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
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
      if (!u) navigate("/");
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
      
      // Update XP in Firebase
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          xp: increment(15)
        });
      }

      showToast("Article read! +15 XP earned ✨");

      // Check Badges
      const count = newReadRooms.length;
      learningBadges.forEach(badge => {
        if (count === badge.threshold) {
          showToast(`🎉 Badge unlocked: ${badge.name}!`);
        }
      });

      // Special check for Quick Learner (3 in one day) - simplified for now
      // Logic could be improved by storing read dates
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
    <div className="min-h-screen bg-[#F9FBF9] flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {!selectedArticle ? (
          <>
            {/* HERO SECTION */}
            <div className="bg-gradient-to-br from-[#1A5C38] to-[#2E8B57] rounded-[40px] p-12 mb-10 text-white relative overflow-hidden shadow-2xl shadow-green-900/20">
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12">
                <div className="max-w-xl">
                  <h1 className="text-6xl font-black tracking-tighter mb-4 animate-in slide-in-from-left duration-700 leading-[0.9]">🌱 Composting Knowledge Hub</h1>
                  <p className="text-xl font-medium text-green-50 opacity-90 tracking-tight">Master the art of composting with curated guides, real-world videos, and our AI assistant.</p>
                </div>

                <div className="flex-1 w-full max-w-xl">
                  <div className="relative group mb-8">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                      <span className="text-2xl grayscale group-hover:grayscale-0 transition-all opacity-40">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search articles, topics, questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-green-100/50 py-6 pl-16 pr-8 rounded-full text-lg font-bold outline-none focus:bg-white focus:text-[#1A5C38] transition-all duration-500 shadow-2xl shadow-black/10"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setSelectedLevel("All"); setSelectedTopic("All"); }}
                      className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                        selectedLevel === "All" && selectedTopic === "All" ? 'bg-[#F4A300] text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      All
                    </button>
                    {["Beginner", "Intermediate", "Advanced"].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)}
                        className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          selectedLevel === lvl ? 'bg-[#1A5C38] border-2 border-white/20 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                    {["Science", "Methods", "Troubleshooting", "Urban", "Basics"].map(tpc => (
                      <button
                        key={tpc}
                        onClick={() => setSelectedTopic(tpc)}
                        className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          selectedTopic === tpc ? 'bg-[#1A5C38] border-2 border-white/20 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {tpc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.03] rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 right-12 w-64 h-64 bg-green-400 opacity-10 rounded-full blur-2xl"></div>
            </div>

            {/* STATS BAR */}
            <div className="grid grid-cols-4 gap-6 mb-12">
              {[
                { label: "Articles Read", value: `${Math.round((readArticles.length/articles.length)*100)}%`, sub: `${readArticles.length}/${articles.length} Guides`, icon: "🏆" },
                { label: "Saved Guides", value: savedArticles.length, sub: "In Library", icon: "🔖" },
                { label: "Badges Earned", value: learningBadges.filter(b => readArticles.length >= b.threshold).length, sub: "Learning Tier", icon: "💎" },
                { label: "Reading Streak", value: "3", sub: "Days in a row", icon: "🔥" }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-black/5 hover:translate-y-[-4px] transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">{stat.label}</span>
                    <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900 tracking-tighter mb-1">{stat.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* ARTICLES GRID */}
            <div className="grid grid-cols-3 gap-8">
              {filteredArticles.map((article, i) => (
                <div 
                  key={article.id}
                  className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-lg shadow-black/5 flex flex-col hover:shadow-2xl hover:translate-y-[-8px] transition-all duration-500 group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                      article.level === 'Beginner' ? 'bg-green-400 text-green-900' : 
                      article.level === 'Intermediate' ? 'bg-yellow-400 text-yellow-900' : 'bg-orange-400 text-orange-900'
                    }`}>
                      {article.level}
                    </span>
                    <button 
                      onClick={() => toggleSave(article.id)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-[#1A5C38] transition-all"
                    >
                      {savedArticles.includes(article.id) ? "🔖" : "📑"}
                    </button>
                  </div>
                  
                  <div className="p-8 flex-1">
                    <span className="text-[10px] font-black text-[#F4A300] uppercase tracking-[0.2em] mb-3 block">{article.topic}</span>
                    <h3 className="text-xl font-black text-gray-900 leading-tight mb-3 group-hover:text-[#1A5C38] transition-colors">{article.title}</h3>
                    <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">{article.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                      <span>⏱️ {article.readTime}</span>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button onClick={() => handleLike(article.id, 1)} className="p-2 hover:bg-white rounded-xl transition-all">👍 {likes[article.id] || 0}</button>
                      <button onClick={() => handleLike(article.id, -1)} className="p-2 hover:bg-white rounded-xl transition-all">👎</button>
                    </div>
                    {readArticles.includes(article.id) && <span className="text-green-500 font-black text-[10px] uppercase tracking-widest">✅ READ</span>}
                    <button 
                      onClick={() => setSelectedArticle(article)}
                      className="text-[#1A5C38] font-black text-xs uppercase tracking-widest hover:translate-x-1 transition-all"
                    >
                      Read Article →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* BADGES SECTION */}
            <div className="mt-16 bg-white p-12 rounded-[40px] border border-gray-100 shadow-xl shadow-black/5">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-8 flex items-center gap-3">
                <span className="text-3xl">📚</span> Learning Badges
              </h2>
              <div className="grid grid-cols-4 gap-8">
                {learningBadges.map((badge) => {
                  const unlocked = readArticles.length >= badge.threshold;
                  return (
                    <div key={badge.id} className={`p-8 rounded-[32px] text-center border-2 transition-all ${
                      unlocked ? 'bg-amber-50 border-amber-100 shadow-xl shadow-amber-900/5' : 'bg-gray-50 border-dashed border-gray-200 opacity-60'
                    }`}>
                      <div className={`text-5xl mb-6 inline-block p-6 rounded-[24px] ${unlocked ? 'bg-white shadow-lg' : 'grayscale shadow-none'}`}>{badge.icon}</div>
                      <p className={`font-black uppercase tracking-widest text-xs mb-2 ${unlocked ? 'text-amber-800' : 'text-gray-400'}`}>{badge.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{badge.condition}</p>
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
              className="mb-8 flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-[#1A5C38] transition-all group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Hub
            </button>

            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
              <div className="h-[400px] relative">
                <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-10 left-10 right-10">
                  <span className="text-amber-400 font-black text-xs uppercase tracking-[0.3em] mb-4 block">{selectedArticle.topic}</span>
                  <h1 className="text-4xl font-black text-white tracking-tighter mb-4 leading-tight">{selectedArticle.title}</h1>
                  <div className="flex items-center gap-4 text-white/80 text-xs font-black uppercase tracking-widest">
                    <span className="px-3 py-1 bg-white/20 rounded-lg">{selectedArticle.level}</span>
                    <span>⏱️ {selectedArticle.readTime}</span>
                  </div>
                </div>
              </div>

              <div className="p-12">
                <div className="rounded-[32px] overflow-hidden shadow-2xl mb-12 border-8 border-gray-50">
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

                <div className="prose prose-xl max-w-none text-gray-600 font-medium leading-relaxed mb-12 whitespace-pre-line">
                  {selectedArticle.content}
                </div>

                {!readArticles.includes(selectedArticle.id) ? (
                  <button 
                    onClick={() => markAsRead(selectedArticle)}
                    className="w-full py-6 bg-[#1A5C38] text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-green-900/40 hover:scale-[1.02] active:scale-95 transition-all mb-16"
                  >
                    ✅ Mark as Read (+15 XP)
                  </button>
                ) : (
                  <div className="w-full py-6 bg-green-50 text-[#1A5C38] rounded-[24px] font-black text-sm uppercase tracking-[0.2em] text-center border-2 border-green-100 mb-16">
                    ✨ GUIDE COMPLETED ✨
                  </div>
                )}

                {/* AI DOUBT ASSISTANT */}
                <div className="bg-[#1A5C38]/5 rounded-[40px] p-10 border border-[#1A5C38]/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 grayscale pointer-events-none">
                    <span className="text-8xl">🤖</span>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2 flex items-center gap-3">
                      CompostBot AI Assistant
                    </h3>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-8">Have a doubt? Ask anything about {selectedArticle.topic}</p>
                    
                    <div className="flex gap-4 mb-6">
                      <input
                        type="text"
                        placeholder={`Ask anything about ${selectedArticle.title.toLowerCase()}...`}
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        className="flex-1 bg-white border border-gray-100 px-6 py-5 rounded-2xl font-bold text-gray-900 outline-none focus:border-[#1A5C38] transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && askCompostBot()}
                      />
                      <button 
                        disabled={aiLoading}
                        onClick={askCompostBot}
                        className="px-10 bg-[#1A5C38] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {aiLoading ? "Thinking..." : "ASK BOT 🤖"}
                      </button>
                    </div>

                    {aiAnswer && (
                      <div className="bg-white p-8 rounded-3xl border border-green-100 shadow-xl shadow-green-900/5 animate-in slide-in-from-top-4 duration-500">
                        <p className="text-[#1A5C38] font-bold leading-relaxed">{aiAnswer}</p>
                      </div>
                    )}
                    {aiLoading && (
                      <div className="flex items-center gap-3 text-[#1A5C38] font-black text-[10px] uppercase tracking-widest animate-pulse">
                        <div className="w-2 h-2 bg-[#1A5C38] rounded-full animate-bounce"></div>
                        CompostBot is analyzing... 🌱
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
