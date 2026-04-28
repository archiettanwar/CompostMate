import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { collection, doc, setDoc, addDoc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import TopNav from "../components/TopNav";
import { useNotification } from "../context/NotificationContext";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for Leaflet default icon issues with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CreateSociety = () => {
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [generatedCode, setGeneratedCode] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useNotification();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          if (data.societyId) {
            navigate('/admin');
          }
        }
      } else {
        navigate('/');
      }
      setInitialLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const geocodeAddress = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", " + city + ", India")}&limit=1`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          formattedAddress: data[0].display_name
        }
      }
    } catch (err) {
      console.error("Geocoding Error:", err)
    }
    return null
  }

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setDetectedLocation(prev => ({
          ...prev,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          formattedAddress: prev?.formattedAddress || "Manual Selection"
        }));
      },
    });

    return detectedLocation ? (
      <Marker position={[detectedLocation.lat, detectedLocation.lng]} />
    ) : null;
  };

  const ChangeMapView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center) {
        map.setView(center, 14);
      }
    }, [center, map]);
    return null;
  };

  const handleVerifyLocation = async () => {
    if (!name.trim() || !city.trim()) return;
    setVerifyingLocation(true);
    const loc = await geocodeAddress(name.trim() + " " + city.trim());
    setDetectedLocation(loc);
    setVerifyingLocation(false);
    if (loc) showToast("Location verified! 📍");
    else showToast("Could not find address accurately.", "error");
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || loading || userData?.societyId) return;

    setLoading(true);
    const uid = auth.currentUser.uid;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const location = detectedLocation || await geocodeAddress(name.trim() + " " + city.trim());

      const societyRef = await addDoc(collection(db, "societies"), {
        name: name.trim(),
        city: city.trim(),
        adminId: uid,
        memberIds: [uid],
        inviteCode: code,
        lat: location?.lat || null,
        lng: location?.lng || null,
        formattedAddress: location?.formattedAddress || "",
        createdAt: new Date().toISOString()
      });

      const newSocietyId = societyRef.id;
      setSocietyId(newSocietyId);

      await setDoc(doc(db, "invites", code), {
        societyId: newSocietyId,
        createdBy: uid,
        uses: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      await updateDoc(doc(db, "users", uid), {
        role: "society_admin",
        societyId: newSocietyId,
        flatNumber: flatNumber.trim()
      });

      setGeneratedCode(code);
      showToast("Society Created Successfully! 🎉");

    } catch (err) {
      console.error("Create Error:", err);
      showToast("Error creating society. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="font-bold animate-pulse text-xl tracking-widest uppercase text-[#22c55e]">Verifying Status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      <TopNav />
      
      <div className="pt-28 px-6 lg:px-8 pb-10 min-h-screen max-w-7xl mx-auto w-full">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase mb-1">Establish Society</h1>
            <p className="font-semibold uppercase text-[10px] tracking-widest" style={{ color: '#6b7280' }}>Setup your building's composting cluster</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#9ca3af' }}
          >
            ← Back
          </button>
        </div>

        <div className="max-w-3xl mx-auto">
          {generatedCode ? (
            <div className="p-12 rounded-2xl text-center animate-in zoom-in-95 duration-500" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-8 grayscale" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>🎉</div>
              <h2 className="text-2xl font-bold text-white tracking-tight mb-2 uppercase">Society Established!</h2>
              <p className="font-semibold text-[10px] uppercase tracking-widest mb-12" style={{ color: '#4b5563' }}>Building a greener community together</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="p-8 rounded-2xl border relative group flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4">Invite Code</p>
                  <p className="text-4xl font-bold tracking-[0.3em] mb-4 px-6 py-2 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#22c55e' }}>{generatedCode}</p>
                  <button 
                      onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          showToast("Code copied! 📋");
                      }}
                      className="text-[9px] font-bold uppercase tracking-widest hover:underline cursor-pointer"
                      style={{ color: '#16a34a' }}
                  >
                      Copy to Clipboard 📋
                  </button>
                </div>

                <div className="p-8 rounded-2xl border flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4">Scan to Join</p>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=COMPOSTMATE-${generatedCode}&bgcolor=000&color=fff`} 
                      alt="QR Code"
                      className="w-24 h-24 invert opacity-80"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin')}
                className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all cursor-pointer"
                style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
              >
                Go to Admin Dashboard →
              </button>
            </div>
          ) : (
            <div className="p-12 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mx-auto mb-6 grayscale" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>🏘️</div>
                <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Society Details</h2>
                <p className="font-semibold text-[10px] uppercase tracking-widest mt-2" style={{ color: '#4b5563' }}>Initialize your building's composting cluster</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-8">
                <div>
                  <label className="block text-[9px] font-bold text-gray-600 mb-3 uppercase tracking-widest ml-1">Society Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Green Heights Residency"
                    className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white placeholder-gray-800 outline-none transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-600 mb-3 uppercase tracking-widest ml-1">City</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="flex-1 rounded-xl px-6 py-4 text-sm font-bold text-white placeholder-gray-800 outline-none transition-all"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={handleVerifyLocation}
                      disabled={verifyingLocation || !name || !city}
                      className="px-6 rounded-xl border font-bold text-[9px] uppercase tracking-widest transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#22c55e' }}
                    >
                      {verifyingLocation ? "..." : "Verify 📍"}
                    </button>
                  </div>
                </div>

                {detectedLocation && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl animate-in fade-in slide-in-from-left-2 duration-500 border" style={{ backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.1)' }}>
                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Impact Point Found</p>
                      <p className="text-[10px] font-bold text-[#22c55e] leading-relaxed">
                        {detectedLocation.formattedAddress}
                      </p>
                      <p className="text-[8px] font-bold text-gray-600 uppercase mt-2">Adjust position by clicking on the map below</p>
                    </div>

                    <div className="h-64 w-full rounded-2xl overflow-hidden border relative z-10" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <MapContainer
                        center={[detectedLocation.lat, detectedLocation.lng]}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        <LocationMarker />
                        <ChangeMapView center={[detectedLocation.lat, detectedLocation.lng]} />
                      </MapContainer>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] font-bold text-gray-600 mb-3 uppercase tracking-widest ml-1">Your Flat Number</label>
                  <input
                    type="text"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. B-402"
                    className="w-full rounded-xl px-6 py-4 text-sm font-bold text-white placeholder-gray-800 outline-none transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                    required
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 rounded-xl font-bold text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 cursor-pointer"
                    style={{ background: 'linear-gradient(to bottom, #22c55e, #16a34a)', color: 'white', boxShadow: '0 8px 32px rgba(34,197,94,0.3)' }}
                  >
                    {loading ? "Establishing Cluster..." : "Establish Society 🏗️"}
                  </button>
                </div>
              </form>

              <p className="text-center text-[8px] font-bold uppercase tracking-widest mt-10 px-8 leading-relaxed" style={{ color: '#2d2d2d' }}>
                  By establishing a society, you agree to manage the composting lifecycle registry for your building residents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSociety;
