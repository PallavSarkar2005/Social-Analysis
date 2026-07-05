import React from "react";
import { Clock } from "lucide-react";
import { formatIndianDate } from "../../utils/dateFormatter";

export default function SectionFreshnessBar({ meta = {}, label = "Section" }) {
  if (!meta.lastVerified && !meta.confidence && !meta.sourceCount) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
      <Clock className="h-3 w-3" />
      <span className="font-semibold uppercase tracking-wider text-slate-600">{label}</span>
      {meta.lastVerified && <span>Last verified {formatIndianDate(meta.lastVerified)}</span>}
      {meta.sourceCount > 0 && <span>{meta.sourceCount} sources</span>}
      {meta.confidence > 0 && (
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-400">
          {meta.confidence}% confidence
        </span>
      )}
      {meta.eventCount != null && <span>{meta.eventCount} events</span>}
      {meta.factCount != null && <span>{meta.factCount} facts</span>}
      {meta.electionCount != null && <span>{meta.electionCount} elections</span>}
    </div>
  );
}
