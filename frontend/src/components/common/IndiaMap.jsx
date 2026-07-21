import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, MapPin, ShieldCheck, Newspaper, Landmark, X } from "lucide-react";
import { INDIA_MAP_VIEWBOX, INDIA_STATE_PATHS } from "../../data/indiaStatesPaths";
import { asArray, safeText } from "../../utils/safeData";

const TIER_COLORS = {
  strong: {
    fill: "rgba(49, 46, 129, 0.92)",
    hover: "rgba(49, 46, 129, 1)",
    stroke: "#818cf8",
    label: "Strong Influence",
  },
  high: {
    fill: "rgba(67, 56, 202, 0.72)",
    hover: "rgba(67, 56, 202, 0.9)",
    stroke: "#a5b4fc",
    label: "High Influence",
  },
  moderate: {
    fill: "rgba(99, 102, 241, 0.45)",
    hover: "rgba(99, 102, 241, 0.65)",
    stroke: "#a5b4fc",
    label: "Moderate Influence",
  },
  emerging: {
    fill: "rgba(129, 140, 248, 0.22)",
    hover: "rgba(129, 140, 248, 0.4)",
    stroke: "rgba(165,180,252,0.45)",
    label: "Emerging",
  },
  monitoring: {
    fill: "rgba(255,255,255,0.03)",
    hover: "rgba(255,255,255,0.08)",
    stroke: "rgba(255,255,255,0.08)",
    label: "Monitoring",
  },
};

