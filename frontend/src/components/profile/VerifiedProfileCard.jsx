
import {
  User,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Shield,
  Sparkles,
  Globe,
  Link2,
} from "lucide-react";
import { buildVerifiedProfileFacts, safeArray } from "../../utils/profileFacts";
import { formatIndianDate } from "../../utils/dateFormatter";
import { safeText } from "../../utils/safeData";

const FIELD_ICONS = {
  legalName: User,
  fullName: User,
  knownAs: User,
  dob: Calendar,
  birthPlace: MapPin,
  age: Calendar,
  gender: User,
  constituency: MapPin,
  state: MapPin,
  currentOffice: Briefcase,
  currentPosition: Briefcase,
  education: GraduationCap,
  profession: Briefcase,
  priorCareer: Briefcase,
  party: Award,
  joinedParty: Award,
  parliamentHouse: Award,
  assembly: Award,
  officialWebsite: Globe,
  wikipedia: Link2,
};

export default function VerifiedProfileCard({
  biography,
  account,
  verifiedFacts: apiFacts = [],
  fieldProvenance = {},
  confidenceScore,
  confidenceBreakdown: _confidenceBreakdown = {},
  verifiedAt,
  sources = [],
}) {
  const safeApiFacts = safeArray(apiFacts);
  const safeSources = safeArray(sources);
  const localFacts = buildVerifiedProfileFacts({ biography, account });
  const facts =
    safeApiFacts.length > 0
      ? safeApiFacts.map((f) => ({
          key: f.key,
          label: f.label,
          value: f.value,
          confidence: f.confidence,
          verifiedBy: safeArray(f.verifiedBy),
        }))
      : localFacts;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121318]/80 via-[#0f1118]/60 to-[#121318]/40 p-6 shadow-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-indigo-500/5 blur-[70px]" />

      <div className="relative space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400/90">
                Verified Profile Facts
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Political Intelligence Dossier</h3>
            <p className="mt-1 text-xs text-slate-400">
              Public records cross-verified across government and party sources
            </p>
          </div>
          {confidenceScore > 0 && (
            <div className="shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
              <div className="text-lg font-extrabold text-emerald-300">{confidenceScore}%</div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">
                Confidence
              </div>
            </div>
          )}
        </div>

        {facts.length > 0 ? (
          <div className="space-y-1">
            {facts.map((field) => {
              const Icon = FIELD_ICONS[field.key] || Sparkles;
              const prov = fieldProvenance[field.key];
              const verifiedBy = safeArray(field.verifiedBy).length > 0 ? safeArray(field.verifiedBy) : safeArray(prov?.verifiedBy);

              return (
                <div
                  key={field.key}
                  className="group flex items-start justify-between gap-4 rounded-xl border border-white/[0.03] bg-white/[0.02] px-4 py-3.5 transition hover:border-white/[0.08] hover:bg-white/[0.04]"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-slate-400">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                      <Icon className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-indigo-400" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{field.label}</span>
                  </span>
                  <div className="max-w-[55%] text-right">
                    <span className="text-xs font-semibold leading-relaxed text-slate-100">
                      {safeText(field.value)}
                    </span>
                    {(field.confidence > 0 || verifiedBy?.length > 0) && (
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                    {field.confidence > 0 && (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">
                        {field.confidence}%
                      </span>
                    )}
                    {field.conflict && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-400">
                        conflict
                      </span>
                    )}
                        {verifiedBy.slice(0, 2).map((src, srcIdx) => {
                          const label = safeText(src);
                          if (!label) return null;
                          return (
                          <span
                            key={`${label}-${srcIdx}`}
                            className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[8px] text-slate-500"
                          >
                            {label}
                          </span>
                          );
                        })}
                      </div>
                    )}
                    {field.lastVerified && (
                      <p className="mt-0.5 text-[8px] text-slate-600">Verified {formatIndianDate(field.lastVerified)}</p>
                    )}
                    {field.conflict && field.alternatives?.length > 0 && (
                      <p className="mt-1 text-[8px] leading-relaxed text-amber-400/80">
                        Alt: {safeArray(field.alternatives).map((a) => a.value).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-4 py-8 text-center">
            <p className="text-xs font-semibold text-slate-400">No verified biographical records yet</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Profile enrichment will populate facts as public sources are matched.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-[10px] text-slate-500">
          <span className="font-semibold uppercase tracking-wider">
            {safeSources.length > 0
              ? `${safeSources.length} verified source${safeSources.length === 1 ? "" : "s"}`
              : "Awaiting source match"}
          </span>
          {verifiedAt && <span>Last verified {formatIndianDate(verifiedAt)}</span>}
        </div>
      </div>
    </div>
  );
}
