import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { User, Shield, CreditCard, Key, Settings, Check, Sparkles, Mail, Bell, Lock } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";

export default function SettingsEngine() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Local state keys/tokens (fallback simulator)
  const [keys, setKeys] = useState({
    groq: "gsk_********************lkJtiejh",
    youtube: "AIzaSy********************a40oMOY",
  });
  
  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    growthSpike: true,
    newAiReport: true,
    snapshotCompleted: true,
    milestoneReached: true,
  });

  // Email Schedule state
  const [emailSchedule, setEmailSchedule] = useState({
    frequency: "weekly",
    reportTypes: ["growth"],
    emailAddress: user?.email || "",
    isActive: false,
  });

  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  // Load schedule and preferences
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
      });
      setEmailSchedule(prev => ({
        ...prev,
        emailAddress: prev.emailAddress || user.email || "",
      }));
    }

    const fetchSettings = async () => {
      try {
        setLoadingSchedule(true);
        const scheduleRes = await client.get("/api/settings/email-schedule");
        if (scheduleRes.data && scheduleRes.data.success && scheduleRes.data.data) {
          const sched = scheduleRes.data.data;
          setEmailSchedule({
            frequency: sched.frequency || "weekly",
            reportTypes: sched.reportTypes || ["growth"],
            emailAddress: sched.emailAddress || user?.email || "",
            isActive: sched.isActive !== false,
          });
        }
      } catch (err) {
        console.error("Error loading email schedule:", err);
      } finally {
        setLoadingSchedule(false);
      }

      try {
        setLoadingPrefs(true);
        const prefsRes = await client.get("/api/settings/notifications");
        if (prefsRes.data && prefsRes.data.success && prefsRes.data.data) {
          setNotificationPrefs(prefsRes.data.data);
        }
      } catch (err) {
        console.error("Error loading notification preferences:", err);
      } finally {
        setLoadingPrefs(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSaveKeys = (e) => {
    e.preventDefault();
    toast.success("API credentials saved for current workspace context.");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name || !profile.email) {
      toast.error("Name and email are required fields.");
      return;
    }

    try {
      const res = await client.post("/api/settings/profile", profile);
      if (res.data && res.data.success) {
        updateUser(res.data.data);
        toast.success("Profile preferences successfully updated.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update profile settings.";
      toast.error(msg);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.oldPassword) {
      toast.error("Current password is required.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      const res = await client.post("/api/settings/password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      if (res.data && res.data.success) {
        toast.success("Password changed successfully.");
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Password modification failed.";
      toast.error(msg);
    }
  };

  const handleSaveNotificationPrefs = async (e) => {
    e.preventDefault();
    try {
      const res = await client.post("/api/settings/notifications", notificationPrefs);
      if (res.data && res.data.success) {
        toast.success("Notification preferences updated.");
      }
    } catch (err) {
      toast.error("Failed to update notification preferences.");
    }
  };

  const handleSaveEmailSchedule = async (e) => {
    e.preventDefault();
    if (!emailSchedule.emailAddress) {
      toast.error("Recipient email address is required.");
      return;
    }
    try {
      const res = await client.post("/api/settings/email-schedule", emailSchedule);
      if (res.data && res.data.success) {
        toast.success("Automated report scheduling updated.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update email schedule.";
      toast.error(msg);
    }
  };

  const toggleReportType = (type) => {
    setEmailSchedule(prev => {
      const current = [...prev.reportTypes];
      const index = current.indexOf(type);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(type);
      }
      return { ...prev, reportTypes: current };
    });
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
              Configure system API variables, manage developer profiles, configure email digests, and oversee notifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar Tabs */}
            <div className="md:col-span-1 space-y-1">
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "password", label: "Security", icon: Lock },
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "schedule", label: "Email Schedule", icon: Mail },
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
              
              {/* Profile Preferences */}
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

              {/* Password / Security */}
              {activeTab === "password" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Account Security</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Change your password credentials securely.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Password</label>
                        <input
                          type="password"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                          className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Password</label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="Min 6 characters"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="Re-enter password"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              )}

              {/* Notification Preferences */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Notification Center Preferences</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Toggle instant dashboard notifications for different events.</p>
                  </div>

                  {loadingPrefs ? (
                    <div className="text-slate-400 text-xs">Loading preferences...</div>
                  ) : (
                    <form onSubmit={handleSaveNotificationPrefs} className="space-y-6">
                      <div className="space-y-3">
                        {[
                          { id: "growthSpike", label: "Competitor Growth Spike", desc: "Notify when a tracked competitor experiences anomalous growth metrics." },
                          { id: "newAiReport", label: "New AI Report Generated", desc: "Alert when automated AI channel performance insight is completed." },
                          { id: "snapshotCompleted", label: "Historical Snapshot Complete", desc: "Receive alerts when daily channels delta synchronization finishes." },
                          { id: "milestoneReached", label: "Subscriber Milestone Reached", desc: "Celebrate and note when a channel breaks round milestone marks." },
                        ].map((pref) => (
                          <label key={pref.id} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={notificationPrefs[pref.id]}
                              onChange={(e) => setNotificationPrefs({ ...notificationPrefs, [pref.id]: e.target.checked })}
                              className="mt-1 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
                            />
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-white block">{pref.label}</span>
                              <span className="text-[10px] text-slate-400 block">{pref.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>

                      <button
                        type="submit"
                        className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Save Notification Preferences
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Email Scheduling */}
              {activeTab === "schedule" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Automated Email Reports</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Receive structured analytics PDF and CSV direct to your inbox.</p>
                  </div>

                  {loadingSchedule ? (
                    <div className="text-slate-400 text-xs">Loading schedules...</div>
                  ) : (
                    <form onSubmit={handleSaveEmailSchedule} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Schedule Status</label>
                          <select
                            value={emailSchedule.isActive ? "active" : "inactive"}
                            onChange={(e) => setEmailSchedule({ ...emailSchedule, isActive: e.target.value === "active" })}
                            className="w-full h-11 px-4 rounded-xl bg-[#1a1b23] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          >
                            <option value="active">Active (Sending Emails)</option>
                            <option value="inactive">Paused (No Emails)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recipient Email</label>
                          <input
                            type="email"
                            value={emailSchedule.emailAddress}
                            onChange={(e) => setEmailSchedule({ ...emailSchedule, emailAddress: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="your@email.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Frequency</label>
                          <select
                            value={emailSchedule.frequency}
                            onChange={(e) => setEmailSchedule({ ...emailSchedule, frequency: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-[#1a1b23] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                          >
                            <option value="daily">Daily Digest</option>
                            <option value="weekly">Weekly Summary</option>
                            <option value="monthly">Monthly Overview</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Report Subscriptions</label>
                        <div className="grid sm:grid-cols-3 gap-3">
                          {[
                            { id: "competitor", label: "Competitor reports" },
                            { id: "growth", label: "Growth reports" },
                            { id: "ai", label: "AI insights reports" },
                          ].map((type) => {
                            const selected = emailSchedule.reportTypes.includes(type.id);
                            return (
                              <button
                                type="button"
                                key={type.id}
                                onClick={() => toggleReportType(type.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                                  selected
                                    ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-200"
                                    : "bg-white/[0.01] border-white/[0.06] text-slate-400 hover:bg-white/[0.02]"
                                }`}
                              >
                                {type.label}
                                {selected && <Check size={14} className="text-indigo-400" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Update Email Schedule
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* API Credentials */}
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

              {/* Billing / Subscription */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Active Subscription</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Control pricing matrices and subscription tiers.</p>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-extrabold uppercase tracking-widest">
                      <Sparkles size={11} className="animate-pulse" />
                      {user?.plan === "pro" ? "Developer Pro" : user?.plan === "enterprise" ? "Enterprise VIP" : "Free Plan"}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subscription Cost</p>
                      <h4 className="text-xl font-extrabold text-white">
                        {user?.plan === "pro" ? "$49" : user?.plan === "enterprise" ? "$199" : "$0"}
                        <span className="text-xs text-slate-500">/mo</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Billed monthly. Auto renews in 30 days.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">API Limits Usage</p>
                      <h4 className="text-xl font-extrabold text-white">
                        {(user?.limits?.used || 120).toLocaleString()}
                        <span className="text-xs text-slate-500">/{(user?.limits?.total || 1000).toLocaleString()}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Resets monthly. Level-2 quotas enabled.</p>
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Connected Channels</p>
                      <h4 className="text-xl font-extrabold text-white">
                        {user?.limits?.nodesUsed || 2}
                        <span className="text-xs text-slate-500">/{user?.limits?.nodesTotal || 5}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">Index capability slots remaining: {(user?.limits?.nodesTotal || 5) - (user?.limits?.nodesUsed || 2)}.</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">SaaS Features Included</h4>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-300">
                      {[
                        "Continuous automated YouTube metrics synchronization",
                        "High frequency Playwright X profile scraping",
                        "Unlimited Groq Llama-3 AI deep diagnostics logs",
                        "Dynamic side-by-side competitor analytics comparisons",
                        "Granular historical delta records export (CSV/JSON/PDF/Excel)",
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
