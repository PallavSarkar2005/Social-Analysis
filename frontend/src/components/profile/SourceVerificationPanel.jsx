import React from "react";
import { CheckCircle2, Circle, ExternalLink, Shield } from "lucide-react";

import { safeArray } from "../../utils/profileFacts";
import { formatIndianDate } from "../../utils/dateFormatter";

export default function SourceVerificationPanel({
  sources = [],
  verificationCatalog = [],
  lastVerified,
}) {
  const safeSources = safeArray(sources);
  const safeCatalog = safeArray(verificationCatalog);
  const verified =
    safeCatalog.length > 0
      ? safeCatalog
      : safeSources.filter((s) => s.verified || (s.confidence ?? 0) > 0);

  if (verified.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121318]/80 to-[#0f1118]/60 p-6 shadow-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-emerald-400" />
        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400/90">
          Multi-Source Verification
        </span>
      </div>

      <div className="space-y-2">
        {verified.map((source, idx) => (
          <div
            key={source.key || idx}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 truncate text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  {source.label || source.name}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ) : (
                <span className="truncate text-xs font-semibold text-slate-300">
                  {source.label || source.name}
                </span>
              )}
            </div>
            <div className="shrink-0 text-right">
              {source.confidence > 0 && (
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                  {source.confidence}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {lastVerified && (
        <p className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] text-slate-500">
          Last verified {formatIndianDate(lastVerified)} · {verified.length} active
          sources
        </p>
      )}
    </div>
  );
}
