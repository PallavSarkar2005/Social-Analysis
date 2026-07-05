import React from "react";
import { Shield } from "lucide-react";

const CATEGORY_LABELS = {
  identity: "Identity",
  birth: "Birth",
  education: "Education",
  career: "Career",
  electionHistory: "Election History",
  biography: "Biography",
  overall: "Overall",
};

export default function ConfidenceBreakdown({ breakdown = {} }) {
  const entries = Object.entries(breakdown ?? {}).filter(
    ([key, value]) => key !== "overall" && value > 0
  );

  if (entries.length === 0 && !breakdown.overall) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#121318]/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-400" />
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Confidence Breakdown
        </h4>
        {breakdown.overall > 0 && (
          <span className="ml-auto rounded-lg bg-emerald-500/10 px-2.5 py-1 text-sm font-extrabold text-emerald-300 ring-1 ring-emerald-500/20">
            {breakdown.overall}%
          </span>
        )}
      </div>

      <div className="space-y-3">
        {entries.map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-slate-400">{CATEGORY_LABELS[key] || key}</span>
              <span className="font-bold text-white">{value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-700"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
