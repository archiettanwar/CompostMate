import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";

const MyPerks = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate("/");
                return;
            }
            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                }
            } catch (err) {
                console.error("Perks Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
                <div className="text-[#1A5C38] font-bold animate-pulse text-xl uppercase tracking-widest">Loading Rewards...</div>
            </div>
        );
    }

    const discount = userData?.discount || 0;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#F9FBF9' }}>
            <Sidebar />
            
            <div className="ml-64 p-10 min-h-screen">
                {/* Top Bar */}
                <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">My Perks 🎁</h1>
                        <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-widest">Rewards for your sustainable lifestyle</p>
                    </div>
                    <div className="hidden lg:flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="px-4 py-2 bg-green-50 rounded-xl">
                            <span className="text-[#1A5C38] font-black text-xs uppercase tracking-widest">Active Reward Status</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto space-y-10">
                    {/* Discount Banner (Dashboard style) */}
                    <div className="p-12 bg-gradient-to-r from-[#1A5C38] to-[#2E8B57] rounded-[40px] shadow-2xl shadow-green-900/10 flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden group animate-in slide-in-from-right-4 duration-1000">
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <span className="text-9xl">💰</span>
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="text-center md:text-left bg-white/10 backdrop-blur-md p-8 rounded-[32px] border border-white/20">
                                <p className="text-[10px] font-black text-green-100 uppercase tracking-widest mb-2">Maintenance Benefit</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-7xl font-black text-white tracking-tighter">{discount}</span>
                                    <span className="text-3xl font-black text-white">%</span>
                                </div>
                            </div>

                            <div className="text-center md:text-left">
                                <h2 className="text-2xl font-black text-white tracking-tight mb-4 uppercase">Maintenance Discount</h2>
                                {discount > 0 ? (
                                    <div className="bg-white/10 p-5 rounded-2xl border border-white/10 max-w-md">
                                        <p className="text-green-50 text-sm font-bold italic leading-relaxed">
                                            "{userData.discountNote || "Excellent composting consistency!"}"
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-green-50 text-xs font-bold uppercase tracking-widest leading-relaxed max-w-sm opacity-80">
                                        Start logging waste to unlock building-wide discounts set by your building secretary.
                                    </p>
                                )}
                            </div>
                        </div>

                        {discount === 0 && (
                            <button 
                                onClick={() => navigate('/log')}
                                className="relative z-10 px-10 py-5 bg-white text-[#1A5C38] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10 cursor-pointer"
                            >
                                Start Logging 🚀
                            </button>
                        )}
                    </div>

                    {/* Stats Row (Dashboard style) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { label: "Total Diverted", value: `${(userData?.totalWasteKg || 0).toFixed(1)}kg`, icon: "⚖️" },
                            { label: "XP Progress", value: userData?.xp || 0, icon: "✨" },
                            { label: "Active Streak", value: `${userData?.streak || 0} Days`, icon: "🔥" }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-8 rounded-3xl shadow-xl shadow-black/5 border border-gray-50 hover:scale-[1.02] transition-transform duration-300">
                                <div className="text-2xl mb-4">{stat.icon}</div>
                                <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Motivational Card (Dashboard style) */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-black/5 p-10 border border-gray-50 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-amber-500 opacity-20"></div>
                        <span className="text-4xl mb-6 block">🌱</span>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-3 uppercase">Your Impact Matters</h3>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                            Every gram of waste you divert reduces methane emissions and leads your building to a zero-waste future.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPerks;
