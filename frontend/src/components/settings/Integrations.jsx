import React from "react";
import { Layers, CheckCircle2, XCircle, ArrowUpRight, Zap, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export default function Integrations() {
  const list = [
    { id: "youtube", name: "YouTube Analytics v3", type: "Social Network", connected: true, status: "Healthy" },
    { id: "twitter", name: "Twitter / X API", type: "Social Network", connected: false },
    { id: "instagram", name: "Instagram Meta Graphs", type: "Social Network", connected: false },
    { id: "drive", name: "Google Drive Backup", type: "Storage", connected: false },
    { id: "slack", name: "Slack Notifications", type: "Collaboration", connected: false },
    { id: "discord", name: "Discord Webhooks", type: "Collaboration", connected: true, status: "Active" },
    { id: "zapier", name: "Zapier Automations", type: "Automation", connected: false },
    { id: "n8n", name: "n8n Workflows", type: "Automation", connected: false },
    { id: "webhook", name: "Outgoing Custom Webhooks", type: "Developers", connected: true, status: "Listening" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="text-indigo-400" size={20} /> App Integrations
        </h2>
        <p className="text-xs text-slate-400 mt-1">Connect third-party messaging services, cloud drives, and webhook endpoints.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((app) => (
          <div
            key={app.id}
            className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{app.type}</span>
                {app.connected ? (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                    {app.status}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded uppercase">
                    Disconnected
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                {app.name}
              </h4>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
              <span className="text-[9px] text-slate-500">
                {app.connected ? "Last sync: Just now" : "Never synced"}
              </span>

              {app.connected ? (
                <button
                  onClick={() => toast.success(`Simulated disconnect from ${app.name}`)}
                  className="h-7 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition text-[9px] font-bold uppercase tracking-wider"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => toast.success(`Simulated connection to ${acc.name}`)}
                  className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                >
                  Connect <ArrowUpRight size={10} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
