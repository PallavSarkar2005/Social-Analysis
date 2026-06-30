import React, { useState } from "react";
import { Sliders, ShieldAlert, Cpu, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function Advanced() {
  const [endpoint, setEndpoint] = useState("http://localhost:5000");
  const [debugMode, setDebugMode] = useState(false);
  const [experimentalFeatures, setExperimentalFeatures] = useState(false);
  const [forceBypass, setForceBypass] = useState(false);

  const handleSave = () => {
    toast.success("Developer configuration updated locally.");
  };

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
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full h-11 px-4 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
            />
            <p className="text-[10px] text-slate-500">Overrides the default API URL (used for local staging diagnostics).</p>
          </div>

          <div className="divide-y divide-white/[0.04] space-y-4 pt-2">
            {/* Debug Mode Toggle */}
            <div className="flex items-center justify-between pt-4 first:pt-0">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-semibold text-white">Debug Mode Console</h4>
                <p className="text-[10px] text-slate-400">Log all incoming and outgoing REST client requests directly to web developer tools.</p>
              </div>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                  debugMode ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    debugMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Cache Force Bypass Toggle */}
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Cpu size={13} className="text-indigo-400" /> Force Cache Bypass
                </h4>
                <p className="text-[10px] text-slate-400">Ignore redis and local storage caching, forcing direct queries to the scrapers.</p>
              </div>
              <button
                onClick={() => setForceBypass(!forceBypass)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                  forceBypass ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    forceBypass ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Experimental Features Toggle */}
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles size={13} className="text-indigo-400" /> Experimental Workspace Features
                </h4>
                <p className="text-[10px] text-slate-400">Opt-in to beta graphs, layout overlays, and advanced AI models before official release.</p>
              </div>
              <button
                onClick={() => setExperimentalFeatures(!experimentalFeatures)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                  experimentalFeatures ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    experimentalFeatures ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/[0.04]">
          <button
            onClick={handleSave}
            className="h-10 px-6 rounded-xl bg-[#181b24] hover:bg-[#1f232f] border border-white/[0.08] text-white transition text-xs font-semibold"
          >
            Save Developer Settings
          </button>
        </div>
      </div>
    </div>
  );
}
