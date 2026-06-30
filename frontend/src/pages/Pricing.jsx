import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  CheckCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
  Globe,
  Sparkles,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Pricing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cycle, setCycle] = useState("monthly");

  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      navigate("/register?redirect=billing");
    } else {
      navigate("/billing");
    }
  };

  const faqItems = [
    {
      q: "Can I upgrade or downgrade my tier at any time?",
      a: "Yes! You can easily upgrade or downgrade your active licensing plan in the Subscription settings. Downgrades will apply at the end of the current billing cycle, while upgrades apply immediately.",
    },
    {
      q: "Is there a long-term contract requirement?",
      a: "No long-term commitments are required. Our monthly plans run month-to-month and can be cancelled any time. Choosing the annual billing cycle saves you 20% on licensing fees.",
    },
    {
      q: "Which payment options are supported?",
      a: "We process payments securely through Razorpay, supporting major credit/debit cards, UPI payments, NetBanking, and popular digital wallets.",
    },
    {
      q: "What happens if I hit my plan's usage limits?",
      a: "If you reach your plan limits (such as adding more creators or invoking AI insights), you will receive a notification and can easily upgrade to a higher tier to instantly unlock additional resource capacity.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans overflow-x-hidden relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-indigo-900/10 via-purple-900/5 to-transparent rounded-full blur-3xl -z-10" />
      
      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.04]">
        <Link to="/">
          <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-2 select-none">
            Social<span className="text-indigo-400">IQ</span>
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          <Link to={isAuthenticated ? "/dashboard" : "/login"} className="text-xs font-semibold text-slate-400 hover:text-white transition">
            {isAuthenticated ? "Enter Workspace" : "Log In"}
          </Link>
          {!isAuthenticated && (
            <Link to="/register">
              <button className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition active:scale-[0.98] cursor-pointer">
                Get Started Free
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16 sm:py-24 text-center space-y-16">
        
        {/* Pitch */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            Transparent Pricing Structure
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Flexible packages built for campaigns of all scales
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Index, analyze, and optimize your organization's digital footprint. Upgrade to unlock premium dashboards, exports, and unlimited AI strategies.
          </p>
        </div>

        {/* Annual vs Monthly Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-xs font-bold transition-colors ${cycle === "monthly" ? "text-white" : "text-slate-500"}`}>
            Billed Monthly
          </span>
          <button
            onClick={() => setCycle(cycle === "monthly" ? "annual" : "monthly")}
            className="w-12 h-6 bg-slate-900 border border-white/[0.08] rounded-full p-1 transition-all relative flex items-center cursor-pointer"
          >
            <motion.div
              layout
              className="w-4 h-4 bg-indigo-500 rounded-full"
              animate={{ x: cycle === "monthly" ? 0 : 22 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-xs font-bold transition-colors flex items-center gap-1.5 ${cycle === "annual" ? "text-white" : "text-slate-500"}`}>
            Billed Annually
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-extrabold">
              Save 20%
            </span>
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-left">
          
          {/* Card 1: Free Tier */}
          <div className="bg-[#121318]/45 border border-white/[0.06] rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-white/[0.1] transition group">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-extrabold text-white text-base">Free Plan</h3>
                <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed">
                  Best for basic individual tracking and platform diagnostics.
                </p>
              </div>

              <div className="flex items-baseline gap-1 text-white">
                <span className="text-3xl sm:text-4xl font-black">INR 0</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">/ lifetime</span>
              </div>

              <hr className="border-white/[0.04]" />

              <ul className="space-y-3.5 text-xs text-slate-400 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>2 tracked creator nodes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>3 AI strategy insights per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>Manual content sync (12h cooldown)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>Standard community support</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan("free")}
              className="mt-8 py-3 w-full bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white text-xs font-bold rounded-xl transition active:scale-[0.98] cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* Card 2: Pro Tier */}
          <div className="bg-[#121318]/65 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-indigo-500/50 transition relative overflow-hidden shadow-2xl shadow-indigo-600/5 group">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
              Popular
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-extrabold text-white text-base">Professional Plan</h3>
                <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed">
                  Best for growing teams, state-wide campaigns, and data exports.
                </p>
              </div>

              <div className="flex items-baseline gap-1 text-white">
                <span className="text-3xl sm:text-4xl font-black">
                  INR {cycle === "monthly" ? "2,400" : "24,000"}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  / {cycle === "monthly" ? "month" : "year"}
                </span>
              </div>

              <hr className="border-white/[0.04]" />

              <ul className="space-y-3.5 text-xs text-slate-400 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span className="text-slate-200">15 tracked creator nodes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span className="text-slate-200">100 AI strategy insights per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>Automated hourly backend database syncs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>PDF / Excel telemetry report exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-indigo-400" />
                  <span>Priority email support response (4h SLA)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan("professional")}
              className="mt-8 py-3 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition active:scale-[0.98] shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Card 3: Enterprise Tier */}
          <div className="bg-[#121318]/45 border border-white/[0.06] rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-white/[0.1] transition group">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-extrabold text-white text-base">Enterprise Plan</h3>
                <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed">
                  Best for national campaigns, central command offices, and custom setups.
                </p>
              </div>

              <div className="flex items-baseline gap-1 text-white">
                <span className="text-3xl sm:text-4xl font-black">
                  INR {cycle === "monthly" ? "8,200" : "82,000"}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  / {cycle === "monthly" ? "month" : "year"}
                </span>
              </div>

              <hr className="border-white/[0.04]" />

              <ul className="space-y-3.5 text-xs text-slate-400 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-purple-400" />
                  <span>1000 tracked creator nodes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-purple-400" />
                  <span>10,000 AI strategy insights per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-purple-400" />
                  <span>Real-time scraper syncs & custom proxies</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-purple-400" />
                  <span>Custom LLM model training & tuning</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-purple-400" />
                  <span>Dedicated accounts strategist</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectPlan("enterprise")}
              className="mt-8 py-3 w-full bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white text-xs font-bold rounded-xl transition active:scale-[0.98] cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-4xl mx-auto pt-16 space-y-6 text-left">
          <h3 className="text-xl font-bold text-white tracking-tight text-center">Feature Matrix</h3>
          
          <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-slate-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="p-4">Feature Node</th>
                    <th className="p-4">Free</th>
                    <th className="p-4">Professional</th>
                    <th className="p-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-slate-300">
                  <tr>
                    <td className="p-4 font-bold text-white">Tracked Creators Limit</td>
                    <td className="p-4">2 Channels</td>
                    <td className="p-4">15 Channels</td>
                    <td className="p-4">1000 Channels</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">AI Strategy Generation</td>
                    <td className="p-4">3 / month</td>
                    <td className="p-4">100 / month</td>
                    <td className="p-4">10,000 / month</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Database Sync Cycle</td>
                    <td className="p-4">Manual (12h limit)</td>
                    <td className="p-4">Automated (Hourly)</td>
                    <td className="p-4">Real-time Telemetry</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">PDF / Excel Export</td>
                    <td className="p-4">Locked</td>
                    <td className="p-4">Unlocked</td>
                    <td className="p-4">Unlocked</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Custom Model Training</td>
                    <td className="p-4">Locked</td>
                    <td className="p-4">Locked</td>
                    <td className="p-4">Unlocked</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-white">Dedicated Strategist</td>
                    <td className="p-4">No</td>
                    <td className="p-4">No</td>
                    <td className="p-4">Yes (24/7 SLA)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto pt-16 space-y-8">
          <h3 className="text-xl font-bold text-white tracking-tight text-center">Frequently Asked Questions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.04] space-y-2">
                <h4 className="font-bold text-slate-200 text-xs sm:text-sm flex items-start gap-2">
                  <HelpCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-indigo-900/10 border border-white/[0.06] rounded-3xl p-8 max-w-4xl mx-auto space-y-4">
          <h3 className="text-lg sm:text-2xl font-black text-white">
            Ready to boost your political command center?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Get started today. Try our Free plan to see how easy it is to track telemetry. Upgrade whenever you need state-wide capacity.
          </p>
          <div className="pt-2">
            <button
              onClick={() => handleSelectPlan("free")}
              className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition active:scale-[0.98] inline-flex items-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer"
            >
              Launch Workspace
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </main>

      <footer className="border-t border-white/[0.04] py-8 text-center text-[10px] text-slate-600 font-semibold tracking-wider uppercase">
        © {new Date().getFullYear()} SocialIQ Analytics Platform. All rights reserved.
      </footer>
    </div>
  );
}
