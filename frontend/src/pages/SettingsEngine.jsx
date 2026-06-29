import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import {
  User,
  Shield,
  CreditCard,
  Key,
  Settings,
  Check,
  Sparkles,
  Mail,
  Bell,
  Lock,
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client";

export default function SettingsEngine() {
  const { user, updateUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Local state keys/tokens (fallback simulator)
  const [keys, setKeys] = useState({
    groq: "gsk_********************lkJtiejh",
    youtube: "AIzaSy********************a40oMOY",
  });

  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || "",
    avatar: user?.avatar || "",
    bio: user?.bio || "",
  });

  // Email Change state
  const [emailForm, setEmailForm] = useState({
    newEmail: "",
    password: "",
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Account deletion state
  const [deleteAccountForm, setDeleteAccountForm] = useState({
    password: "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Active Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

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

  // Sync state with user context
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        avatar: user.avatar || "",
        bio: user.bio || "",
      });
      setEmailSchedule((prev) => ({
        ...prev,
        emailAddress: prev.emailAddress || user.email || "",
      }));
    }
  }, [user]);

  // Load schedule, preferences, and sessions
  const fetchSettingsAndSessions = async () => {
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

    if (activeTab === "sessions") {
      await fetchSessions();
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await client.get("/api/users/sessions");
      if (res.data && res.data.success) {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      toast.error("Failed to load active login sessions.");
    } finally {
      setLoadingSessions(false);
    }
  };

  const { connectGoogle, disconnectGoogle } = useAuth();

  const handleGoogleConnectResponse = async (response) => {
    try {
      const res = await connectGoogle(response.credential);
      if (res.success) {
        toast.success("Google account successfully connected!");
      } else {
        toast.error(res.message || "Failed to link Google account");
      }
    } catch (err) {
      toast.error("An error occurred during Google connection.");
    }
  };

  const triggerDevGoogleConnect = async () => {
    try {
      const res = await connectGoogle("dummy-developer-token");
      if (res.success) {
        toast.success("Connected with Developer Google Identity!");
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error("Developer connection failed");
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      const res = await disconnectGoogle();
      if (res.success) {
        toast.success("Google account disconnected successfully.");
      } else {
        toast.error(res.message || "Failed to unlink Google account");
      }
    } catch (err) {
      toast.error("An error occurred during Google disconnection.");
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Avatar file size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, avatar: reader.result }));
        toast.success("Avatar loaded successfully. Save profile details to apply.");
      };
      reader.readAsDataURL(file);
    }
  };

  const initializeGoogleConnect = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder-client-id.apps.googleusercontent.com",
        callback: handleGoogleConnectResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-connect-btn"),
        { theme: "dark", size: "large", width: "100%" }
      );
    }
  };

  useEffect(() => {
    fetchSettingsAndSessions();

    if (activeTab === "connected-accounts") {
      if (!window.google) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        script.onload = () => {
          initializeGoogleConnect();
        };
      } else {
        initializeGoogleConnect();
      }
    }
  }, [activeTab]);

  const handleSaveKeys = (e) => {
    e.preventDefault();
    toast.success("API credentials saved for current workspace context.");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name) {
      toast.error("Name is a required field.");
      return;
    }

    try {
      const res = await client.patch("/api/users/profile", profile);
      if (res.data && res.data.success) {
        updateUser(res.data.data);
        toast.success("Profile details successfully updated.");
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
    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      const res = await client.post("/api/auth/change-password", {
        currentPassword: passwordForm.oldPassword,
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

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.newEmail || !emailForm.password) {
      toast.error("New email and verification password are required.");
      return;
    }

    try {
      const res = await client.put("/api/users/email", {
        newEmail: emailForm.newEmail,
        password: emailForm.password,
      });
      if (res.data && res.data.success) {
        updateUser(res.data.data);
        toast.success("Email changed. Please verify your new address via the dispatched link.");
        setEmailForm({ newEmail: "", password: "" });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update email address.";
      toast.error(msg);
    }
  };

  const handleLogoutOtherDevices = async () => {
    try {
      const res = await client.post("/api/auth/logout-other");
      if (res.data && res.data.success) {
        toast.success("Logged out of all other devices.");
        await fetchSessions();
      }
    } catch (err) {
      toast.error("Failed to revoke other sessions.");
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deleteAccountForm.password) {
      toast.error("Password verification is required to delete your account.");
      return;
    }

    try {
      const res = await client.delete("/api/users/account", {
        data: { password: deleteAccountForm.password },
      });
      if (res.data && res.data.success) {
        toast.success("Account permanently deleted. Goodbye.");
        logout();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Account deletion aborted.";
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
    setEmailSchedule((prev) => {
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

  const getDeviceIcon = (device) => {
    const dev = device.toLowerCase();
    if (dev.includes("mobile") || dev.includes("phone") || dev.includes("android") || dev.includes("iphone")) {
      return <Smartphone className="text-slate-400 shrink-0" size={16} />;
    }
    return <Laptop className="text-slate-400 shrink-0" size={16} />;
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="border-b border-white/[0.06] pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
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
                { id: "security", label: "Security Settings", icon: Shield },
                { id: "connected-accounts", label: "Connected Accounts", icon: Sparkles },
                { id: "sessions", label: "Active Sessions", icon: Laptop },
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
              
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Profile Settings</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customize your metadata layout and avatar.</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="space-y-4">
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
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>Avatar Image Link / Upload</span>
                            <span className="text-[9px] text-indigo-400 hover:text-indigo-300 cursor-pointer" onClick={() => document.getElementById("avatar-upload-file").click()}>
                              Upload File (Max 2MB)
                            </span>
                          </label>
                          <input
                            type="file"
                            id="avatar-upload-file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={profile.avatar}
                              onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                              className="flex-1 h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="https://example.com/avatar.jpg"
                            />
                            {profile.avatar && (
                              <img src={profile.avatar} alt="Preview" className="w-11 h-11 rounded-xl object-cover border border-white/[0.08]" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Short Biography</label>
                        <textarea
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          rows={4}
                          className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                    >
                      Save Profile Details
                    </button>
                  </form>
                </div>
              )}

              {/* Security Settings Tab */}
              {activeTab === "security" && (
                <div className="space-y-10">
                  {/* Change Email */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">SaaS Account Identity (Email)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Modify the primary workspace communication address.</p>
                    </div>

                    <form onSubmit={handleChangeEmail} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Email Address</label>
                          <input
                            type="email"
                            value={emailForm.newEmail}
                            onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="new@email.com"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirm Password</label>
                          <input
                            type="password"
                            value={emailForm.password}
                            onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Change Email Address
                      </button>
                    </form>
                  </div>

                  <hr className="border-white/[0.06]" />

                  {/* Change Password */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Credential Management</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Ensure robust access limits on your workspace.</p>
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
                            required
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
                              placeholder="Min 8 characters"
                              required
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
                              required
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

                  <hr className="border-white/[0.06]" />

                  {/* Danger Zone: Account Deletion */}
                  <div className="p-6 rounded-2xl bg-red-950/10 border border-red-500/20 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Danger Zone</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Deleting your account is permanent. This action will immediately eradicate your dashboards, tracked competitors, custom nodes, schedules, and reports.
                        </p>
                      </div>
                    </div>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-200 text-xs font-semibold transition"
                      >
                        <Trash2 size={14} />
                        Delete Account Permanently
                      </button>
                    ) : (
                      <form onSubmit={handleDeleteAccount} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            Confirm Password to Delete Account
                          </label>
                          <input
                            type="password"
                            value={deleteAccountForm.password}
                            onChange={(e) => setDeleteAccountForm({ password: e.target.value })}
                            className="w-full max-w-sm h-11 px-4 rounded-xl bg-black/40 border border-red-500/30 text-xs text-white focus:outline-none focus:border-red-500"
                            placeholder="Enter password to confirm"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="h-10 px-5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition"
                          >
                            Yes, Delete Permanently
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteAccountForm({ password: "" });
                            }}
                            className="h-10 px-5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-semibold rounded-xl transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* Connected Accounts Tab */}
              {activeTab === "connected-accounts" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">Connected Accounts</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Link external providers like Google to sign in to your workspace.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-white/[0.01] border-white/[0.04] text-slate-300">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.114 2.78-1.4 3.63v3.02h2.2c1.3-1.2 2.05-3 2.05-5.5z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.89-3.02c-1.08.72-2.48 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.12C3.26 21.27 7.31 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.27 14.27a7.18 7.18 0 010-4.54V6.61H1.29a11.94 11.94 0 000 10.78l3.98-3.12z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.31 0 3.26 2.73 1.29 6.61l3.98 3.12c.95-2.85 3.6-4.98 6.73-4.98z"
                          />
                        </svg>
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-white block">Google Authentication</span>
                          <span className="text-[10px] text-slate-400 block">
                            {user?.googleId ? "Connected and active" : "Not connected"}
                          </span>
                        </div>
                      </div>

                      {user?.googleId ? (
                        <button
                          onClick={handleDisconnectGoogle}
                          className="h-8 px-4 rounded-lg bg-red-950/40 hover:bg-red-900/30 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={triggerDevGoogleConnect}
                            className="h-8 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                          >
                            Dev-Bypass Link
                          </button>
                          <div id="google-connect-btn" className="overflow-hidden" style={{ height: "32px", width: "120px" }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === "sessions" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">Active Login Sessions</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Monitor and revoke devices connected to this workspace.</p>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={handleLogoutOtherDevices}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/30 border border-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <LogOut size={12} />
                        Logout Other Devices
                      </button>
                    )}
                  </div>

                  {loadingSessions ? (
                    <div className="text-slate-400 text-xs py-4">Synchronizing active logs...</div>
                  ) : sessions.length === 0 ? (
                    <div className="text-slate-400 text-xs py-4">No active sessions located.</div>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div
                          key={session._id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition ${
                            session.isCurrent
                              ? "bg-indigo-950/10 border-indigo-500/30 text-slate-200"
                              : "bg-white/[0.01] border-white/[0.04] text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {getDeviceIcon(session.device)}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  {session.os} ({session.browser})
                                </span>
                                {session.isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-[8px] font-extrabold uppercase tracking-widest">
                                    This Device
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                <span className="flex items-center gap-0.5">
                                  <Globe size={10} />
                                  {session.ipAddress}
                                </span>
                                <span>•</span>
                                <span>Logged in: {new Date(session.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