const tierFromScore = (score, verified) => {
  if (!verified) return "monitoring";
  if (score >= 80) return "strong";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "emerging";
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

function RegionalSummary({ summary, meta }) {
  const primary = safeText(summary?.primaryRegion) || null;
  const secondary = asArray(summary?.secondaryRegions).map(safeText).filter(Boolean);
  const emerging = asArray(summary?.emergingRegions).map(safeText).filter(Boolean);
  const coverage = summary?.verifiedCoverage ?? meta?.verifiedCoverage ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Primary Region</p>
        <p className="mt-1 text-sm font-semibold text-white truncate">
          {primary || "Monitoring"}
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Secondary</p>
        <p className="mt-1 text-sm font-semibold text-slate-200 truncate">
          {secondary.length ? secondary.join(", ") : "—"}
        </p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Emerging</p>
        <p className="mt-1 text-sm font-semibold text-slate-200 truncate">
          {emerging.length ? emerging.join(", ") : "—"}
        </p>
      </div>
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-300/80">
          Verified Coverage
        </p>
        <p className="mt-1 text-sm font-semibold text-indigo-200">
          {coverage} State{coverage === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}

function StateDetailsPanel({ state, info, onClose }) {
  if (!state) return null;
  const verified = Boolean(info && info.status !== "monitoring" && info.tier !== "monitoring");
  const sources = asArray(
    info?.primarySources?.length
      ? info.primarySources
      : info?.source
        ? String(info.source).split(";").map((s) => s.trim()).filter(Boolean)
        : []
  )
    .map((src) => safeText(src))
    .filter(Boolean);

  const evidenceItems = asArray(info?.evidence)
    .map((item) => ({
      label: safeText(item?.label || item),
      detail: safeText(item?.detail),
    }))
    .filter((item) => item.label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-xl border border-white/[0.08] bg-[#161822] p-4 space-y-3 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-indigo-400" />
            <h5 className="text-sm font-bold text-white">{state}</h5>
            {info?.isPrimary && (
              <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                Primary
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {verified
              ? TIER_COLORS[info.tier]?.label || "Verified Region"
              : "Under geographic monitoring"}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition"
            aria-label="Close state details"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {verified ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Influence</p>
              <p className="text-sm font-bold text-indigo-300">{info.influenceScore ?? 0}%</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Confidence</p>
              <p className="text-sm font-bold text-white">{info.confidence ?? 0}%</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] p-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Evidence</p>
              <p className="text-sm font-bold text-white">{info.evidenceCount ?? 0}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex items-center gap-1">
                <Landmark size={11} /> Political Role
              </span>
              <span className="text-slate-200 text-right font-medium">
                {safeText(info.politicalRole) || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 flex items-center gap-1">
                <ShieldCheck size={11} /> Election History
              </span>
              <span className="text-slate-200 text-right font-medium">
                {info.electionWins > 0
                  ? `${info.electionWins} Win${info.electionWins === 1 ? "" : "s"}`
                  : info.electionHistory?.length
                    ? `${info.electionHistory.length} Contest(s)`
                    : "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Last Updated</span>
              <span className="text-slate-200 font-medium">{formatDate(info.lastUpdated)}</span>
            </div>
          </div>

          {evidenceItems.length > 0 && (
            <div className="pt-1 border-t border-white/[0.05] space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Verified Evidence
              </p>
              {evidenceItems.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[10px]">
                  <Newspaper size={10} className="text-indigo-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-slate-200 font-medium">{item.label}</p>
                    {item.detail ? (
                      <p className="text-slate-500 truncate">{item.detail}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="pt-1 border-t border-white/[0.05]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                Primary Sources
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sources.slice(0, 6).map((src) => (
                  <span
                    key={src}
                    className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-300"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          No verified territorial evidence for {state} yet. This state remains under continuous
          geographic monitoring and will activate once office, election, or biography evidence is confirmed.
        </p>
      )}
    </motion.div>
  );
}

export default function IndiaMap({
  data = [],
  activeState = "",
  geographicMeta = null,
}) {
  const [hoveredState, setHoveredState] = useState(null);
  const [selectedState, setSelectedState] = useState(null);

  const safePaths = asArray(INDIA_STATE_PATHS);
  const byName = new Map();
  for (const item of asArray(data)) {
    if (!item?.state) continue;
    byName.set(String(item.state).toLowerCase(), item);
  }

  const summary = geographicMeta?.regionalSummary || {
    primaryRegion: null,
    secondaryRegions: [],
    emergingRegions: [],
    verifiedCoverage: byName.size,
  };

  useEffect(() => {
    const primary =
      summary.primaryRegion ||
      data?.find((d) => d.isPrimary)?.state ||
      data?.[0]?.state ||
      null;
    if (primary) setSelectedState(primary);
  }, [summary.primaryRegion]);

  const getStateInfo = (stateName) => {
    const match = byName.get(String(stateName).toLowerCase());
    if (!match) {
      return {
        state: stateName,
        tier: "monitoring",
        status: "monitoring",
        influenceScore: null,
        confidence: null,
        evidenceCount: 0,
        evidence: [],
        primarySources: [],
        isHomeState: false,
        isPrimary: false,
      };
    }
    const score = Number(match.influenceScore) || 0;
    const tier = match.tier || tierFromScore(score, true);
    return {
      ...match,
      tier,
      status: match.status || "verified",
      isHomeState: Boolean(
        match.isHomeState ||
          (activeState &&
            String(activeState).toLowerCase() === String(stateName).toLowerCase())
      ),
    };
  };

  const focusName = selectedState || hoveredState?.name || null;
  const focusInfo = focusName ? getStateInfo(focusName) : null;

  return (
    <div className="w-full bg-[#121318]/30 border border-white/[0.06] rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Geographic Footprint
        </h4>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Evidence-backed state influence · click a state for intelligence detail
        </p>
      </div>

      <RegionalSummary summary={summary} meta={geographicMeta} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(200px,0.9fr)] gap-3 items-start">
        <div className="relative w-full min-h-[280px] flex items-center justify-center">
          <svg
            viewBox={INDIA_MAP_VIEWBOX}
            className="w-full h-full max-h-[300px] select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
            aria-label="India influence intelligence map"
          >
            <g fill="none" strokeWidth="0.7">
              {safePaths.map((state) => {
                const info = getStateInfo(state.name);
                const tier = info.tier || "monitoring";
                const colors = TIER_COLORS[tier] || TIER_COLORS.monitoring;
                const isHovered = hoveredState?.id === state.id;
                const isSelected = selectedState === state.name;

                return (
                  <path
                    key={state.id}
                    d={state.path}
                    fill={
                      isHovered || isSelected ? colors.hover : colors.fill
                    }
                    stroke={
                      isSelected || isHovered
                        ? "#c7d2fe"
                        : info.isPrimary
                          ? "#818cf8"
                          : colors.stroke
                    }
                    strokeWidth={isSelected || isHovered || info.isPrimary ? 1.4 : 0.6}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredState({ id: state.id, name: state.name, info })
                    }
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() =>
                      setSelectedState((prev) =>
                        prev === state.name ? null : state.name
                      )
                    }
                  />
                );
              })}
            </g>
          </svg>

          <AnimatePresence>
            {hoveredState && !selectedState && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-2 left-2 z-20 bg-[#161822]/95 border border-white/[0.08] backdrop-blur-md rounded-xl p-3 text-left shadow-xl min-w-[160px] max-w-[220px]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="text-xs font-bold text-white">{hoveredState.name}</span>
                </div>
                {hoveredState.info?.tier && hoveredState.info.tier !== "monitoring" ? (
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Influence</span>
                      <span className="font-bold text-indigo-300">
                        {hoveredState.info.influenceScore}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence</span>
                      <span className="font-bold text-white">
                        {hoveredState.info.confidence}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Evidence</span>
                      <span className="font-bold text-white">
                        {hoveredState.info.evidenceCount || 0}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 pt-1 border-t border-white/[0.04]">
                      Click for full intelligence detail
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">Monitoring — no verified influence yet</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {focusName ? (
            <StateDetailsPanel
              key={focusName}
              state={focusName}
              info={focusInfo}
              onClose={selectedState ? () => setSelectedState(null) : undefined}
            />
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] p-4 text-[11px] text-slate-500 leading-relaxed"
            >
              Select any state to inspect influence score, confidence, political role, election
              history, and the verified sources behind the conclusion.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] text-slate-500 border-t border-white/[0.04] pt-3">
        {Object.entries(TIER_COLORS).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm border border-white/10"
              style={{ background: value.fill }}
            />
            <span>{value.label}</span>
          </div>
        ))}
      </div>

      {geographicMeta?.message ? (
        <p className="text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0 text-slate-600" />
          {geographicMeta.message}
        </p>
      ) : null}
    </div>
  );
}
