import React, { useEffect, useState } from "react";
import { Sliders, Cpu, Sparkles, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAdvancedPreferences, useUpdateAdvancedPreferences } from "../../hooks/useQueries";

export default function Advanced() {
  const { data: prefs = {}, isLoading, isError, refetch } = useAdvancedPreferences();
  const updatePrefs = useUpdateAdvancedPreferences();
  const [local, setLocal] = useState({ debugMode: false, experimentalFeatures: false, forceCacheBypass: false });

  useEffect(() => {
    if (prefs) {
      setLocal({
        debugMode: prefs.debugMode ?? false,
        experimentalFeatures: prefs.experimentalFeatures ?? false,
        forceCacheBypass: prefs.forceCacheBypass ?? false,
      });
    }
  }, [prefs]);

  const toggle = (field) => setLocal((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSave = async () => {
    try {
      await updatePrefs.mutateAsync(local);
      toast.success("Developer configuration saved.");
    } catch {
      toast.error("Failed to save developer settings.");
    }
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-slate-500" /></div>;
  }

  if (isError) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load advanced settings.</p>
        <button onClick={() => refetch()} className="text-xs text-indigo-400 font-semibold">Retry</button>
      </div>
    );
  }

  const toggles = [
    { key: "debugMode", label: "Debug Mode Console", desc: "Log all incoming and outgoing REST client requests directly to web developer tools." },
    { key: "forceCacheBypass", label: "Force Cache Bypass", desc: "Ignore Redis and local storage caching, forcing direct queries to the scrapers.", icon: <Cpu size={13} className="text-indigo-400" /> },
    { key: "experimentalFeatures", label: "Experimental Workspace Features", desc: "Opt-in to beta graphs, layout overlays, and advanced AI models before official release.", icon: <Sparkles size={13} className="text-indigo-400" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="text-indigo-400" size={20} /> Developer Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">Configure advanced API endpoint parameters, diagnostics logging, and cache bypass thresholds.</p>
      </div>

      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base API Gateway Endpoint</label>
            <input type="text" value={prefs.apiEndpoint || import.meta.env.VITE_API_URL || window.location.origin} readOnly className="w-full h-11 px-4 bg-[#181b24]/50 border border-white/[0.06] rounded-xl text-xs text-slate-400 cursor-not-allowed" />
            <p className="text-[10px] text-slate-500">Configured server endpoint (read-only).</p>
          </div>

          <div className="divide-y divide-white/[0.04] space-y-4 pt-2">
            {toggles.map(({ key, label, desc, icon }) => (
              <div key={key} className="flex items-center justify-between pt-4 first:pt-0">
                <div className="space-y-1 pr-4">
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">{icon}{label}</h4>
                  <p className="text-[10px] text-slate-400">{desc}</p>
                </div>
                <button onClick={() => toggle(key)} className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${local[key] ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${local[key] ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/[0.04]">
          <button onClick={handleSave} disabled={updatePrefs.isPending} className="h-10 px-6 rounded-xl bg-[#181b24] hover:bg-[#1f232f] border border-white/[0.08] text-white transition text-xs font-semibold disabled:opacity-50">
            {updatePrefs.isPending ? "Saving…" : "Save Developer Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
