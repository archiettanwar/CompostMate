import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithRedirect,
  getRedirectResult,
  indexedDBLocalPersistence,
  setPersistence
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, getUserRole } from "../lib/firebase.js";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  // Handle Google Redirect Result
  React.useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          await handlePostAuth(user);
        }
      } catch (err) {
        console.error("Redirect Result Error:", err);
        setError(err.message.replace("Firebase: ", ""));
      }
    };
    handleRedirectResult();
  }, []);

  const handlePostAuth = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
        profilePic: user.photoURL || "",
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
        role: "resident",
        societyId: null,
        flatNumber: "",
        discount: 0,
        discountNote: "",
        onboarded: false,
        createdAt: new Date().toISOString()
      });
    }

    const role = await getUserRole(user.uid);
    if (role === "society_admin") navigate("/admin");
    else if (role === "super_admin") navigate("/superadmin");
    else navigate("/dashboard");
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let user;
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          name: username.trim() || user.email.split("@")[0],
          profilePic: "",
          xp: 0,
          level: 1,
          streak: 0,
          badges: [],
          role: "resident",
          societyId: null,
          flatNumber: "",
          discount: 0,
          discountNote: "",
          onboarded: false,
          createdAt: new Date().toISOString()
        });
      }

      const role = await getUserRole(user.uid);
      if (role === "society_admin") navigate("/admin");
      else if (role === "super_admin") navigate("/superadmin");
      else navigate("/dashboard");
      
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
      // Use indexedDB for better survival on mobile reloads
      await setPersistence(auth, indexedDBLocalPersistence);
      
      // Use redirect for mobile compatibility
      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError(err.message.replace("Firebase: ", ""));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Decorative gradient orbs */}
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="rounded-2xl p-8 sm:p-10 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-5" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <span className="text-4xl">🌱</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">CompostMate</h1>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Turning waste into gold</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm text-center font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-semibold mb-2 uppercase tracking-widest ml-1" style={{ color: '#6b7280' }}>
                  Full Name / Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. EcoWarrior"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 transition-all duration-200 focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: focusedField === 'username' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: focusedField === 'username' ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none'
                  }}
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold mb-2 uppercase tracking-widest ml-1" style={{ color: '#6b7280' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 transition-all duration-200 focus:outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: focusedField === 'email' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none'
                }}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold mb-2 uppercase tracking-widest ml-1" style={{ color: '#6b7280' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 transition-all duration-200 focus:outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: focusedField === 'password' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none'
                }}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold rounded-xl py-4 mt-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: 'linear-gradient(to bottom, #22c55e, #16a34a)',
                boxShadow: '0 8px 32px rgba(34,197,94,0.25)'
              }}
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
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}></div>
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 font-semibold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-70 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#9ca3af'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
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
            <span className="text-sm font-medium" style={{ color: '#6b7280' }}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="font-bold hover:opacity-80 transition-colors cursor-pointer"
                style={{ color: '#22c55e' }}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </span>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] mt-8" style={{ color: '#6b7280' }}>
          Sustainable waste management made simple
        </p>
      </div>
    </div>
  );
};

export default Auth;
