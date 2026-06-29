import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { 
  Sparkles, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Search, 
  FileText, 
  Brain, 
  Globe, 
  Check, 
  ChevronDown, 
  Play, 
  ArrowRight, 
  Lock, 
  ShieldCheck,
  Trophy,
  MessageSquare,
  Zap,
  Activity
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// Mock Chart Data for Live Preview
const previewChartData = {
  youtube: [
    { name: "Jan", followers: 450000, views: 2400000 },
    { name: "Feb", followers: 520000, views: 3100000 },
    { name: "Mar", followers: 610000, views: 4200000 },
    { name: "Apr", followers: 780000, views: 5800000 },
    { name: "May", followers: 950000, views: 7900000 },
    { name: "Jun", followers: 1200000, views: 10500000 },
  ],
  twitter: [
    { name: "Jan", followers: 120000, views: 800000 },
    { name: "Feb", followers: 145000, views: 1100000 },
    { name: "Mar", followers: 190000, views: 1600000 },
    { name: "Apr", followers: 230000, views: 2100000 },
    { name: "May", followers: 310000, views: 3400000 },
    { name: "Jun", followers: 450000, views: 4800000 },
  ],
  instagram: [
    { name: "Jan", followers: 300000, views: 1200000 },
    { name: "Feb", followers: 350000, views: 1700000 },
    { name: "Mar", followers: 420000, views: 2500000 },
    { name: "Apr", followers: 560000, views: 3900000 },
    { name: "May", followers: 680000, views: 5100000 },
    { name: "Jun", followers: 850000, views: 6700000 },
  ]
};

/*
========================================
Animated Counter Component
========================================
A safe, dependency-free counter that works consistently across
all environments (avoiding ESM/CommonJS wrapper mismatch crashes).
*/
function AnimatedCounter({ end, duration = 1.5, decimals = 0, suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const current = progress * end;
      setCount(current);
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration]);

  return (
    <span>
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState("youtube");
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState({});

  // Detect scroll to blur Navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (index) => {
    setFaqOpen((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleStartFree = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/register");
    }
  };

  const handleWatchDemo = () => {
    const previewSection = document.getElementById("demo-preview");
    if (previewSection) {
      previewSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Features List
  const features = [
    {
      title: "Competitor Tracking",
      description: "Directly audit metrics between any channel node or handle. Keep tabs on competitor growth differentials.",
      icon: Trophy,
      color: "from-blue-500 to-indigo-500",
    },
    {
      title: "Growth Analytics",
      description: "Map historical follower benchmarks, total video views, and daily increases over structured snapshots.",
      icon: TrendingUp,
      color: "from-indigo-500 to-purple-500",
    },
    {
      title: "Engagement Analysis",
      description: "Calculate accurate engagement metrics dynamically matching likes, comments, and views ratios.",
      icon: BarChart3,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "AI Strategy Insights",
      description: "Leverage advanced LLM models to review your dashboard state and generate video hooks and content strategies.",
      icon: Brain,
      color: "from-pink-500 to-rose-500",
    },
    {
      title: "Automated PDF Reports",
      description: "Export clean statistical PDF and Excel summaries of your channels and comparisons instantly.",
      icon: FileText,
      color: "from-emerald-500 to-teal-500",
    },
    {
      title: "Cross Platform Hub",
      description: "Aggregate YouTube channels, X profiles, and other nodes into one singular cloud-deployed workspace.",
      icon: Globe,
      color: "from-amber-500 to-orange-500",
    },
  ];

  // How it works steps
  const steps = [
    {
      num: "01",
      title: "Paste Profile URL",
      description: "Input any public YouTube URL, Twitter handle, or video link into our core analyzer parser."
    },
    {
      num: "02",
      title: "Analyze Performance",
      description: "Our platform processes the request, bypasses bot shields, and extracts structured statistics."
    },
    {
      num: "03",
      title: "Compare Competitors",
      description: "Group separate accounts and map historical snapshots side-by-side on interactive timelines."
    },
    {
      num: "04",
      title: "Generate AI Insights",
      description: "Receive specific hooks, SEO tweaks, and actionable optimization strategies based on live analysis."
    }
  ];

  // Pricing Plans
  const plans = [
    {
      name: "Free Sandbox",
      price: "$0",
      description: "Perfect for testing basic analyzer functionalities.",
      features: [
        "Up to 2 monitored account nodes",
        "Manual sync frequency (12h cooldown)",
        "Basic video metrics overview",
        "Limited to 3 AI insight summaries/mo",
        "Standard community support"
      ],
      cta: "Get Started",
      highlight: false,
      link: "/register"
    },
    {
      name: "Creator Pro",
      price: "$29",
      period: "/month",
      description: "Advanced intelligence tools built for professional creators and growing brands.",
      features: [
        "Up to 15 monitored account nodes",
        "Automated hourly platform synchronization",
        "Unlimited competitor comparison matrixes",
        "Unlimited AI strategies (powered by Llama-3)",
        "One-click PDF/Excel reports export",
        "Priority developer support desk"
      ],
      cta: "Start Free Pro Trial",
      highlight: true,
      link: "/register"
    },
    {
      name: "Enterprise Core",
      price: "Custom",
      description: "Tailored scraping clusters and custom SLA metrics for agencies.",
      features: [
        "Unlimited platform account nodes",
        "Real-time continuous sync schedules",
        "Custom Playwright scraper proxies",
        "Dedicated database instance (MongoDB cluster)",
        "Tailored custom AI model tuning",
        "Dedicated account strategist"
      ],
      cta: "Schedule Demo",
      highlight: false,
      link: "/login"
    }
  ];

  // FAQ Accordion items
  const faqs = [
    {
      q: "Which social media platforms are currently supported?",
      a: "SocialIQ currently supports full analytics tracking, channel audits, and recent video indexing for YouTube, alongside username/status parsing for X (formerly Twitter). Platforms like Instagram, TikTok, and Threads are currently on our active development map."
    },
    {
      q: "Does this require official API keys for tracking competitors?",
      a: "No! For public tracking, our system combines official public endpoints and headless browser scrapers. You do not need to connect your competitors' credentials to track their publicly visible statistics."
    },
    {
      q: "How does the AI strategy generator formulate insights?",
      a: "Our AI engine connects directly to high-throughput Groq LLM clusters. It reads your channel's historical performance, video metrics, and competitor comparison differentials, using this context to output custom optimizations and content outlines."
    },
    {
      q: "Can I export data for reporting?",
      a: "Absolutely. Standard and Pro users can generate export files in both PDF (fully branded layout summaries) and CSV/XLSX formats directly from the 'Saved Reports' panel."
    }
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 antialiased overflow-x-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] -z-10 pointer-events-none"></div>
      <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-1/3 w-[500px] h-[500px] bg-pink-600/5 rounded-full blur-[150px] -z-10 pointer-events-none"></div>

      {/* Sticky Header */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-[#090a0f]/80 backdrop-blur-md border-b border-white/[0.06] py-4" : "bg-transparent py-6"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex flex-col text-left">
              <h1 className="text-2xl font-black text-white tracking-wider flex items-center gap-1">
                Social<span className="text-indigo-400">IQ</span>
              </h1>
              <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
                AI Analytics Platform
              </span>
            </Link>

            {/* Navigation links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-350 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-sm font-medium text-slate-350 hover:text-white transition">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-slate-350 hover:text-white transition">FAQ</a>
            </div>
          </div>

          {/* Auth triggers */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white flex items-center justify-center transition shadow-lg shadow-indigo-600/20">
                Go to Workspace <ArrowRight size={14} className="ml-2" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition px-3">
                  Sign In
                </Link>
                <Link to="/register" className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white flex items-center justify-center transition shadow-lg shadow-indigo-600/25">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-40 md:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
            <Sparkles size={12} className="text-indigo-400" />
            <span>Next-Gen Analytics Engine V2</span>
          </div>

          {/* Main H1 Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] sm:leading-[1.15]">
            Track, Compare & Analyze <br className="hidden sm:inline" />
            <span className="text-[#7C5CFC]">Social Media Growth</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Monitor YouTube, Twitter, and more from one powerful dashboard. Leverage AI-driven optimizations to scale your channels faster.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={handleStartFree}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white flex items-center justify-center transition shadow-lg shadow-indigo-600/30 group active:translate-y-[1px]"
            >
              {isAuthenticated ? "Enter Workspace" : "Start Free"}
              <ArrowRight size={15} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleWatchDemo}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] font-semibold text-sm text-white flex items-center justify-center transition gap-2 active:translate-y-[1px]"
            >
              <Play size={14} className="text-slate-400 fill-slate-400" />
              Watch Demo
            </button>
          </div>
        </motion.div>

        {/* Dashboard Mockup Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 sm:mt-24 relative max-w-5xl mx-auto rounded-2xl border border-white/[0.08] bg-slate-950/40 p-4 backdrop-blur-3xl shadow-[0_0_80px_-10px_rgba(99,102,241,0.15)] overflow-hidden"
        >
          {/* Header Controls mockup */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/40 block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/40 block"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/40 block"></span>
            </div>
            <div className="px-4 py-1 rounded-lg bg-white/[0.04] text-[10px] text-slate-500 font-mono tracking-wider">
              platform-node: active_session_overview
            </div>
          </div>

          {/* Grid Mockup details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Stat Box 1 */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Channel Subscribers</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-semibold">+14.2%</span>
              </div>
              <h3 className="text-2xl font-black text-white">1,248,300</h3>
              <p className="text-[10px] text-slate-400 mt-1">Live YouTube metrics sync</p>
            </div>

            {/* Stat Box 2 */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Accumulated Views</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold">+8.5%</span>
              </div>
              <h3 className="text-2xl font-black text-white">45,820,490</h3>
              <p className="text-[10px] text-slate-400 mt-1">Daily scraper updates</p>
            </div>

            {/* Stat Box 3 */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Engagement Delta</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-semibold">4.82%</span>
              </div>
              <h3 className="text-2xl font-black text-white">Top 2% Creator</h3>
              <p className="text-[10px] text-slate-400 mt-1">Weighted platforms score</p>
            </div>
          </div>

          {/* Area Chart mockup */}
          <div className="h-64 w-full mt-6 bg-white/[0.01] border border-white/[0.04] rounded-xl p-4">
            <ResponsiveContainer width="100%" height={220} minHeight={100}>
              <AreaChart data={previewChartData.youtube}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#111319", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} 
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-t border-white/[0.06] bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold">Advanced Core Suite</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Designed for Modern Creators & Brands</h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Every tool you need to track channel status, perform detailed comparisons, and receive AI strategy advice, all deployed on Railway server hubs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors relative overflow-hidden group text-left"
                >
                  {/* Decorative glowing gradient */}
                  <div className={`absolute -right-10 -top-10 w-24 h-24 bg-gradient-to-br ${feat.color} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-all duration-300`} />
                  
                  {/* Icon Container */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} bg-opacity-20 flex items-center justify-center mb-6 border border-white/[0.1]`}>
                    <Icon size={20} className="text-white" />
                  </div>

                  <h4 className="text-lg font-bold text-white mb-2">{feat.title}</h4>
                  <p className="text-xs sm:text-sm text-slate-450 leading-relaxed">{feat.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold">Workflow Pipeline</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">How SocialIQ Generates Audits</h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              From pasting a simple URL to receiving deep strategic recommendations, the process is streamlined and fully automated.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Timeline connector line (Desktop only) */}
            <div className="hidden lg:block absolute top-[64px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-indigo-500/10 via-indigo-500/40 to-indigo-500/10 -z-10"></div>

            {steps.map((st, index) => (
              <div key={index} className="text-left space-y-4 p-6 rounded-2xl bg-white/[0.01] border border-white/[0.04] relative">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-sm">
                  {st.num}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white pt-2">{st.title}</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{st.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Live Dashboard Preview Section */}
      <section id="demo-preview" className="py-24 border-t border-white/[0.06] bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold">Interactive Live Demo</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Experience the Platform Real-Time</h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Select platform domains below to view how mock stats, calculated engagement indices, and historical vectors look inside your workspace.
            </p>
          </div>

          {/* Platform Toggles */}
          <div className="flex justify-center gap-3 mb-10">
            {["youtube", "twitter", "instagram"].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border uppercase tracking-wider transition ${
                  selectedPlatform === plat
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10"
                    : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white"
                }`}
              >
                {plat === "twitter" ? "X / Twitter" : plat}
              </button>
            ))}
          </div>

          {/* Interactive Stats and Chart Card */}
          <div className="bg-slate-950/40 border border-white/[0.08] rounded-2xl p-6 sm:p-8 backdrop-blur-3xl shadow-xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
              {/* Stat Card 1 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Followers Node</span>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  <AnimatedCounter
                    end={selectedPlatform === "youtube" ? 1200000 : selectedPlatform === "twitter" ? 450000 : 850000}
                    duration={1.5}
                  />
                </h4>
                <p className="text-[10px] text-green-400 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp size={10} /> +12.4% MoM
                </p>
              </div>

              {/* Stat Card 2 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Estimated Views</span>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  <AnimatedCounter
                    end={selectedPlatform === "youtube" ? 10500000 : selectedPlatform === "twitter" ? 4800000 : 6700000}
                    duration={1.5}
                  />
                </h4>
                <p className="text-[10px] text-green-400 font-semibold mt-1 flex items-center gap-1">
                  <TrendingUp size={10} /> +18.2% MoM
                </p>
              </div>

              {/* Stat Card 3 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Engagement Rate</span>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  <AnimatedCounter
                    end={selectedPlatform === "youtube" ? 4.82 : selectedPlatform === "twitter" ? 3.10 : 2.56}
                    decimals={2}
                    duration={1}
                    suffix="%"
                  />
                </h4>
                <p className="text-[10px] text-indigo-400 font-semibold mt-1">Optimal creator benchmark</p>
              </div>

              {/* Stat Card 4 */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Weekly Growth %</span>
                <h4 className="text-xl sm:text-2xl font-black text-white">
                  <AnimatedCounter
                    end={selectedPlatform === "youtube" ? 18.5 : selectedPlatform === "twitter" ? 14.2 : 11.8}
                    decimals={2}
                    duration={1}
                    suffix="%"
                  />
                </h4>
                <p className="text-[10px] text-green-400 font-semibold mt-1">Accelerated path</p>
              </div>
            </div>

            {/* Dynamic Recharts Area Chart */}
            <div className="h-72 w-full bg-white/[0.01] border border-white/[0.04] rounded-xl p-4">
              <ResponsiveContainer width="100%" height={250} minHeight={100}>
                <AreaChart data={previewChartData[selectedPlatform]}>
                  <defs>
                    <linearGradient id="colorPlatViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: "#111319", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }} 
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area type="monotone" dataKey="followers" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorPlatViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-20 border-t border-white/[0.06] bg-gradient-to-b from-transparent via-[#0f111a] to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              <AnimatedCounter end={10000} duration={2} suffix="+" />
            </h3>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Reports Generated</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              <AnimatedCounter end={500} duration={2} suffix="+" />
            </h3>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Creators Tracked</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
              <AnimatedCounter end={50} duration={2.5} suffix="M+" />
            </h3>
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Data Points Processed</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold">Structured Pricing</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white">Find a Plan for Your Workspace</h3>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Transparent, scalable subscription tiers matching your creator nodes count. Upgrade/downgrade at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((p, index) => (
              <div
                key={index}
                className={`p-8 rounded-2xl bg-white/[0.02] border transition flex flex-col justify-between text-left relative overflow-hidden ${
                  p.highlight 
                    ? "border-indigo-500 bg-indigo-600/[0.02] shadow-[0_0_50px_rgba(99,102,241,0.1)]" 
                    : "border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {p.highlight && (
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-indigo-500 text-[10px] font-bold text-white uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-white">{p.name}</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-white tracking-tight">{p.price}</span>
                    {p.period && <span className="text-slate-400 text-xs ml-1 font-semibold">{p.period}</span>}
                  </div>

                  <div className="h-[1px] bg-white/[0.06] w-full"></div>

                  <ul className="space-y-3">
                    {p.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start text-xs text-slate-350 leading-relaxed">
                        <Check size={14} className="text-indigo-400 shrink-0 mr-2.5 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link
                    to={p.link}
                    className={`w-full h-11 rounded-xl flex items-center justify-center font-bold text-xs uppercase tracking-wider transition ${
                      p.highlight
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10"
                        : "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-white/[0.06] bg-slate-950/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-indigo-400 font-extrabold">Common Queries</h2>
            <h3 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between text-white font-bold text-sm sm:text-base focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-300 ${
                      faqOpen[index] ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {faqOpen[index] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-6 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/[0.03] pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="py-16 border-t border-white/[0.06] bg-slate-950/40 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-base font-black text-white tracking-wider flex items-center justify-center md:justify-start gap-1">
              Social<span className="text-indigo-400">IQ</span>
            </h2>
            <p className="text-[10px]">Real-time cloud analytics for creator nodes.</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 font-medium">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#pricing" className="hover:text-white transition">Pricing</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <Link to="/login" className="hover:text-white transition">Documentation</Link>
            <Link to="/login" className="hover:text-white transition">Privacy Policy</Link>
          </div>

          <div className="text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} SocialIQ Inc. All rights reserved.</p>
            <p className="text-[10px] text-slate-600 mt-1">Railway Cloud Deployment Node v1.0.4</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
