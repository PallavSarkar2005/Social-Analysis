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
  Zap,
  Activity,
  Award
} from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

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

// Animated Counter Component
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
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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

  // 8 Key Pillars of the platform
  const pillars = [
    {
      title: "Real-time Telemetry",
      description: "Perform sub-second tracking of subscriber counts, video view metrics, and content metadata across platform nodes.",
      icon: Trophy,
      color: "from-blue-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
    },
    {
      title: "AI Strategy Engine",
      description: "Leverage state of the art language models to extract custom video hooks, title recommendations, and SEO summaries.",
      icon: Brain,
      color: "from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30",
    },
    {
      title: "Branded Reports",
      description: "Export beautiful, print-ready PDF summaries and tabular Excel audit worksheets of historical timeline details.",
      icon: FileText,
      color: "from-pink-500/20 to-rose-500/20 text-pink-400 border-pink-500/30",
    },
    {
      title: "Active Session Control",
      description: "Audit all active login devices, inspect client browser/IP variables, and individually revoke tokens with one-click safety.",
      icon: Lock,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "CSRF Shield Protection",
      description: "Double-submit cookie verification and cryptographically signed JWT credentials block unauthorized API actions.",
      icon: ShieldCheck,
      color: "from-teal-500/20 to-cyan-500/20 text-teal-400 border-teal-500/30",
    },
    {
      title: "Optimistic UI Updates",
      description: "Instant React state updates coupled with TanStack Query caching create a zero-latency workspace layout.",
      icon: Zap,
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    },
    {
      title: "Cross Platform Registry",
      description: "Index and cluster multiple YouTube channel nodes, Twitter accounts, and custom database profiles under one hood.",
      icon: Globe,
      color: "from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/30",
    },
    {
      title: "Telemetry Query Cache",
      description: "Intelligent background data pre-fetching avoids repetitive API request limits and ensures instant visual responsiveness.",
      icon: Activity,
      color: "from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30",
    },
  ];

  const testimonials = [
    {
      quote: "SocialIQ transformed how our media agency pitches and tracks competitor benchmarks. The AI strategy reports are unmatched.",
      author: "Sarah Jenkins",
      role: "VP of Growth, Creator Labs",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
    },
    {
      quote: "The ability to audit active logins and revoke suspicious sessions instantly keeps our enterprise creator data fully secure.",
      author: "Marcus Chen",
      role: "Security Lead, Veed Media",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
    },
    {
      quote: "The interface is lightning fast. Optimistic mutations make organizing channel groups feel smoother than any dashboard I've used.",
      author: "Elena Rostova",
      role: "Digital Strategist, InsightGroup",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
    }
  ];

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
    <div className="min-h-screen bg-[#06070a] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 antialiased overflow-x-hidden relative">
      {/* Decorative Mesh Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#06070a] to-[#06070a] -z-10 pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[55vw] h-[55vw] bg-purple-600/5 rounded-full blur-[140px] -z-10 pointer-events-none" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      {/* Sticky Header */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-[#06070a]/80 backdrop-blur-lg border-b border-white/[0.06] py-3.5" : "bg-transparent py-6"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex flex-col text-left">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Social</span>IQ
            </h1>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
              AI Analytics Platform
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">Features</a>
            <a href="#demo-preview" className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">Live Preview</a>
            <a href="#testimonials" className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">Trust</a>
            <a href="#faq" className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center shadow-lg shadow-indigo-600/20"
              >
                Go to Workspace
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="h-9 px-4 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-xs font-semibold text-slate-350 hover:text-white transition flex items-center"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center shadow-lg shadow-indigo-600/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
        >
          <Sparkles size={12} className="text-indigo-400" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Introducing SocialIQ 2.0</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] sm:leading-[1.05]"
        >
          Enterprise Grade Social Telemetry & <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">AI Strategy Insights</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm sm:text-lg text-slate-400 mt-6 max-w-2xl font-medium leading-relaxed"
        >
          Audit competitor growth differentials, generate AI optimization scripts, and secure session nodes with active multi-device rotation controls. Built for professional creator networks and agencies.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-8"
        >
          <button
            onClick={handleStartFree}
            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white transition flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 cursor-pointer active:scale-[0.98]"
          >
            Launch Free Workspace
            <ArrowRight size={16} />
          </button>
          <button
            onClick={handleWatchDemo}
            className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-sm font-bold text-white transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={14} className="text-indigo-400 fill-indigo-400/20" />
            Interactive Demo
          </button>
        </motion.div>
      </section>

      {/* Stats Counter Row */}
      <section className="border-y border-white/[0.06] bg-white/[0.01] py-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              <AnimatedCounter end={142} suffix="M+" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Indexed Nodes</p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">
              <AnimatedCounter end={99.98} decimals={2} suffix="%" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Telemetry Uptime</p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono">
              <AnimatedCounter end={45} suffix="K+" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">AI Strategy Prompts</p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-pink-400 font-mono">
              &lt; <AnimatedCounter end={250} suffix="ms" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Scraper API Latency</p>
          </div>
        </div>
      </section>

      {/* Live Preview Chart Container */}
      <section id="demo-preview" className="py-24 max-w-5xl mx-auto px-4">
        <div className="text-center mb-12 space-y-4">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Telemetry Live Playground</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Compare Dynamic Growth Timelines</h2>
        </div>

        <div className="bg-[#121318]/50 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-350">Live Stream Node Connected</span>
            </div>

            {/* Platform Selection Tabs */}
            <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
              {Object.keys(previewChartData).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    selectedPlatform === p
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Recharts Preview */}
          <div className="h-64 sm:h-80 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={previewChartData[selectedPlatform]}>
                <defs>
                  <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#111319", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}
                  labelClassName="text-slate-400 text-[10px] font-bold"
                  itemStyle={{ color: "#fff", fontSize: "12px", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="followers" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorFollowers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid (8 items) */}
      <section id="features" className="py-24 border-t border-white/[0.06] bg-slate-950/20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Core Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">The Eight Key Pillars of SocialIQ</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm font-medium">
              We audited and refactored our system to follow the strict guidelines of enterprise application deployments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4 }}
                  className="bg-white/[0.01] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-300 relative group overflow-hidden"
                >
                  {/* Accent Card Gradient Hover */}
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} border flex items-center justify-center mb-5 shrink-0`}>
                    <Icon size={18} />
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2">{p.title}</h3>
                  <p className="text-xs text-slate-450 leading-relaxed font-medium">{p.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Testimonial Section */}
      <section id="testimonials" className="py-24 border-t border-white/[0.06] relative bg-[#090a0f]/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Social Validation</span>
            <h2 className="text-3xl font-extrabold text-white">Trusted by Growth Leaders</h2>
          </div>

          {/* Testimonial Quote Block */}
          <div className="relative bg-[#121318]/30 border border-white/[0.06] rounded-3xl p-8 sm:p-10 shadow-xl overflow-hidden min-h-[220px]">
            <div className="absolute top-0 right-0 p-8 text-white/5 font-serif text-8xl pointer-events-none select-none">“</div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-sm sm:text-base text-slate-200 font-semibold leading-relaxed italic">
                  "{testimonials[activeTestimonial].quote}"
                </p>

                <div className="flex items-center gap-3">
                  <img
                    src={testimonials[activeTestimonial].avatar}
                    alt={testimonials[activeTestimonial].author}
                    className="w-10 h-10 rounded-full object-cover border border-white/[0.08]"
                    loading="lazy"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{testimonials[activeTestimonial].author}</h4>
                    <p className="text-[10px] text-slate-450 font-bold">{testimonials[activeTestimonial].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Carousel dots controls */}
          <div className="flex items-center justify-center gap-2">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`w-2.5 h-2.5 rounded-full transition ${
                  activeTestimonial === idx ? "bg-indigo-500 scale-110" : "bg-white/[0.08] hover:bg-white/[0.15]"
                }`}
                aria-label={`Show slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 border-t border-white/[0.06] bg-[#06070a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Common Queries</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
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
                      <div className="px-6 pb-6 text-xs sm:text-sm text-slate-450 leading-relaxed border-t border-white/[0.03] pt-4 font-medium">
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

      {/* Premium Footer */}
      <footer className="py-16 border-t border-white/[0.06] bg-[#06070a] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-base font-black text-white tracking-wider flex items-center justify-center md:justify-start gap-1">
              Social<span className="text-indigo-400">IQ</span>
            </h2>
            <p className="text-[10px]">Real-time cloud analytics for creator nodes.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 font-medium">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#demo-preview" className="hover:text-white transition">Live Preview</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <Link to="/login" className="hover:text-white transition">Documentation</Link>
            <Link to="/login" className="hover:text-white transition">Privacy Policy</Link>
          </div>

          <div className="text-center md:text-right">
            <p>&copy; {new Date().getFullYear()} SocialIQ Inc. All rights reserved.</p>
            <p className="text-[10px] text-slate-650 mt-1">Railway Cloud Deployment Node v1.0.4</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
