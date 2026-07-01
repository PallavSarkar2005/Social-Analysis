import React, { useState } from "react";
import {
  Laptop,
  Smartphone,
  LogOut,
  Globe,
  Clock,
  Shield,
  Monitor,
} from "lucide-react";

const formatRelativeTime = (date) => {
  if (!date) return "Unknown";
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export default function Sessions({
  sessions,
  onRevokeSession,
  onLogoutOther,
  onLogoutAll,
  loadingSessions,
}) {
  const [selectedIds, setSelectedIds] = useState([]);

  const getDeviceIcon = (device) => {
    const type = device?.toLowerCase() || "";
    if (type.includes("mobile") || type.includes("phone") || type.includes("tablet")) {
      return <Smartphone size={18} className="text-indigo-400" />;
    }
    return <Laptop size={18} className="text-indigo-400" />;
  };

  const toggleSelect = (id, isCurrent) => {
    if (isCurrent) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to sign out this device?")) return;
    await onRevokeSession(id);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const handleRevokeSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Sign out ${selectedIds.length} selected device(s)?`)) return;
    for (const id of selectedIds) {
      await onRevokeSession(id);
    }
    setSelectedIds([]);
  };

  const handleLogoutOther = async () => {
    if (!window.confirm("Sign out all other devices? Your current session will stay active.")) return;
    await onLogoutOther();
    setSelectedIds([]);
  };

  const handleLogoutAll = async () => {
    if (
      !window.confirm(
        "Sign out everywhere, including this device? You will need to sign in again."
      )
    ) {
      return;
    }
    await onLogoutAll();
  };

  const currentSession = sessions.find((s) => s.isCurrent);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Monitor className="text-indigo-400" size={20} /> Sessions & Devices
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage where you&apos;re signed in. Each device has its own independent session.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {currentSession && (
          <button
            onClick={() => handleRevoke(currentSession._id)}
            className="h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-slate-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <LogOut size={10} /> Sign Out This Device
          </button>
        )}
        {selectedIds.length > 0 && (
          <button
            onClick={handleRevokeSelected}
            className="h-8 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <LogOut size={10} /> Sign Out Selected ({selectedIds.length})
          </button>
        )}
        <button
          onClick={handleLogoutOther}
          className="h-8 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
        >
          <Shield size={10} /> Sign Out Other Devices
        </button>
        <button
          onClick={handleLogoutAll}
          className="h-8 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
        >
          <LogOut size={10} /> Sign Out Everywhere
        </button>
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] rounded-2xl divide-y divide-white/[0.04]">
        {loadingSessions ? (
          <div className="p-8 text-center">
            <span className="text-xs text-slate-500">Loading active sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-xs text-slate-500">No active sessions found.</span>
          </div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess._id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-200 ${
                sess.isCurrent
                  ? "bg-indigo-500/[0.04] border-l-2 border-l-indigo-500"
                  : "hover:bg-white/[0.01]"
              }`}
            >
              <div className="flex items-start gap-4">
                {!sess.isCurrent && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(sess._id)}
                    onChange={() => toggleSelect(sess._id, sess.isCurrent)}
                    className="mt-3 accent-indigo-500"
                    aria-label={`Select session ${sess.browser}`}
                  />
                )}
                <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl self-start">
                  {getDeviceIcon(sess.device)}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xs font-bold text-white">
                      {sess.browser || "Unknown"} on {sess.os || "Unknown"}
                    </h4>
                    {sess.isCurrent && (
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-bold uppercase tracking-wider">
                        This Device
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                        sess.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {sess.status === "active" ? "Active" : "Offline"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <Globe size={10} /> {sess.location || "Unknown Location"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> Last active: {formatRelativeTime(sess.lastActivity)}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Signed in {new Date(sess.loggedInAt).toLocaleString()}
                    {sess.isRememberMe ? " · Remember me enabled" : ""}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(sess._id)}
                className="h-8 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 transition flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto"
              >
                <LogOut size={10} /> {sess.isCurrent ? "Sign Out" : "Revoke"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
