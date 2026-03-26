import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";

// Inline Button Component
const Button = React.forwardRef(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    const variants = {
      default: "bg-white text-black hover:bg-gray-100",
      secondary: "bg-gray-800 text-white hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-white",
      gradient: "bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d] text-white hover:scale-105 active:scale-95 shadow-lg shadow-green-600/30"
    };

    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base"
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icons
const ArrowRight = ({ className = "", size = 16 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const MenuIcon = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const XIcon = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const Leaf = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const Recycle = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
    <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
    <path d="m14 16-3 3 3 3" />
    <path d="M8.293 13.596 4.875 8.052l-3.633 2.1" />
    <path d="M7.025 9.798 10.443 4.254l-3.633-2.1" />
    <path d="m14.834 7.588 4.283 7.417" />
    <path d="m17.6 4.2 2.6.8-.8 2.6" />
  </svg>
);

const Users = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BarChart = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </svg>
);

const Trophy = ({ className = "", size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

// Navigation Component
const Navigation = memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const goToAuth = () => navigate("/auth");

  return (
    <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-semibold text-white">CompostMate</span>
          </div>

          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">
              How it Works
            </a>
            <a href="#community" className="text-sm text-white/60 hover:text-white transition-colors">
              Community
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button type="button" variant="ghost" size="sm" onClick={goToAuth}>
              Sign in
            </Button>
            <Button type="button" variant="default" size="sm" onClick={goToAuth}>
              Sign Up
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden text-white cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50 animate-[slideDown_0.3s_ease-out]">
          <div className="px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
              How it Works
            </a>
            <a href="#community" className="text-sm text-white/60 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
              Community
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-gray-800/50">
              <Button type="button" variant="ghost" size="sm" onClick={goToAuth}>
                Sign in
              </Button>
              <Button type="button" variant="default" size="sm" onClick={goToAuth}>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Hero Component
const Hero = memo(() => {
  const navigate = useNavigate();

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-start px-6 py-20 md:py-24"
      style={{ animation: "fadeIn 0.6s ease-out" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        .landing-page * {
          font-family: 'Poppins', sans-serif;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full mt-12">
        <span className="text-xs text-center whitespace-nowrap" style={{ color: '#9ca3af' }}>
          🌿 Join 500+ households composting smarter
        </span>
        <a
          href="#features"
          className="flex items-center gap-1 text-xs hover:text-white transition-all active:scale-95 whitespace-nowrap"
          style={{ color: '#9ca3af' }}
          aria-label="Learn more about features"
        >
          Learn more
          <ArrowRight size={12} />
        </a>
      </aside>

      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-tight mb-6"
        style={{
          background: "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.05em"
        }}
      >
        Turn Your Kitchen Waste <br />Into Garden Gold
      </h1>

      <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-10" style={{ color: '#9ca3af' }}>
        Track, learn, and compete with your community. <br />CompostMate gamifies composting so you can reduce waste and grow greener.
      </p>

      <div className="flex items-center gap-4 relative z-10 mb-16">
        <Button
          type="button"
          variant="gradient"
          size="lg"
          className="rounded-lg flex items-center justify-center font-semibold"
          aria-label="Get started with CompostMate"
          onClick={() => navigate("/auth")}
        >
          Get Started
          <ArrowRight size={16} />
        </Button>
      </div>

      <div className="w-full max-w-5xl relative pb-20">
        {/* Glow effect */}
        <div
          className="absolute left-1/2 w-[90%] pointer-events-none z-0"
          style={{ top: "-23%", transform: "translateX(-50%)" }}
          aria-hidden="true"
        >
          <div
            className="w-full h-64 rounded-full"
            style={{
              background: "radial-gradient(ellipse at center, rgba(34,197,94,0.25) 0%, rgba(22,163,74,0.1) 40%, transparent 70%)",
              filter: "blur(40px)",
              animation: "pulse-glow 4s ease-in-out infinite"
            }}
          />
        </div>

        <div className="relative z-10">
          <img
            src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&h=675&fit=crop&q=80"
            alt="Beautiful garden with rich compost soil and green plants growing"
            className="w-full h-auto rounded-lg shadow-2xl border border-gray-800/50"
            loading="eager"
          />
          {/* Gradient overlay on image */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)"
            }}
          />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Features Section
const Features = memo(() => {
  const features = [
    {
      icon: <Recycle size={28} />,
      title: "Smart Waste Logging",
      description: "Log your kitchen waste with AI-powered categorization. Track carbon-to-nitrogen ratios automatically."
    },
    {
      icon: <BarChart size={28} />,
      title: "Real-time Analytics",
      description: "Monitor your composting progress with beautiful dashboards. See your environmental impact over time."
    },
    {
      icon: <Trophy size={28} />,
      title: "Gamified Experience",
      description: "Earn XP, badges, and climb the leaderboard. Compete with your building and community."
    },
    {
      icon: <Users size={28} />,
      title: "Community Challenges",
      description: "Join your housing society and participate in collective composting goals and challenges."
    },
    {
      icon: <Leaf size={28} />,
      title: "Expert Guidance",
      description: "Ask CompostBot anything. Get AI-powered tips, troubleshooting, and learn composting best practices."
    },
    {
      icon: <Recycle size={28} />,
      title: "Cycle Tracking",
      description: "Track compost maturity from fresh waste to garden-ready gold. Never miss a turning day."
    }
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span
            className="text-xs font-semibold uppercase tracking-widest mb-4 block"
            style={{ color: '#22c55e' }}
          >
            Features
          </span>
          <h2
            className="text-3xl md:text-4xl font-medium mb-4"
            style={{
              background: "linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.7))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em"
            }}
          >
            Everything you need to compost smarter
          </h2>
          <p style={{ color: '#9ca3af' }} className="max-w-xl mx-auto text-sm">
            From logging waste to earning rewards — CompostMate makes sustainable living engaging and effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm hover:border-green-800/50 hover:bg-gray-900/50 transition-all duration-300 group"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors duration-300"
                style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
              >
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
              <p style={{ color: '#9ca3af' }} className="text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

Features.displayName = "Features";

// How It Works Section
const HowItWorks = memo(() => {
  const navigate = useNavigate();

  const steps = [
    {
      step: "01",
      title: "Sign Up & Join",
      description: "Create your account and join your housing society to start tracking waste collectively."
    },
    {
      step: "02",
      title: "Log Your Waste",
      description: "Log your daily kitchen waste — greens, browns, food scraps. AI categorizes it for you."
    },
    {
      step: "03",
      title: "Learn & Grow",
      description: "Get personalized tips from CompostBot. Read guides, earn XP, and level up your composting skills."
    },
    {
      step: "04",
      title: "Compete & Win",
      description: "Climb the leaderboard, earn badges, and unlock perks from your society admin."
    }
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-gray-800/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span
            className="text-xs font-semibold uppercase tracking-widest mb-4 block"
            style={{ color: '#22c55e' }}
          >
            How it Works
          </span>
          <h2
            className="text-3xl md:text-4xl font-medium"
            style={{
              background: "linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.7))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em"
            }}
          >
            Start composting in 4 simple steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((item, index) => (
            <div
              key={index}
              className="relative p-8 rounded-xl border border-gray-800/50 bg-gray-900/20 hover:bg-gray-900/40 transition-all duration-300"
            >
              <span
                className="text-5xl font-black absolute top-6 right-6"
                style={{ color: 'rgba(34,197,94,0.1)' }}
              >
                {item.step}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-4"
                style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
              >
                {index + 1}
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
              <p style={{ color: '#9ca3af' }} className="text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="rounded-lg font-semibold"
            onClick={() => navigate("/auth")}
          >
            Start Your Journey
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
});

HowItWorks.displayName = "HowItWorks";

// Stats Section
const Stats = memo(() => {
  const stats = [
    { value: "500+", label: "Active Composters" },
    { value: "2.5T", label: "Waste Diverted" },
    { value: "50+", label: "Societies Joined" },
    { value: "98%", label: "User Satisfaction" }
  ];

  return (
    <section id="community" className="py-20 px-6 border-t border-gray-800/30">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{
                  background: "linear-gradient(to bottom, #22c55e, #16a34a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                {stat.value}
              </p>
              <p style={{ color: '#9ca3af' }} className="text-xs font-medium uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

Stats.displayName = "Stats";

// Footer
const Footer = memo(() => {
  const navigate = useNavigate();

  return (
    <footer className="py-16 px-6 border-t border-gray-800/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="text-lg font-semibold text-white">CompostMate</span>
            <span className="text-xs ml-2" style={{ color: '#6b7280' }}>Turning waste into gold</span>
          </div>

          <div className="flex items-center gap-8">
            <a href="#features" className="text-sm hover:text-white transition-colors" style={{ color: '#9ca3af' }}>
              Features
            </a>
            <a href="#how-it-works" className="text-sm hover:text-white transition-colors" style={{ color: '#9ca3af' }}>
              How it Works
            </a>
            <a href="#community" className="text-sm hover:text-white transition-colors" style={{ color: '#9ca3af' }}>
              Community
            </a>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </Button>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800/30 text-center">
          <p className="text-xs" style={{ color: '#6b7280' }}>
            © 2026 CompostMate. Sustainable waste management made simple.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

// Main Landing Page
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white landing-page">
      <Navigation />
      <Hero />
      <Features />
      <Stats />
      <HowItWorks />
      <Footer />
    </main>
  );
}
