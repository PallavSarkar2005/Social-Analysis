import React from "react";
import { Sparkles } from "lucide-react";

const SECTION_LABELS = {
  politicalJourney: "Political Journey",
  majorAchievements: "Major Achievements",
  electionPerformance: "Election Performance",
  currentRole: "Current Role",
  publicProfile: "Public Profile",
};

import { safeArray } from "../../utils/profileFacts";

export default function AISummaryPanel({ summary = {}, insights = [] }) {
  const safeInsights = safeArray(insights);
  const sections = Object.entries(summary ?? {}).filter(([, value]) => value && String(value).trim());

  if (sections.length === 0 && safeInsights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#121318]/20 p-6 text-left space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">
          AI Political Summary
        </h3>
      </div>

      {sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
              <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                {SECTION_LABELS[key] || key}
              </h4>
              <p className="text-xs leading-relaxed text-slate-300">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2.5 text-xs text-slate-300">
          {safeInsights.map((insight, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
