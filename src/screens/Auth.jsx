import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Initialize Firestore user document
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.email.split("@")[0],
          xp: 0,
          level: 1,
          streak: 0,
          badges: [],
          onboarded: false,
          createdAt: new Date().toISOString()
        });
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Initialize/Update Firestore user document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
        onboarded: false,
        createdAt: new Date().toISOString()
      }, { merge: true });

      navigate("/dashboard");
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBF9] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Decorative Greenery Elements (v0 design) */}
      <div className="absolute top-0 left-0 opacity-20 pointer-events-none">
        <svg width="300" height="300" viewBox="0 0 300 300" className="text-[#1A5C38]">
          <path d="M150,50 Q200,80 220,150 Q200,120 150,150 Q200,180 220,250" stroke="currentColor" strokeWidth="3" fill="none"/>
          <circle cx="150" cy="50" r="8" fill="currentColor"/>
          <circle cx="220" cy="150" r="6" fill="currentColor"/>
          <circle cx="220" cy="250" r="8" fill="currentColor"/>
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 opacity-20 pointer-events-none">
        <svg width="400" height="400" viewBox="0 0 400 400" className="text-[#1A5C38]">
          <path d="M350,350 Q300,300 280,200 Q300,250 350,200 Q300,150 280,50" stroke="currentColor" strokeWidth="4" fill="none"/>
          <circle cx="350" cy="350" r="10" fill="currentColor"/>
          <circle cx="280" cy="200" r="8" fill="currentColor"/>
          <circle cx="280" cy="50" r="10" fill="currentColor"/>
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-100">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#1A5C38]/10 mb-5 shadow-inner">
              <svg width="60" height="60" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" stroke="#1A5C38" strokeWidth="2.5" opacity="0.3"/>
                <path d="M30 35 Q25 40 28 50 Q35 48 38 40" fill="#1A5C38" opacity="0.7"/>
                <path d="M40 20 Q35 30 40 45 Q45 30 40 20" fill="#1A5C38"/>
                <path d="M50 35 Q55 40 52 50 Q45 48 42 40" fill="#1A5C38" opacity="0.7"/>
                <path d="M40 50 L45 62 L50 50" stroke="#1A5C38" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="40" cy="58" r="2" fill="#1A5C38"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[#1A5C38] tracking-tight">CompostMate</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Turning waste into gold</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs text-center font-bold animate-in fade-in slide-in-from-top-2">
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`w-full bg-[#F9FBF9] border rounded-xl px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none ${
                  focusedField === 'email' ? 'border-[#1A5C38] ring-4 ring-[#1A5C38]/10 shadow-sm' : 'border-gray-200'
                }`}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest ml-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`w-full bg-[#F9FBF9] border rounded-xl px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none ${
                  focusedField === 'password' ? 'border-[#1A5C38] ring-4 ring-[#1A5C38]/10 shadow-sm' : 'border-gray-200'
                }`}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A5C38] text-white font-bold rounded-xl py-4 mt-4 transition-all duration-300 hover:bg-[#1A5C38]/90 active:scale-[0.97] shadow-lg shadow-[#1A5C38]/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full bg-white border border-gray-200 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 text-gray-600 font-bold text-sm transition-all duration-200 hover:bg-gray-50 active:scale-[0.97] shadow-sm disabled:opacity-70"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Toggle Link */}
          <div className="text-center mt-8">
            <span className="text-sm text-gray-400 font-medium">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-[#1A5C38] font-extrabold hover:text-[#1A5C38]/80 transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </span>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-8">
          Sustainable waste management made simple
        </p>
      </div>
    </div>
  );
};

export default Auth;
