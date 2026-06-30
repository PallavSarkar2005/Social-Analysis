import React, { useState } from "react";
import { ShieldCheck, Eye, EyeOff, BarChart2, Cookie, Cpu, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function Privacy() {
  const [publicProfile, setPublicProfile] = useState(false);
  const [searchVisibility, setSearchVisibility] = useState(false);
  const [analyticsSharing, setAnalyticsSharing] = useState(true);
  const [cookiesAllowed, setCookiesAllowed] = useState(true);
  const [telemetry, setTelemetry] = useState(false);
  const [personalizedAI, setPersonalizedAI] = useState(true);

  const handleSave = () => {
    toast.success("Privacy preferences updated successfully.");
  };

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
          {/* Public Profile */}
          <div className="flex items-center justify-between pt-4 first:pt-0">
            <div className="space-y-1 pr-4">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Eye size={13} className="text-indigo-400" /> Public Profile Registry
              </h4>
              <p className="text-[10px] text-slate-400">Allow other workspace members to look up your creator details and dashboard links.</p>
            </div>
            <button
              onClick={() => setPublicProfile(!publicProfile)}
              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                publicProfile ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  publicProfile ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Search Indexing */}
          <div className="flex items-center justify-between pt-6">
            <div className="space-y-1 pr-4">
              <h4 className="text-xs font-semibold text-white">Search Engines Visibility</h4>
              <p className="text-[10px] text-slate-400">Allow search engine crawlers (Google, Bing) to index your public portfolio.</p>
            </div>
            <button
              onClick={() => setSearchVisibility(!searchVisibility)}
              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                searchVisibility ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  searchVisibility ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Analytics Sharing */}
          <div className="flex items-center justify-between pt-6">
            <div className="space-y-1 pr-4">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <BarChart2 size={13} className="text-indigo-400" /> Anonymous Analytics Sharing
              </h4>
              <p className="text-[10px] text-slate-400">Share anonymous usage trends to help us improve features and optimize database queries.</p>
            </div>
            <button
              onClick={() => setAnalyticsSharing(!analyticsSharing)}
              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                analyticsSharing ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  analyticsSharing ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Telemetry Tracking */}
          <div className="flex items-center justify-between pt-6">
            <div className="space-y-1 pr-4">
              <h4 className="text-xs font-semibold text-white">Advanced Diagnostics & Telemetry</h4>
              <p className="text-[10px] text-slate-400">Transmit console warnings and network load logs to our DevSecOps telemetry center.</p>
            </div>
            <button
              onClick={() => setTelemetry(!telemetry)}
              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                telemetry ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  telemetry ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Personalized AI Training */}
          <div className="flex items-center justify-between pt-6">
            <div className="space-y-1 pr-4">
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-400" /> Personalized AI Optimization
              </h4>
              <p className="text-[10px] text-slate-400">Allow local LLM engines (Groq) to cache your text strategies to generate custom recommendations.</p>
            </div>
            <button
              onClick={() => setPersonalizedAI(!personalizedAI)}
              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none flex-shrink-0 ${
                personalizedAI ? "bg-indigo-600" : "bg-[#181b24] border border-white/[0.08]"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                  personalizedAI ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/[0.04]">
          <button
            onClick={handleSave}
            className="h-10 px-6 rounded-xl bg-[#181b24] hover:bg-[#1f232f] border border-white/[0.08] text-white transition text-xs font-semibold"
          >
            Save Privacy Settings
          </button>
        </div>
      </div>
    </div>
  );
}
