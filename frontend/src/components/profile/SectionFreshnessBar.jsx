import { Clock } from "lucide-react";
import { formatIndianDate } from "../../utils/dateFormatter";

export default function SectionFreshnessBar({ meta = {}, label = "Section" }) {
  const lastUpdated = meta.lastUpdated || meta.lastVerified;
  const sourceCount = meta.sourceCount;
  const confidence = meta.confidence;
  const cacheExpiresAt = meta.cacheExpiresAt;

  if (!lastUpdated && !confidence && !sourceCount && !cacheExpiresAt) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
      <Clock className="h-3 w-3" />
      <span className="font-semibold uppercase tracking-wider text-slate-600">{label}</span>
      {lastUpdated && <span>Last updated {formatIndianDate(lastUpdated)}</span>}
      {sourceCount > 0 && <span>{sourceCount} sources</span>}
      {confidence > 0 && (
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-400">
          {confidence}% confidence
        </span>
      )}
      {cacheExpiresAt && (
        <span className="text-slate-600">Cache expires {formatIndianDate(cacheExpiresAt)}</span>
      )}
      {meta.version > 0 && (
        <span className="text-slate-600">v{meta.version}</span>
      )}
      {meta.hasData === true && (
        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-400">Synced</span>
      )}
      {meta.hasData === false && meta.enabled && (
        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-400">Awaiting data</span>
      )}
      {meta.eventCount != null && <span>{meta.eventCount} events</span>}
      {meta.factCount != null && <span>{meta.factCount} facts</span>}
      {meta.electionCount != null && <span>{meta.electionCount} elections</span>}
    </div>
  );
}
