import React from "react";
import { Laptop, Smartphone, HelpCircle, LogOut, CheckCircle2, Clock, Globe } from "lucide-react";
import toast from "react-hot-toast";

export default function Sessions({ sessions, onRevokeSession, loadingSessions }) {
  const getDeviceIcon = (device) => {
    const type = device?.toLowerCase() || "";
    if (type.includes("mobile") || type.includes("phone")) {
      return <Smartphone size={18} className="text-indigo-400" />;
    }
    if (type.includes("tablet") || type.includes("ipad")) {
      return <Smartphone size={18} className="text-indigo-400" />;
    }
    return <Laptop size={18} className="text-indigo-400" />;
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Are you sure you want to terminate this login session?")) return;
    try {
      await onRevokeSession(id);
    } catch (err) {
      // Handled in parent
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Laptop className="text-indigo-400" size={20} /> Active Sessions
        </h2>
        <p className="text-xs text-slate-400 mt-1">Review and manage devices currently authenticated to your Social IQ workspace.</p>
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] rounded-2xl divide-y divide-white/[0.04]">
        {loadingSessions ? (
          <div className="p-8 text-center">
            <span className="text-xs text-slate-500">Loading active sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-xs text-slate-500">No active sessions loaded.</span>
          </div>
        ) : (
          sessions.map((sess) => (
            <div
              key={sess._id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl self-start">
                  {getDeviceIcon(sess.device)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">
                      {sess.browser || "Unknown"} on {sess.os || "Unknown"}
                    </h4>
                    {sess.isCurrent && (
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-bold uppercase tracking-wider">
                        Current Session
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Globe size={10} /> IP: {sess.ipAddress}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> Logged in: {new Date(sess.loggedInAt).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {!sess.isCurrent && (
                <button
                  onClick={() => handleRevoke(sess._id)}
                  className="h-8 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 transition flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider self-start sm:self-auto"
                >
                  <LogOut size={10} /> Revoke Device
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
