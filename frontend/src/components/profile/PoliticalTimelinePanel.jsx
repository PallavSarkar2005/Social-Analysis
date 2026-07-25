import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  GraduationCap,
  Award,
  Trophy,
  Shield,
  Landmark,
  ExternalLink,
  Clock,
} from "lucide-react";
import { safeArray } from "../../utils/profileFacts";
import { safeText } from "../../utils/safeData";
import {
  sanitizeTimelineEventForDisplay,
  dedupeTimelineEvents,
  polishTimelineTitle,
  polishTimelineDescription,
} from "../../utils/timelineText";

function cleanPartyLabel(party, eventYear = null) {
  const line = polishTimelineDescription(party ? `Party: ${party}` : "", eventYear);
  return line.replace(/^Party:\s*/i, "").trim();
}

const CATEGORY_META = {
  birth: { icon: Calendar, color: "text-rose-400", ring: "ring-rose-500/30", bg: "bg-rose-500/10" },
  school: { icon: GraduationCap, color: "text-sky-400", ring: "ring-sky-500/30", bg: "bg-sky-500/10" },
  college: { icon: GraduationCap, color: "text-cyan-400", ring: "ring-cyan-500/30", bg: "bg-cyan-500/10" },
  joinedParty: { icon: Award, color: "text-violet-400", ring: "ring-violet-500/30", bg: "bg-violet-500/10" },
  election: { icon: Trophy, color: "text-emerald-400", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10" },
  position: { icon: Shield, color: "text-indigo-400", ring: "ring-indigo-500/30", bg: "bg-indigo-500/10" },
  cabinetCommittee: { icon: Shield, color: "text-orange-400", ring: "ring-orange-500/30", bg: "bg-orange-500/10" },
  currentOffice: { icon: Landmark, color: "text-fuchsia-400", ring: "ring-fuchsia-500/30", bg: "bg-fuchsia-500/10" },
};

function hasMeaningfulElection(election) {
  if (!election || typeof election !== "object") return false;
  return Boolean(
    election.type ||
      election.constituency ||
      election.party ||
      election.result ||
      election.margin != null ||
      election.voteShare != null ||
      election.year
  );
}

function ElectionCard({ event }) {
  const e = event.election || {};
  const won = e.result === "Won";
  const lost = e.result === "Lost";
  const partyLabel = cleanPartyLabel(e.party, e.year || event.year);
  // CRITICAL: render event.title ONLY — never election.type.
  // election.type is a raw type key and historically contained "Won Won Re";
  // prefixing/falling back to it produced "Won Won Won Re" in the UI.
  const displayTitle = safeText(event.title) || "Election";

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-indigo-300 ring-1 ring-indigo-500/20">
          {safeText(e.year || event.year)}
        </span>
        <h4 className="text-sm font-bold text-white break-words">{displayTitle}</h4>
        {e.result && (
          <span
            className={`rounded-md px-2 py-0.5 text-[9px] font-bold ring-1 ${
              won
                ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25"
                : lost
                  ? "bg-rose-500/15 text-rose-400 ring-rose-500/25"
                  : "bg-slate-500/15 text-slate-400 ring-slate-500/25"
            }`}
          >
            {safeText(e.result)}
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-slate-300">
        {e.constituency && (
          <p className="break-words">
            <span className="text-slate-500">Constituency:</span> {safeText(e.constituency)}
          </p>
        )}
        {partyLabel && (
          <p className="break-words">
            <span className="text-slate-500">Party:</span> {safeText(partyLabel)}
          </p>
        )}
        {e.margin != null && Number.isFinite(Number(e.margin)) && (
          <p>
            <span className="text-slate-500">Margin:</span> +{Number(e.margin).toLocaleString()}
          </p>
        )}
        {e.voteShare != null && Number.isFinite(Number(e.voteShare)) && (
          <p>
            <span className="text-slate-500">Vote share:</span> {e.voteShare}%
          </p>
        )}
      </div>

      {event.source && (
        <div className="mt-3 border-t border-white/[0.04] pt-3">
          {event.sourceUrl ? (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {safeText(event.source)}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">{safeText(event.source)}</span>
          )}
        </div>
      )}
    </div>
  );
}

function StandardCard({ event }) {
  const title = polishTimelineTitle(event.title || "", { category: event.category });
  const desc = polishTimelineDescription(event.description || "", event.year);

  const showDesc =
    desc &&
    desc.toLowerCase() !== title.toLowerCase() &&
    !title.toLowerCase().includes(desc.toLowerCase());

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-indigo-300 ring-1 ring-indigo-500/20">
          {safeText(event.year)}
        </span>
        <h4 className="text-sm font-bold text-white break-words">{safeText(title) || "Milestone"}</h4>
      </div>
      {showDesc && (
        <p className="whitespace-pre-line break-words text-xs leading-relaxed text-slate-300">{desc}</p>
      )}
      {event.source && (
        <div className="mt-3 border-t border-white/[0.04] pt-3">
          {event.sourceUrl ? (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
            >
              {safeText(event.source)}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">{safeText(event.source)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function PoliticalTimelinePanel({ events = [], isLoading = false, sources = [] }) {
  const safeEvents = useMemo(() => {
    const polished = safeArray(events)
      .map(sanitizeTimelineEventForDisplay)
      .filter(Boolean);
    return dedupeTimelineEvents(polished);
  }, [events]);
  const safeSources = safeArray(sources);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121318]/80 via-[#10121a]/70 to-[#0d0f16]/80 p-6 shadow-2xl">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/[0.03] to-transparent" />

      <div className="relative space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-400/90">
              Career Timeline
            </span>
          </div>
          <h3 className="text-base font-bold text-white">Career History</h3>
          <p className="mt-1 text-xs text-slate-400">Verified milestones in chronological order</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
            <span className="sr-only">Loading timeline</span>
          </div>
        ) : safeEvents.length > 0 ? (
          <div className="relative space-y-0" role="list" aria-label="Career timeline">
            <div className="absolute bottom-4 left-[18px] top-4 w-px bg-gradient-to-b from-indigo-500/40 via-white/[0.08] to-emerald-500/30" aria-hidden="true" />

            {safeEvents.map((event, idx) => {
              const meta = CATEGORY_META[event.category] || CATEGORY_META.position;
              const Icon = meta.icon;
              const useElectionCard =
                event.category === "election" && hasMeaningfulElection(event.election);

              return (
                <motion.div
                  key={event.id || `${event.year}-${event.title}-${idx}`}
                  role="listitem"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className="relative flex gap-4 pb-8 last:pb-0"
                >
                  <div className="relative z-10 flex shrink-0 flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ring-2 ${meta.bg} ${meta.ring}`}
                      aria-hidden="true"
                    >
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                  </div>

                  {useElectionCard ? (
                    <ElectionCard event={event} />
                  ) : (
                    <StandardCard event={event} />
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-4 py-10 text-center">
            <p className="text-xs font-semibold text-slate-400">No verified career milestones yet</p>
            <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
              Timeline events appear when verified years are found in public records.
            </p>
          </div>
        )}

        {safeSources.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {safeSources.map((source, idx) =>
                source.url ? (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:border-indigo-500/30 hover:text-indigo-400"
                  >
                    {safeText(source.name)}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <span
                    key={idx}
                    className="inline-flex rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] font-semibold text-slate-500"
                  >
                    {safeText(source.name)}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
