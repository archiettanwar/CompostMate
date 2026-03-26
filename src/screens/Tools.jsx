import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useNotification } from '../context/NotificationContext';

const products = [
  {
    id: "1",
    name: "Composting Bin (20L)",
    category: "Bins",
    description: "Perfect for balcony composting. Airtight lid prevents odors. Ideal for Mumbai apartments.",
    image: "https://images.unsplash.com/photo-1591115765373-520f765f72a7?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    reviews: 1243,
    priceRange: "₹800 - ₹1,500",
    whyNeed: "Every composter needs a bin. This size is perfect for a family of 4 generating daily kitchen waste.",
    tips: "Place in shade, add browns after every greens addition.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=composting+bin+20+liter", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=composting+bin", color: "#2874F0" },
      { store: "Ugaoo", url: "https://www.ugaoo.com/collections/composters", color: "#22c55e" }
    ]
  },
  {
    id: "2",
    name: "Compost Aerator Tool",
    category: "Tools",
    description: "Stainless steel corkscrew tool for turning compost without heavy lifting.",
    image: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=800",
    rating: 4.3,
    reviews: 856,
    priceRange: "₹400 - ₹900",
    whyNeed: "Aeration is the #1 factor in fast composting. This tool makes turning easy and adds efficiency.",
    tips: "Turn every 3 days during thermophilic phase for best results.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=compost+aerator+tool", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=compost+aerator", color: "#2874F0" }
    ]
  },
  {
    id: "3",
    name: "Digital Thermometer",
    category: "Monitoring",
    description: "Long probe thermometer to check internal compost temperature (0-100°C range).",
    image: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    reviews: 432,
    priceRange: "₹600 - ₹1,200",
    whyNeed: "Know exactly which phase your compost is in. Thermophilic phase (40-70°C) means fast decomposition.",
    tips: "Insert 15cm deep into pile. Check morning and evening.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=compost+thermometer", color: "#FF9900" }
    ]
  },
  {
    id: "4",
    name: "Vermicomposting Kit",
    category: "Kits",
    description: "Complete starter kit with bin, red wiggler worms, bedding material and guide.",
    image: "https://images.unsplash.com/photo-1599408665796-030499e74ce6?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    reviews: 678,
    priceRange: "₹1,500 - ₹3,000",
    whyNeed: "Produces the richest compost. Perfect for apartments — no odor, no turning needed.",
    tips: "Keep away from direct sunlight. Feed small amounts daily.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=vermicomposting+kit", color: "#FF9900" },
      { store: "Ugaoo", url: "https://www.ugaoo.com/collections/composters", color: "#22c55e" }
    ]
  }
];

