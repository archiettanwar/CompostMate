import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TopNav from "../components/TopNav";

const MyPerks = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate("/auth");
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
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
                <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Recalling Benefits...</div>
            </div>
        );
    }

    const discount = userData?.discount || 0;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
            <TopNav />
            
            <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
                {/* Top Bar */}
                <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-1">My Perks</h1>
                        <p className="font-semibold uppercase text-[10px] tracking-widest" style={{ color: '#6b7280' }}>Rewards for your sustainable lifestyle</p>
                    </div>
                    <div className="px-5 py-2.5 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: '#22c55e' }}>Active Reward Status</span>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Discount Banner */}
                    <div className="p-12 rounded-2xl relative overflow-hidden group animate-in slide-in-from-right-4 duration-1000" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <span className="text-9xl grayscale">💰</span>
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="text-center md:text-left p-8 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#22c55e' }}>Maintenance Benefit</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-7xl font-bold text-white tracking-tighter">{discount}</span>
                                    <span className="text-3xl font-bold text-white">%</span>
                                </div>
                            </div>

                            <div className="text-center md:text-left flex-1">
                                <h2 className="text-2xl font-bold text-white tracking-tight mb-4 uppercase">Maintenance Discount</h2>
                                {discount > 0 ? (
                                    <div className="p-6 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                                        <p className="text-gray-400 text-sm font-semibold italic leading-relaxed">
                                            "{userData.discountNote || "Excellent composting consistency!"}"
                                        </p>
                                    </div>
                                ) : (
                                    <p className="font-bold uppercase tracking-widest text-[10px] leading-relaxed max-w-sm opacity-60" style={{ color: '#6b7280' }}>
                                        Start logging waste to unlock building-wide discounts set by your building secretary.
                                    </p>
                                )}
                            </div>
                        </div>

                        {discount === 0 && (
                            <button 
                                onClick={() => navigate('/log')}
                                className="relative z-10 px-10 py-5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
                            >
                                Start Logging 🚀
                            </button>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { label: "Total Diverted", value: `${(userData?.totalWasteKg || 0).toFixed(1)}kg`, icon: "⚖️" },
                            { label: "XP Progress", value: userData?.xp || 0, icon: "✨" },
                            { label: "Active Streak", value: `${userData?.streak || 0} Days`, icon: "🔥" }
                        ].map((stat, i) => (
                            <div key={i} className="p-8 rounded-xl transition-all group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div className="text-2xl mb-4 grayscale group-hover:grayscale-0 transition-all">{stat.icon}</div>
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>{stat.label}</p>
                                <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Motivational Card */}
                    <div className="rounded-2xl p-12 text-center relative overflow-hidden group" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="absolute top-0 left-0 w-full h-1 opacity-20" style={{ background: 'linear-gradient(to right, #22c55e, #f59e0b)' }}></div>
                        <span className="text-4xl mb-6 block grayscale group-hover:grayscale-0 transition-all">🌱</span>
                        <h3 className="text-xl font-bold text-white tracking-tight mb-3 uppercase">Your Impact Matters</h3>
                        <p className="font-semibold text-xs uppercase tracking-widest max-w-md mx-auto leading-relaxed" style={{ color: '#4b5563' }}>
                            Every gram of waste you divert reduces methane emissions and leads your building to a zero-waste future.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyPerks;
