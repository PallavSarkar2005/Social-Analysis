import React, { useState, useEffect } from "react";
import SidebarLayout from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import { Settings } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import client from "../api/client";
import SettingsLayout from "../components/settings/SettingsLayout";

export default function SettingsEngine() {
  const { user, updateUser, logout, connectGoogle, disconnectGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // State managers
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState({
    growthSpike: true,
    newAiReport: true,
    snapshotCompleted: true,
    milestoneReached: true,
  });

  const [emailSchedule, setEmailSchedule] = useState({
    frequency: "weekly",
    reportTypes: ["growth"],
    emailAddress: user?.email || "",
    isActive: true,
  });

  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  // Sync state with user context
  useEffect(() => {
    if (user) {
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

  useEffect(() => {
    fetchSettingsAndSessions();
  }, [activeTab]);

  // Handler functions
  const handleUpdateProfile = async (profileData) => {
    try {
      const res = await client.patch("/api/users/profile", {
        name: profileData.name,
        avatar: profileData.avatar,
        bio: profileData.bio,
      });
      if (res.data && res.data.success) {
        updateUser(res.data.data);
        toast.success("Profile details successfully updated.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update profile settings.";
      toast.error(msg);
    }
  };

  const handleUpdatePassword = async (oldPassword, newPassword) => {
    try {
      const res = await client.post("/api/auth/change-password", {
        currentPassword: oldPassword,
        newPassword,
      });
      if (res.data && res.data.success) {
        toast.success("Password changed successfully.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Password modification failed.";
      toast.error(msg);
      throw err;
    }
  };

  const handleConnectGoogle = async () => {
    try {
      // In development or test, we trigger developer connection directly
      const mockCred = "dummy-developer-token";
      const res = await connectGoogle(mockCred);
      if (res.success) {
        toast.success("Connected Google Identity successfully!");
      } else {
        toast.error(res.message || "Connection failed.");
      }
    } catch (err) {
      toast.error("An error occurred during Google connection.");
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

  const handleUpdatePrefs = async (nextPrefs) => {
    try {
      setNotificationPrefs(nextPrefs);
      const res = await client.post("/api/settings/notifications", nextPrefs);
      if (res.data && res.data.success) {
        toast.success("Notification preferences updated.");
      }
    } catch (err) {
      toast.error("Failed to update notification preferences.");
    }
  };

  const handleUpdateSchedule = async (nextSchedule) => {
    try {
      setEmailSchedule(nextSchedule);
      const res = await client.post("/api/settings/email-schedule", nextSchedule);
      if (res.data && res.data.success) {
        toast.success("Automated report scheduling updated.");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update email schedule.";
      toast.error(msg);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      const res = await client.delete(`/api/users/sessions/${id}`);
      if (res.data && res.data.success) {
        toast.success(res.data.message || "Session revoked successfully.");
        if (res.data.data?.isCurrent) {
          logout();
        } else {
          await fetchSessions();
        }
      }
    } catch (err) {
      console.error("Error revoking session:", err);
      const msg = err.response?.data?.message || "Failed to revoke session.";
      toast.error(msg);
    }
  };

  const handleLogoutEverywhere = async () => {
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

  const handleDeleteAccount = async (password) => {
    try {
      const res = await client.delete("/api/users/account", {
        data: { password },
      });
      if (res.data && res.data.success) {
        toast.success("Account permanently deleted. Goodbye.");
        logout();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Account deletion aborted.";
      toast.error(msg);
      throw err;
    }
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: "User" },
    { id: "account", label: "Account Registry", icon: "Layers" },
    { id: "security", label: "Security & MFA", icon: "Shield" },
    { id: "connected", label: "Connected SSO", icon: "Link2" },
    { id: "notifications", label: "Notification Channels", icon: "Bell" },
    { id: "appearance", label: "Theme Appearance", icon: "Sparkles" },
    { id: "apikeys", label: "Developer Keys", icon: "Key" },
    { id: "billing", label: "Billing & Subscriptions", icon: "CreditCard" },
    { id: "sessions", label: "Sessions & Devices", icon: "Laptop" },
    { id: "privacy", label: "Privacy Policies", icon: "Lock" },
    { id: "data", label: "Data Archive", icon: "Database" },
    { id: "audit", label: "Security Audit Logs", icon: "Clock" },
    { id: "integrations", label: "App Integrations", icon: "Sliders" },
    { id: "advanced", label: "Advanced Configurations", icon: "Sliders" },
    { id: "danger", label: "Danger Zone", icon: "AlertTriangle" },
  ];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <SidebarLayout />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          {/* Header */}
          <div className="border-b border-white/[0.06] pb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Settings size={28} className="text-indigo-400" />
              Settings Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Configure system API variables, manage developer profiles, configure email digests, and oversee notifications.
            </p>
          </div>

          <SettingsLayout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={tabs}
            user={user}
            sessions={sessions}
            loadingSessions={loadingSessions}
            notificationPrefs={notificationPrefs}
            emailSchedule={emailSchedule}
            loadingPrefs={loadingPrefs}
            loadingSchedule={loadingSchedule}
            onUpdateProfile={handleUpdateProfile}
            onUpdatePassword={handleUpdatePassword}
            onConnectGoogle={handleConnectGoogle}
            onDisconnectGoogle={handleDisconnectGoogle}
            onUpdatePrefs={handleUpdatePrefs}
            onUpdateSchedule={handleUpdateSchedule}
            onRevokeSession={handleRevokeSession}
            onLogoutEverywhere={handleLogoutEverywhere}
            onDeleteAccount={handleDeleteAccount}
          />
        </main>
      </div>
    </div>
  );
}