const Tools = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useNotification();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/auth");
    });
    return () => unsubscribe();
  }, [navigate]);

  const categories = ["All", "Bins", "Tools", "Monitoring", "Kits", "Accessories"];

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const askCompostBot = async () => {
    if (!aiQuestion || !selectedProduct) return;
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
              content: `You are CompostBot. The user is looking at a composting tool called ${selectedProduct.name}. Answer their question about this specific tool in under 100 words. Be practical and encouraging.` 
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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {!selectedProduct ? (
          <>
            {/* HERO SECTION */}
            <div className="rounded-3xl p-12 mb-10 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12">
                <div className="max-w-xl">
                  <h1 className="text-5xl font-bold tracking-tight mb-4 animate-in slide-in-from-left duration-700 leading-[1.1]">Essentials Store 🛠️</h1>
                   <p className="text-lg font-medium opacity-80" style={{ color: '#9ca3af' }}>Everything you need for successful composting. Curated tools for modern households.</p>
                </div>

                <div className="flex-1 w-full max-w-xl">
                  <div className="relative group mb-8">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                      <span className="text-xl opacity-40">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search tools & kits..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 py-5 pl-16 pr-8 rounded-2xl text-lg font-semibold outline-none focus:bg-white/10 transition-all duration-300"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          selectedCategory === cat ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                        }`}
                        style={selectedCategory === cat ? { background: 'linear-gradient(to bottom, #22c55e, #16a34a)', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' } : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PRODUCTS GRID */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="rounded-2xl overflow-hidden shadow-2xl flex flex-col hover:translate-y-[-4px] transition-all duration-300 group cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-white" style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)' }}>
                        {product.category}
                      </span>
                    </div>
                    
                    <div className="p-7 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-400 text-xs font-bold">⭐ {product.rating}</span>
                        <span className="text-gray-600 text-[10px] font-bold">({product.reviews} reviews)</span>
                      </div>
                      <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-[#22c55e] transition-colors">{product.name}</h3>
                      <p className="font-bold text-lg mb-4" style={{ color: '#22c55e' }}>{product.priceRange}</p>
                      <p className="text-sm font-medium line-clamp-2 leading-relaxed" style={{ color: '#9ca3af' }}>{product.description}</p>
                    </div>

                    <div className="p-6 pt-0">
                      <button className="w-full py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#22c55e' }}>
                        Details & Shop →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 rounded-2xl border-2 border-dashed" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-6xl mb-6 block">🔍</span>
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">No products found</h3>
                <p className="font-semibold uppercase tracking-widest text-[10px]" style={{ color: '#6b7280' }}>Try a different category or search term</p>
              </div>
            )}
          </>
        ) : (
          /* PRODUCT DETAIL VIEW */
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="mb-8 flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all group"
              style={{ color: '#4b5563' }}
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Store
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
              {/* IMAGE */}
              <div className="relative">
                <div className="sticky top-8">
                  <div className="rounded-3xl overflow-hidden shadow-2xl aspect-square" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-8 flex items-center justify-between p-7 rounded-2xl shadow-xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl grayscale">⭐</span>
                      <div>
                        <p className="text-2xl font-bold text-white">{selectedProduct.rating}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#4b5563' }}>{selectedProduct.reviews} Reviews</p>
                      </div>
                    </div>
                    <span className="px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)' }}>
                      {selectedProduct.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* INFO */}
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-4 leading-tight">{selectedProduct.name}</h1>
                <p className="text-3xl font-bold mb-10" style={{ color: '#22c55e' }}>{selectedProduct.priceRange}</p>

                <div className="space-y-8">
                  <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.1)' }}>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                      Impact Benefits 💡
                    </h3>
                    <p className="font-medium leading-relaxed text-sm" style={{ color: '#9ca3af' }}>{selectedProduct.whyNeed}</p>
                  </div>

                  <div className="p-8 rounded-2xl border" style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.1)' }}>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                      Pro Tips 🌱
                    </h3>
                    <p className="font-medium leading-relaxed text-sm" style={{ color: '#9ca3af' }}>{selectedProduct.tips}</p>
                  </div>

                  <div className="pt-8">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-6" style={{ color: '#4b5563' }}>Available at</h3>
                    <div className="flex flex-wrap gap-4">
                      {selectedProduct.links.map((link, i) => (
                        <a 
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[140px] px-8 py-4 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest text-center transition-all hover:scale-105 active:scale-95 shadow-xl"
                          style={{ backgroundColor: link.color }}
                        >
                          {link.store}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI ASSISTANT SECTION */}
            <div className="p-12 rounded-3xl text-white relative overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-10">
                  <span className="text-5xl grayscale">🤖</span>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight">Expert Consultation</h3>
                    <p className="text-sm font-medium opacity-70" style={{ color: '#9ca3af' }}>Have questions about using {selectedProduct.name.toLowerCase()}?</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
                  <input
                    type="text"
                    placeholder="Ask anything about this tool..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 px-8 py-5 rounded-2xl font-bold text-white placeholder-gray-600 outline-none focus:bg-white/10 transition-all duration-300"
                    onKeyDown={(e) => e.key === 'Enter' && askCompostBot()}
                  />
                  <button 
                    disabled={aiLoading}
                    onClick={askCompostBot}
                    className="px-10 py-5 rounded-2xl font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
                  >
                    {aiLoading ? "Thinking..." : "ASK BOT"}
                  </button>
                </div>

                {aiAnswer && (
                  <div className="mt-8 p-8 rounded-2xl border animate-in slide-in-from-top-4 duration-500 max-w-4xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <p className="text-sm font-bold leading-relaxed text-white">{aiAnswer}</p>
                  </div>
                )}
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-[0.02] rounded-full -mr-32 -mt-32 blur-3xl"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tools;
