import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Profile from "./Profile";
import Account from "./Account";
import Security from "./Security";
import ConnectedAccounts from "./ConnectedAccounts";
import Notifications from "./Notifications";
import Appearance from "./Appearance";
import APIKeys from "./APIKeys";
import Billing from "./Billing";
import Sessions from "./Sessions";
import Privacy from "./Privacy";
import DataExport from "./DataExport";
import AuditLogs from "./AuditLogs";
import Integrations from "./Integrations";
import Advanced from "./Advanced";
import DangerZone from "./DangerZone";

export default function SettingsLayout({
  activeTab,
  setActiveTab,
  tabs,
  user,
  sessions,
  loadingSessions,
  notificationPrefs,
  emailSchedule,
  loadingPrefs,
  loadingSchedule,
  onUpdateProfile,
  onUpdatePassword,
  onConnectGoogle,
  onDisconnectGoogle,
  onUpdatePrefs,
  onUpdateSchedule,
  onRevokeSession,
  onLogoutOther,
  onLogoutAll,
  onLogoutEverywhere,
  onDeleteAccount,
}) {
  const renderActiveContent = () => {
    switch (activeTab) {
      case "profile":
        return <Profile user={user} onUpdateProfile={onUpdateProfile} />;
      case "account":
        return <Account user={user} />;
      case "security":
        return <Security onUpdatePassword={onUpdatePassword} />;
      case "connected":
        return (
          <ConnectedAccounts
            user={user}
            onConnectGoogle={onConnectGoogle}
            onDisconnectGoogle={onDisconnectGoogle}
          />
        );
      case "notifications":
        return (
          <Notifications
            notificationPrefs={notificationPrefs}
            emailSchedule={emailSchedule}
            loadingPrefs={loadingPrefs}
            loadingSchedule={loadingSchedule}
            onUpdatePrefs={onUpdatePrefs}
            onUpdateSchedule={onUpdateSchedule}
          />
        );
      case "appearance":
        return <Appearance />;
      case "apikeys":
        return <APIKeys />;
      case "billing":
        return <Billing user={user} />;
      case "sessions":
        return (
          <Sessions
            sessions={sessions}
            onRevokeSession={onRevokeSession}
            onLogoutOther={onLogoutOther}
            onLogoutAll={onLogoutAll}
            loadingSessions={loadingSessions}
          />
        );
      case "privacy":
        return <Privacy />;
      case "data":
        return <DataExport user={user} />;
      case "audit":
        return <AuditLogs />;
      case "integrations":
        return <Integrations />;
      case "advanced":
        return <Advanced />;
      case "danger":
        return (
          <DangerZone
            onDeleteAccount={onDeleteAccount}
            onLogoutEverywhere={onLogoutEverywhere}
          />
        );
      default:
        return <Profile user={user} onUpdateProfile={onUpdateProfile} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 items-stretch w-full min-h-[500px]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />

      <div className="flex-1 min-w-0 bg-[#111319]/25 border border-white/[0.04] backdrop-blur-xl p-6 sm:p-8 rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {renderActiveContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
