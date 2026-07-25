import React from "react";
import { Layers, ArrowUpRight, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useIntegrations, useUpdateIntegration } from "../../hooks/useQueries";
import { formatIndianDateTime } from "../../utils/dateFormatter";

const TYPE_LABELS = {
  youtube: "Social Network",
  twitter: "Social Network",
  instagram: "Social Network",
  drive: "Storage",
  slack: "Collaboration",
  discord: "Collaboration",
  zapier: "Automation",
  n8n: "Automation",
  webhook: "Developers",
};

const DISPLAY_NAMES = {
  youtube: "YouTube Analytics v3",
  twitter: "Twitter / X API",
  instagram: "Instagram Meta Graph API",
  drive: "Google Drive Backup",
  slack: "Slack Notifications",
  discord: "Discord Webhooks",
  zapier: "Zapier Automations",
  n8n: "n8n Workflows",
  webhook: "Outgoing Custom Webhooks",
};

export default function Integrations() {
  const { data, isLoading, isError, refetch } = useIntegrations();
  const updateIntegration = useUpdateIntegration();

  const handleToggle = async (app, connect) => {
    if (!app.oauthAvailable && app.id !== "webhook") {
      toast.error(`${DISPLAY_NAMES[app.id] || app.id} is not available on this server.`);
      return;
    }
    try {
      await updateIntegration.mutateAsync({ id: app.id, data: { connected: connect } });
      toast.success(connect ? "Integration connected." : "Integration disconnected.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update integration.");
    }
  };

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
        <p className="text-xs text-rose-400">Failed to load integrations.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  const list = (data?.integrations ?? []).filter((i) => !["github", "microsoft", "linkedin"].includes(i.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="text-indigo-400" size={20} /> App Integrations
        </h2>
        <p className="text-xs text-slate-400 mt-1">Connect third-party messaging services, cloud drives, and webhook endpoints.</p>
      </div>

      {list.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-white/[0.06] rounded-2xl">
          No integrations configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((app) => (
            <div key={app.id} className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{TYPE_LABELS[app.id] || "Integration"}</span>
                  {app.connected ? (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">{app.status || "Active"}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded uppercase">Disconnected</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-white">{DISPLAY_NAMES[app.id] || app.id}</h4>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
                <span className="text-[9px] text-slate-500">
                  {app.connected && app.lastSyncedAt ? `Last sync: ${formatIndianDateTime(app.lastSyncedAt)}` : "Never synced"}
                </span>
                {app.connected ? (
                  <button
                    disabled={updateIntegration.isPending}
                    onClick={() => handleToggle(app, false)}
                    className="h-7 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition text-[9px] font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    disabled={updateIntegration.isPending || (!app.oauthAvailable && app.id !== "webhook")}
                    onClick={() => handleToggle(app, true)}
                    className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {app.oauthAvailable || app.id === "webhook" ? "Connect" : "Coming Soon"} <ArrowUpRight size={10} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
