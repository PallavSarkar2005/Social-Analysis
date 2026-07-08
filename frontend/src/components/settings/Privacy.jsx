import React from "react";
import { ShieldCheck, Eye, BarChart2, Sparkles, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { usePrivacyPreferences, useUpdatePrivacyPreferences } from "../../hooks/useQueries";

const FIELDS = [
  { key: "publicProfile", label: "Public Profile Registry", desc: "Allow other workspace members to look up your creator details and dashboard links.", icon: <Eye size={13} className="text-indigo-400" /> },
  { key: "searchVisibility", label: "Search Engines Visibility", desc: "Allow search engine crawlers (Google, Bing) to index your public portfolio." },
  { key: "analyticsSharing", label: "Anonymous Analytics Sharing", desc: "Share anonymous usage trends to help us improve features and optimize database queries.", icon: <BarChart2 size={13} className="text-indigo-400" /> },
  { key: "telemetry", label: "Advanced Diagnostics & Telemetry", desc: "Transmit console warnings and network load logs to our DevSecOps telemetry center." },
  { key: "personalizedAI", label: "Personalized AI Optimization", desc: "Allow local LLM engines (Groq) to cache your text strategies to generate custom recommendations.", icon: <Sparkles size={13} className="text-indigo-400" /> },
];

export default function Privacy() {
  const { data: prefs = {}, isLoading, isError, refetch } = usePrivacyPreferences();
  const updatePrefs = useUpdatePrivacyPreferences();

  const toggle = async (field) => {
    const next = { ...prefs, [field]: !prefs[field] };
    try {
      await updatePrefs.mutateAsync(next);
      toast.success("Privacy preferences updated.");
    } catch {
      toast.error("Failed to save privacy preferences.");
    }
  };

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync(prefs);
      toast.success("Privacy preferences saved.");
    } catch {
      toast.error("Failed to save privacy preferences.");
    }
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>;
  }

  if (isError) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load privacy settings.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-indigo-400" size={20} /> Privacy & Consent
        </h2>
        <p className="text-xs text-slate-400 mt-1">Configure profile visibility scope, sharing permissions, and AI training preferences.</p>
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
        <div className="divide-y divide-white/[0.04] space-y-6">
          {FIELDS.map(({ key, label, desc, icon }) => (
            <div key={key} className="flex items-center justify-between pt-4 first:pt-0">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">{icon}{label}</h4>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
              <button
                disabled={updatePrefs.isPending}
                onClick={() => toggle(key)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 disabled:opacity-50 ${prefs[key] ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${prefs[key] ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4 border-t border-white/[0.04]">
          <button onClick={handleSave} disabled={updatePrefs.isPending} className="h-10 px-6 rounded-xl bg-[#181b24] hover:bg-[#1f232f] border border-white/[0.08] text-white transition text-xs font-semibold disabled:opacity-50">
            {updatePrefs.isPending ? "Saving…" : "Save Privacy Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
