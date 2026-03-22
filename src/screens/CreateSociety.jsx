import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from "../lib/firebase";
import { collection, doc, setDoc, addDoc, updateDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "../components/Sidebar";
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
          // Limit: If already has a society, redirect to Admin
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
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Mumbai, India")}&limit=1`
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

  // Map helper components
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
      // Use existing detected location or fetch again
      const location = detectedLocation || await geocodeAddress(name.trim() + " " + city.trim());

      // 1. Create Society document
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

      // 2. Create Invite document (using code as ID)
      await setDoc(doc(db, "invites", code), {
        societyId: newSocietyId,
        createdBy: uid,
        uses: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      });

      // 3. Update User role
      await updateDoc(doc(db, "users", uid), {
        role: "society_admin",
        societyId: newSocietyId,
        flatNumber: flatNumber.trim()
      });

      setGeneratedCode(code);
      showToast("Society Created Successfully! 🎉"); // Added success toast

    } catch (err) {
      console.error("Create Error:", err);
      showToast("Error creating society. Please try again.", "error"); // Replaced alert with showToast
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBF9]">
        <div className="text-[#1A5C38] font-bold animate-pulse uppercase tracking-[0.2em]">Verifying Status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FBF9' }}>
      <Sidebar />
      
      <div className="ml-64 p-10 min-h-screen">
        {/* Top Bar */}
        <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Establish Society</h1>
            <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-widest">Setup your building's composting cluster</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-2xl bg-white border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all cursor-pointer shadow-sm"
          >
            ← Back to Home
          </button>
        </div>

        <div className="max-w-3xl mx-auto">
          {generatedCode ? (
            <div className="bg-white p-12 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50 text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-[24px] flex items-center justify-center text-4xl mx-auto mb-8">🎉</div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-2 uppercase text-[#1A5C38]">Society Created!</h2>
              <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-12">Building a greener community together</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-[#F9FBF9] p-8 rounded-[32px] border border-gray-100 relative group flex flex-col items-center justify-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Invite Code</p>
                  <p className="text-4xl font-black text-[#1A5C38] tracking-[0.3em] mb-4 bg-white px-6 py-3 rounded-2xl shadow-sm">{generatedCode}</p>
                  <button 
                      onClick={() => {
                          navigator.clipboard.writeText(generatedCode);
                          showToast("Code copied! 📋");
                      }}
                      className="text-[10px] font-black text-[#2E8B57] uppercase tracking-widest hover:underline cursor-pointer"
                  >
                      Copy to Clipboard 📋
                  </button>
                </div>

                <div className="bg-[#F9FBF9] p-8 rounded-[32px] border border-gray-100 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Scan to Join</p>
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=COMPOSTMATE-${generatedCode}`} 
                      alt="QR Code"
                      className="w-24 h-24"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin')}
                className="w-full py-5 rounded-2xl bg-[#1A5C38] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#1A5C38]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                Go to Admin Dashboard →
              </button>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[40px] shadow-xl shadow-black/5 border border-gray-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-[#1A5C38]/10 rounded-[20px] flex items-center justify-center text-3xl mx-auto mb-6">🏘️</div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Society Details</h2>
                <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Initialize your building's composting cluster</p>
              </div>

              <form onSubmit={handleCreate} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Society Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Green Heights Residency"
                    className="w-full bg-[#F9FBF9] border-2 border-gray-100 rounded-2xl px-6 py-5 text-sm font-bold text-gray-800 placeholder-gray-300 focus:border-[#1A5C38] focus:ring-0 transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">City</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="flex-1 bg-[#F9FBF9] border-2 border-gray-50 rounded-2xl px-6 py-5 text-sm font-bold text-gray-800 placeholder-gray-300 focus:border-[#1A5C38] focus:ring-0 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleVerifyLocation}
                      disabled={verifyingLocation || !name || !city}
                      className="px-6 rounded-2xl bg-white border-2 border-gray-100 text-[10px] font-black uppercase text-[#1A5C38] hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {verifyingLocation ? "..." : "Verify 📍"}
                    </button>
                  </div>
                </div>

                {detectedLocation && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-100 rounded-2xl animate-in fade-in slide-in-from-left-2 duration-500">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact Point Found</p>
                      <p className="text-[10px] font-bold text-[#1A5C38] leading-relaxed">
                        {detectedLocation.formattedAddress}
                      </p>
                      <p className="text-[8px] font-black text-gray-300 uppercase mt-2">Adjust position by clicking on the map below</p>
                    </div>

                    <div className="h-64 w-full rounded-3xl overflow-hidden border-2 border-gray-100 shadow-inner relative z-10">
                      <MapContainer
                        center={[detectedLocation.lat, detectedLocation.lng]}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker />
                        <ChangeMapView center={[detectedLocation.lat, detectedLocation.lng]} />
                      </MapContainer>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Your Flat Number</label>
                  <input
                    type="text"
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. B-402"
                    className="w-full bg-[#F9FBF9] border-2 border-gray-100 rounded-2xl px-6 py-5 text-sm font-bold text-gray-800 placeholder-gray-300 focus:border-[#1A5C38] focus:ring-0 transition-all outline-none"
                    required
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 rounded-2xl bg-[#1A5C38] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#1A5C38]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Establishing Cluster..." : "Establish Society 🏗️"}
                  </button>
                </div>
              </form>

              <p className="text-center text-[9px] text-gray-300 font-bold uppercase tracking-widest mt-10 px-8 leading-relaxed">
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
