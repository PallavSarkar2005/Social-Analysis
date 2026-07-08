import React, { useEffect, useRef } from "react";
import { Link2, Unlink, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useIntegrations } from "../../hooks/useQueries";

const SSO_PROVIDERS = [
  { id: "google", name: "Google Authentication", desc: "Link your Google account to log in with single sign-on (SSO).", logoColor: "text-red-500", oauth: true },
  { id: "github", name: "GitHub Profile", desc: "Synchronize your developer repositories and organization mappings.", logoColor: "text-white", oauth: true },
  { id: "microsoft", name: "Microsoft Exchange", desc: "Connect for corporate identity workspace single sign-on.", logoColor: "text-sky-500", oauth: true },
  { id: "linkedin", name: "LinkedIn Talent Hub", desc: "Sync professional creator details and organization metrics.", logoColor: "text-indigo-500", oauth: true },
];

export default function ConnectedAccounts({ user, onConnectGoogle, onDisconnectGoogle }) {
  const { data, isLoading, isError, refetch } = useIntegrations();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return;
    let script;
    let cancelled = false;

    script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    script.onload = () => {
      if (cancelled || !window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          const res = await onConnectGoogle(response.credential);
          if (res?.success) toast.success("Google account connected.");
          else toast.error(res?.message || "Connection failed.");
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "small" });
    };

    return () => {
      cancelled = true;
      script?.parentNode?.removeChild(script);
    };
  }, [onConnectGoogle]);

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center text-slate-500">
        <RefreshCw size={18} className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load connected accounts.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  const googleConnected = data?.google?.connected || user?.provider === "google" || !!user?.googleId;
  const integrationMap = Object.fromEntries((data?.integrations ?? []).map((i) => [i.id, i]));

  const accounts = SSO_PROVIDERS.map((p) => ({
    ...p,
    connected: p.id === "google" ? googleConnected : Boolean(integrationMap[p.id]?.connected),
    lastSynced: integrationMap[p.id]?.lastSyncedAt,
    oauthAvailable: p.id === "google" ? true : Boolean(integrationMap[p.id]?.oauthAvailable),
  }));

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
          <div key={acc.id} className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200">
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
                {acc.connected && acc.lastSynced ? `Last synced: ${new Date(acc.lastSynced).toLocaleString()}` : acc.connected ? "Connected" : "Never synced"}
              </span>

              {acc.id === "google" ? (
                acc.connected ? (
                  <button onClick={onDisconnectGoogle} className="h-8 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-400 transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Unlink size={11} /> Disconnect
                  </button>
                ) : (
                  <div ref={googleBtnRef} className="min-h-8" />
                )
              ) : (
                <button
                  disabled={!acc.oauthAvailable}
                  onClick={() => toast.error(`${acc.name} OAuth is not configured on this server.`)}
                  className="h-8 px-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-400 hover:text-white transition flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Link2 size={11} /> {acc.oauthAvailable ? "Connect" : "Coming Soon"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
