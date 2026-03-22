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
    image: "/assets/tools/bin_20l.jpg",
    rating: 4.5,
    reviews: 1243,
    priceRange: "₹800 - ₹1,500",
    whyNeed: "Every composter needs a bin. This size is perfect for a family of 4 generating daily kitchen waste.",
    tips: "Place in shade, add browns after every greens addition.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=composting+bin+20+liter", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=composting+bin", color: "#2874F0" },
      { store: "Ugaoo", url: "https://www.ugaoo.com/collections/composters", color: "#1A5C38" }
    ]
  },
  {
    id: "2",
    name: "Compost Aerator / Turner",
    category: "Tools",
    description: "Stainless steel corkscrew tool for turning compost without heavy lifting.",
    image: "/assets/tools/aerator.jpg",
    rating: 4.3,
    reviews: 856,
    priceRange: "₹400 - ₹900",
    whyNeed: "Aeration is the #1 factor in fast composting. This tool makes turning easy and adds +2% maturity per use in CompostMate.",
    tips: "Turn every 3 days during thermophilic phase for best results.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=compost+aerator+tool", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=compost+aerator", color: "#2874F0" },
      { store: "Nurserylive", url: "https://nurserylive.com/collections/garden-tools", color: "#1A5C38" }
    ]
  },
  {
    id: "3",
    name: "Compost Thermometer",
    category: "Monitoring",
    description: "Long probe thermometer to check internal compost temperature (0-100°C range).",
    image: "/assets/tools/thermometer.jpg",
    rating: 4.6,
    reviews: 432,
    priceRange: "₹600 - ₹1,200",
    whyNeed: "Know exactly which phase your compost is in. Thermophilic phase (40-70°C) means fast decomposition.",
    tips: "Insert 15cm deep into pile. Check morning and evening.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=compost+thermometer", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=soil+thermometer", color: "#2874F0" },
      { store: "Industrybuying", url: "https://www.industrybuying.com/thermometer", color: "#E63946" }
    ]
  },
  {
    id: "4",
    name: "Vermicomposting Kit",
    category: "Kits",
    description: "Complete starter kit with bin, red wiggler worms, bedding material and guide.",
    image: "/assets/tools/vermicompost_kit.jpg",
    rating: 4.7,
    reviews: 678,
    priceRange: "₹1,500 - ₹3,000",
    whyNeed: "Produces the richest compost (worm castings). Perfect for apartments — no odor, no turning needed.",
    tips: "Keep away from direct sunlight. Feed small amounts daily.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=vermicomposting+kit", color: "#FF9900" },
      { store: "Ugaoo", url: "https://www.ugaoo.com/collections/composters", color: "#1A5C38" },
      { store: "Nurserylive", url: "https://nurserylive.com/collections/composting", color: "#2E8B57" }
    ]
  },
  {
    id: "5",
    name: "Bokashi Composting Kit",
    category: "Kits",
    description: "Fermentation-based composting kit with EM bran. Composts meat and dairy too.",
    image: "/assets/tools/bokashi_kit.jpg",
    rating: 4.2,
    reviews: 312,
    priceRange: "₹1,200 - ₹2,500",
    whyNeed: "Only method that handles ALL food waste including meat, fish and dairy. Ready in 2 weeks.",
    tips: "Press waste down firmly, add EM bran after each layer, keep airtight.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=bokashi+composting+kit", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=bokashi+kit", color: "#2874F0" },
      { store: "Ugaoo", url: "https://www.ugaoo.com/collections/composters", color: "#1A5C38" }
    ]
  },
  {
    id: "6",
    name: "Moisture Meter",
    category: "Monitoring",
    description: "3-in-1 soil moisture, pH and sunlight meter. No batteries needed.",
    image: "/assets/tools/soil_meter.jpg",
    rating: 4.1,
    reviews: 892,
    priceRange: "₹300 - ₹700",
    whyNeed: "Compost should be 40-60% moisture. Too dry = slow. Too wet = smelly. This tells you exactly.",
    tips: "Insert probe 10cm deep. Ideal reading: 4-7 on moisture scale.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=soil+moisture+meter", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=soil+moisture+meter", color: "#2874F0" },
      { store: "Industrybuying", url: "https://www.industrybuying.com", color: "#E63946" }
    ]
  },
  {
    id: "7",
    name: "Jute Compost Bags",
    category: "Accessories",
    description: "Biodegradable jute bags for collecting kitchen scraps before adding to bin.",
    image: "/assets/tools/jute_bags.jpg",
    rating: 4.4,
    reviews: 1567,
    priceRange: "₹200 - ₹500",
    whyNeed: "Collect scraps in kitchen without smells. Jute itself is compostable so just throw the bag in.",
    tips: "Keep in freezer if you can't add to bin daily — stops fruit flies.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=jute+compost+bag", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=jute+bag+kitchen", color: "#2874F0" },
      { store: "Craftsvilla", url: "https://www.craftsvilla.com", color: "#8B4513" }
    ]
  },
  {
    id: "8",
    name: "Compost Accelerator / Activator",
    category: "Accessories",
    description: "Microbial powder that speeds up decomposition by 2-3x. Just sprinkle on pile.",
    image: "/assets/tools/accelerator.jpg",
    rating: 4.3,
    reviews: 445,
    priceRange: "₹300 - ₹800",
    whyNeed: "Especially useful in Mumbai's cooler winter months when decomposition slows down naturally.",
    tips: "Add 1 tablespoon per layer of fresh waste. Store in cool dry place.",
    links: [
      { store: "Amazon", url: "https://www.amazon.in/s?k=compost+accelerator", color: "#FF9900" },
      { store: "Flipkart", url: "https://www.flipkart.com/search?q=compost+activator", color: "#2874F0" },
      { store: "Ugaoo", url: "https://www.ugaoo.com/collections/fertilizers", color: "#1A5C38" }
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
      if (!u) navigate("/");
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
    <div className="min-h-screen bg-[#F9FBF9] flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        {!selectedProduct ? (
          <>
            {/* HERO SECTION */}
            <div className="bg-gradient-to-br from-[#1A5C38] to-[#2E8B57] rounded-[40px] p-12 mb-10 text-white relative overflow-hidden shadow-2xl shadow-green-900/20">
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12">
                <div className="max-w-xl">
                  <h1 className="text-6xl font-black tracking-tighter mb-4 animate-in slide-in-from-left duration-700 leading-[0.9]">🛠️ Composting Tools & Accessories</h1>
                  <p className="text-xl font-medium text-green-50 opacity-90 tracking-tight">Everything you need for successful composting. Curated for Indian households.</p>
                </div>

                <div className="flex-1 w-full max-w-xl">
                  <div className="relative group mb-8">
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                      <span className="text-2xl grayscale group-hover:grayscale-0 transition-all opacity-40">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search tools, kits, monitors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-green-100/50 py-6 pl-16 pr-8 rounded-full text-lg font-bold outline-none focus:bg-white focus:text-[#1A5C38] transition-all duration-500 shadow-2xl shadow-black/10"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                          selectedCategory === cat ? 'bg-[#F4A300] text-white shadow-lg' : 'bg-white text-[#1A5C38] hover:bg-white/90'
                        }`}
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
                    className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-lg shadow-black/5 flex flex-col hover:shadow-2xl hover:translate-y-[-8px] transition-all duration-500 group cursor-pointer"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <span className="absolute top-4 left-4 px-3 py-1 bg-[#1A5C38] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        {product.category}
                      </span>
                    </div>
                    
                    <div className="p-8 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-400">⭐ {product.rating}</span>
                        <span className="text-gray-400 text-xs">({product.reviews} reviews)</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 group-hover:text-[#1A5C38] transition-colors">{product.name}</h3>
                      <p className="text-[#1A5C38] font-black text-lg mb-4">{product.priceRange}</p>
                      <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">{product.description}</p>
                    </div>

                    <div className="p-6 pt-0">
                      <button className="w-full py-4 bg-[#1A5C38] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-[#144a2d] transition-all">
                        View & Buy →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
                <span className="text-6xl mb-6 block">🔍</span>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Try a different category or search term</p>
              </div>
            )}
          </>
        ) : (
          /* PRODUCT DETAIL VIEW */
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="mb-8 flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-xs hover:text-[#1A5C38] transition-all group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Tools
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
              {/* LEFT COLUMN: IMAGE */}
              <div className="relative">
                <div className="sticky top-8">
                  <div className="rounded-[40px] overflow-hidden shadow-2xl border-8 border-white aspect-square">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-8 flex items-center justify-between p-6 bg-white rounded-[32px] shadow-xl shadow-black/5">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">⭐</span>
                      <div>
                        <p className="text-2xl font-black text-gray-900">{selectedProduct.rating}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedProduct.reviews} Total Reviews</p>
                      </div>
                    </div>
                    <span className="px-6 py-2 bg-[#1A5C38] text-white rounded-full text-xs font-black uppercase tracking-widest">
                      {selectedProduct.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: INFO */}
              <div>
                <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-4 leading-tight">{selectedProduct.name}</h1>
                <p className="text-4xl font-black text-[#1A5C38] mb-10">{selectedProduct.priceRange}</p>

                <div className="space-y-8">
                  <div className="bg-green-50/50 p-8 rounded-[32px] border border-green-100">
                    <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-3">
                      Why You Need This 💡
                    </h3>
                    <p className="text-gray-600 font-medium leading-relaxed">{selectedProduct.whyNeed}</p>
                  </div>

                  <div className="bg-amber-50/50 p-8 rounded-[32px] border border-amber-100">
                    <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-3">
                      Pro Tips 🌱
                    </h3>
                    <p className="text-gray-600 font-medium leading-relaxed">{selectedProduct.tips}</p>
                  </div>

                  <div className="pt-8">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Where to Buy</h3>
                    <div className="flex flex-wrap gap-4">
                      {selectedProduct.links.map((link, i) => (
                        <a 
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[140px] px-8 py-5 rounded-2xl text-white font-black text-sm text-center transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/5"
                          style={{ backgroundColor: link.color }}
                        >
                          View on {link.store}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI ASSISTANT SECTION */}
            <div className="bg-[#1A5C38] rounded-[48px] p-12 text-white relative overflow-hidden shadow-2xl shadow-green-900/30">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-5xl">🤖</span>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">Ask CompostBot about this tool</h3>
                    <p className="text-green-100/60 font-medium tracking-wide">Have specific questions about how to use {selectedProduct.name.toLowerCase()}?</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 max-w-4xl">
                  <input
                    type="text"
                    placeholder={`Ask anything about ${selectedProduct.name.toLowerCase()}...`}
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 px-8 py-6 rounded-3xl font-bold text-white placeholder-white/40 outline-none focus:bg-white focus:text-[#1A5C38] transition-all duration-500"
                    onKeyDown={(e) => e.key === 'Enter' && askCompostBot()}
                  />
                  <button 
                    disabled={aiLoading}
                    onClick={askCompostBot}
                    className="px-12 py-6 bg-white text-[#1A5C38] rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:bg-green-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {aiLoading ? "Thinking..." : "ASK BOT"}
                  </button>
                </div>

                {aiAnswer && (
                  <div className="mt-8 p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 animate-in slide-in-from-top-4 duration-500 max-w-4xl">
                    <p className="text-lg font-bold leading-relaxed">{aiAnswer}</p>
                  </div>
                )}
              </div>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.05] rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400 opacity-10 rounded-full blur-2xl -ml-20 -mb-20"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tools;
