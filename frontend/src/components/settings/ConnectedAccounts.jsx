import React from "react";
import { Link2, Unlink, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ConnectedAccounts({ user, onConnectGoogle, onDisconnectGoogle }) {
  const accounts = [
    {
      id: "google",
      name: "Google Authentication",
      desc: "Link your Google account to log in with single sign-on (SSO).",
      connected: user?.provider === "google" || !!user?.googleId,
      logoColor: "text-red-500",
      actions: {
        connect: onConnectGoogle,
        disconnect: onDisconnectGoogle,
      },
    },
    {
      id: "github",
      name: "GitHub Profile",
      desc: "Synchronize your developer repositories and organization mappings.",
      connected: false,
      logoColor: "text-white",
    },
    {
      id: "microsoft",
      name: "Microsoft Exchange",
      desc: "Connect for corporate identity workspace single sign-on.",
      connected: false,
      logoColor: "text-sky-500",
    },
    {
      id: "linkedin",
      name: "LinkedIn Talent Hub",
      desc: "Sync professional creator details and organization metrics.",
      connected: false,
      logoColor: "text-indigo-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Link2 className="text-indigo-400" size={20} /> Connected Accounts
        </h2>
        <p className="text-xs text-slate-400 mt-1">Connect third-party OAuth providers to enable SSO logins and profiles syncing.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">{acc.name}</h4>
                {acc.connected ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <CheckCircle2 size={10} /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-white/[0.02] border border-white/[0.04] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    <XCircle size={10} /> Inactive
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{acc.desc}</p>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
              <span className="text-[9px] text-slate-500">
                {acc.connected ? "Last synced: Just now" : "Never synced"}
              </span>

              {acc.id === "google" ? (
                acc.connected ? (
                  <button
                    onClick={acc.actions.disconnect}
                    className="h-8 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Unlink size={11} /> Disconnect
                  </button>
                ) : (
                  <button
                    onClick={acc.actions.connect}
                    className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Link2 size={11} /> Connect SSO
                  </button>
                )
              ) : (
                <button
                  onClick={() => toast.success(`Simulated authentication to ${acc.name}`)}
                  className="h-8 px-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-400 hover:text-white transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                >
                  <Link2 size={11} /> Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
