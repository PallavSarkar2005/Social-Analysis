import React from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  GraduationCap,
  Briefcase,
  Award,
  Trophy,
  Shield,
  Landmark,
  ExternalLink,
  Clock,
} from "lucide-react";

const CATEGORY_META = {
  birth: { icon: Calendar, color: "text-rose-400", ring: "ring-rose-500/30", bg: "bg-rose-500/10" },
  school: { icon: GraduationCap, color: "text-sky-400", ring: "ring-sky-500/30", bg: "bg-sky-500/10" },
  college: { icon: GraduationCap, color: "text-cyan-400", ring: "ring-cyan-500/30", bg: "bg-cyan-500/10" },
  earlyCareer: { icon: Briefcase, color: "text-amber-400", ring: "ring-amber-500/30", bg: "bg-amber-500/10" },
  joinedParty: { icon: Award, color: "text-violet-400", ring: "ring-violet-500/30", bg: "bg-violet-500/10" },
  election: { icon: Trophy, color: "text-emerald-400", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10" },
  position: { icon: Shield, color: "text-indigo-400", ring: "ring-indigo-500/30", bg: "bg-indigo-500/10" },
  cabinetCommittee: { icon: Shield, color: "text-orange-400", ring: "ring-orange-500/30", bg: "bg-orange-500/10" },
  currentOffice: { icon: Landmark, color: "text-fuchsia-400", ring: "ring-fuchsia-500/30", bg: "bg-fuchsia-500/10" },
};

import { safeArray } from "../../utils/profileFacts";

export default function PoliticalTimelinePanel({ events = [], isLoading = false, sources = [] }) {
  const safeEvents = safeArray(events);
  const safeSources = safeArray(sources);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#121318]/80 via-[#10121a]/70 to-[#0d0f16]/80 p-6 shadow-2xl">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-500/[0.03] to-transparent" />

      <div className="relative space-y-6">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-indigo-400/90">
              Intelligence Timeline
            </span>
          </div>
          <h3 className="text-base font-bold text-white">Career & Political Milestones</h3>
          <p className="mt-1 text-xs text-slate-400">
            Chronological events merged from verified public records
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          </div>
        ) : safeEvents.length > 0 ? (
          <div className="relative space-y-0">
            <div className="absolute bottom-4 left-[18px] top-4 w-px bg-gradient-to-b from-indigo-500/40 via-white/[0.08] to-emerald-500/30" />

            {safeEvents.map((event, idx) => {
              const meta = CATEGORY_META[event.category] || CATEGORY_META.position;
              const Icon = meta.icon;

              return (
                <motion.div
                  key={event.id || `${event.year}-${event.title}-${idx}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                  className="relative flex gap-4 pb-8 last:pb-0"
                >
                  <div className="relative z-10 flex shrink-0 flex-col items-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ring-2 ${meta.bg} ${meta.ring}`}
                    >
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:border-white/[0.1] hover:bg-white/[0.04]">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-indigo-300 ring-1 ring-indigo-500/20">
                        {event.year}
                      </span>
                      <h4 className="text-xs font-bold text-white">{event.title}</h4>
                      {event.confidence > 0 && (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 ring-1 ring-emerald-500/20">
                          {event.confidence}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-slate-300">{event.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/[0.04] pt-3">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Source
                      </span>
                      {event.sourceUrl ? (
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 transition hover:text-indigo-300"
                        >
                          {event.source}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">{event.source}</span>
                      )}
                      {safeArray(event.verifiedBy).length > 0 && (
                        <span className="ml-2 text-[9px] text-slate-500">
                          Verified by {safeArray(event.verifiedBy).slice(0, 3).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-4 py-10 text-center">
            <p className="text-xs font-semibold text-slate-400">No dated milestones available</p>
            <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
              Timeline events appear only when verified years are found in public records. Undated education and career
              details may still appear in the profile facts panel.
            </p>
          </div>
        )}

        {safeSources.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Cross-Referenced Sources
            </h4>
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
                    {source.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span
                    key={idx}
                    className="inline-flex rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] font-semibold text-slate-500"
                  >
                    {source.name}
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
