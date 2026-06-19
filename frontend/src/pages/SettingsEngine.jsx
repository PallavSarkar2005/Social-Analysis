import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { User, Shield, CreditCard, Key, Settings, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext.jsx";

export default function SettingsEngine() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [keys, setKeys] = useState({
    groq: "gsk_********************lkJtiejh",
    youtube: "AIzaSy********************a40oMOY",
  });
  
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    company: user.company,
    role: user.role,
  });

  const handleSaveKeys = (e) => {
    e.preventDefault();
    toast.success("API keys updated in user session cache.");
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateUser(profile);
    toast.success("Profile preferences successfully updated.");
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="border-b border-white/[0.06] pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
              <Settings size={28} className="text-slate-400" />
              Settings Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Configure system API variables, manage developer profiles, and oversee subscription tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar Tabs */}
            <div className="md:col-span-1 space-y-1">
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "keys", label: "API Credentials", icon: Key },
                { id: "billing", label: "Subscription", icon: CreditCard },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                      active
                        ? "bg-indigo-600/10 border-indigo-500/30 text-white shadow-inner shadow-indigo-600/5"
                        : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Config Panels */}
            <div className="md:col-span-3 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 sm:p-8 shadow-xl min-h-[400px]">
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Profile Preferences</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customize your metadata layout preferences.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company / Hub</label>
                        <input
                          type="text"
                          value={profile.company}
                          onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role Type</label>
                        <input
                          type="text"
                          value={profile.role}
                          onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Save Preferences
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "keys" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">API Credentials</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Override global keys for localized sandbox sessions.</p>
                  </div>

                  <form onSubmit={handleSaveKeys} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          Groq API Key
                          <span className="text-[9px] text-indigo-400 capitalize font-medium">Session Active</span>
                        </label>
                        <input
                          type="password"
                          value={keys.groq}
                          onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          YouTube Data v3 API Key
                        </label>
                        <input
                          type="password"
                          value={keys.youtube}
                          onChange={(e) => setKeys({ ...keys, youtube: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Override session keys
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "billing" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Active Subscription</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Control pricing matrices and subscription tiers.</p>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest">
                      <Sparkles size={11} className="animate-pulse" />
                      {user.tier}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subscription Cost</p>
                      <h4 className="text-xl font-extrabold text-white">
                        {user.tier === "Developer Pro" ? "$149" : "$0"}
                        <span className="text-xs text-slate-500">/mo</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Billed monthly. Auto renews on July 19, 2026.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">API Limits Usage</p>
                      <h4 className="text-xl font-extrabold text-white">
                        {user.limits.used.toLocaleString()}
                        <span className="text-xs text-slate-500">/{user.limits.total.toLocaleString()}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Resets in 30 days. Level-2 quotas enabled.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected Channels</p>
                      <h4 className="text-xl font-extrabold text-white">
                        {user.limits.nodesUsed}
                        <span className="text-xs text-slate-500">/{user.limits.nodesTotal}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Index capability slots remaining: {user.limits.nodesTotal - user.limits.nodesUsed}.</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pro Features Included</h4>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                      {[
                        "Continuous automated YouTube metrics synchronization",
                        "High frequency Playwright X profile scraping",
                        "Unlimited Groq Llama-3 AI deep diagnostics logs",
                        "Dynamic side-by-side competitor analytics comparisons",
                        "Granular historical delta records export (CSV/JSON)",
                        "Dedicated support team & custom dashboard layout widgets",
                      ].map((feat, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
