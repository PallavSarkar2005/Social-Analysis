import { BarChart2 } from "lucide-react";

import { safeArray } from "../../utils/profileFacts";
import { formatIndianDate } from "../../utils/dateFormatter";
import { safeText } from "../../utils/safeData";

export default function PoliticalStatisticsPanel({ statistics = [], sectionMeta = {} }) {
  const safeStatistics = safeArray(statistics);

  if (!safeStatistics.length) return null;

  const meta = sectionMeta?.profile || sectionMeta?.facts || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Political Statistics</h3>
        </div>
        {meta.lastVerified && (
          <span className="text-[10px] text-slate-500">
            Verified {formatIndianDate(meta.lastVerified)}
            {meta.sourceCount > 0 && ` · ${meta.sourceCount} sources`}
            {meta.confidence > 0 && ` · ${meta.confidence}% confidence`}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {safeStatistics
          .filter((s) => s.key !== "lastVerified")
          .map((stat) => (
            <div
              key={stat.key}
              className="rounded-xl border border-white/[0.06] bg-[#121318]/30 p-4"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {safeText(stat.label)}
              </span>
              <p className="mt-1.5 text-lg font-extrabold text-white">{safeText(stat.value)}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
