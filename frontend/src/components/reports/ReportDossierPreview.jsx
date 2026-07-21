import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  Printer,
} from "lucide-react";
import IndiaMap from "../common/IndiaMap";
import { formatIndianDate, formatIndianDateTime } from "../../utils/dateFormatter";
import { safeText } from "../../utils/safeData";

/**
 * Coerce any dossier cell value to a safe React-renderable string.
 * Re-exported from shared safeData for dossier-specific call sites.
 */

const SECTION_DEFS = [
  { id: "cover", label: "Cover", key: "cover" },
  { id: "executiveSummary", label: "Summary", key: "executiveSummary" },
  { id: "politicalProfile", label: "Political Profile", key: "politicalProfile" },
  { id: "careerTimeline", label: "Career Timeline", key: "careerTimeline" },
  { id: "electionHistory", label: "Election History", key: "electionHistory" },
  { id: "influenceIntelligence", label: "Influence Intelligence", key: "influenceIntelligence" },
  { id: "geographicInfluence", label: "Geographic Influence", key: "geographicInfluence" },
  { id: "newsSentiment", label: "News & Sentiment", key: "newsSentiment" },
  { id: "aiInsights", label: "AI Insights", key: "aiInsights" },
  { id: "evidenceSources", label: "Evidence & Sources", key: "evidenceSources" },
  { id: "metadata", label: "Metadata", key: "metadata" },
];

function sectionPresent(sections, key) {
  const s = sections?.[key];
  if (!s) return false;
  if (key === "cover") return Boolean(s.title || s.politicianName);
  if (key === "executiveSummary") return Boolean(s.paragraphs?.length);
  if (key === "politicalProfile") {
    return Boolean(s.fields?.length || s.socialAccounts?.length || s.profileConfidence != null);
  }
  if (key === "careerTimeline") return Boolean(s.events?.length);
  if (key === "electionHistory") return Boolean(s.rows?.length);
  if (key === "influenceIntelligence") {
    return Boolean(s.metrics?.length || s.explanation);
  }
  if (key === "geographicInfluence") {
    return Boolean(
      s.states?.length ||
        s.primaryRegion ||
        s.secondaryRegions?.length ||
        s.emergingRegions?.length
    );
  }
  if (key === "newsSentiment") {
    return Boolean(s.items?.length || s.sentiment);
  }
  if (key === "aiInsights") return Boolean(s.blocks?.length);
  if (key === "evidenceSources") {
    if (Array.isArray(s.items) && s.items.length > 0) return true;
    if (Array.isArray(s.groups)) return s.groups.length > 0;
    if (s.groups && typeof s.groups === "object") return Object.keys(s.groups).length > 0;
    return false;
  }
  if (key === "metadata") return Boolean(Object.keys(s).length);
  return true;
}

function ProgressBar({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function CircularScore({ value, label }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[72px] h-[72px]">
        <svg width="72" height="72" className="absolute inset-0 -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="6"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
          {v}
        </div>
      </div>
      <span className="text-[10px] text-slate-500 text-center max-w-[5.5rem] leading-tight">
        {label}
      </span>
    </div>
  );
}

function CollapsibleSection({ id, title, open, onToggle, children }) {
  return (
    <section
      id={`dossier-${id}`}
      className="scroll-mt-24 border-b border-slate-200/80 last:border-0 print:break-inside-avoid"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 py-4 text-left group print:pointer-events-none"
      >
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 group-hover:text-indigo-700">
          {title}
        </h2>
        <span className="text-slate-400 print:hidden">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && <div className="pb-6 space-y-4">{children}</div>}
    </section>
  );
}

function EvidenceList({ section }) {
  const items = Array.isArray(section.items)
    ? section.items
    : Array.isArray(section.groups)
      ? section.groups.flatMap((g) => g.sources || [])
      : section.groups && typeof section.groups === "object"
        ? Object.values(section.groups).flat()
        : [];

  return (
    <ul className="space-y-4">
      {items.map((src, i) => (
        <li key={i} className="border-b border-slate-100 pb-3 last:border-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {src.name || src.label || "Source"}
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex ml-1.5 text-indigo-600 print:hidden align-middle"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {src.description && (
                <p className="text-sm text-slate-600 mt-0.5">{src.description}</p>
              )}
            </div>
            <div className="text-[11px] text-slate-500 text-right shrink-0">
              {src.confidenceLabel && (
                <div className="font-semibold text-slate-700">{src.confidenceLabel}</div>
              )}
              {src.lastUpdated && (
                <div>Updated: {formatIndianDate(src.lastUpdated)}</div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Live preview of the assembled Political Intelligence dossier (matches PDF/MD structure).
 */
export default function ReportDossierPreview({
  dossier,
  showPrintButton = true,
  className = "",
}) {
  const sections = dossier?.sections || {};
  const available = useMemo(
    () => SECTION_DEFS.filter((d) => sectionPresent(sections, d.key)),
    [sections]
  );

  const [openMap, setOpenMap] = useState(() =>
    Object.fromEntries(SECTION_DEFS.map((d) => [d.id, true]))
  );

  if (!dossier?.sections) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-6 text-sm text-amber-200/90">
        Intelligence dossier is being prepared. Refresh in a moment, or export PDF once generation completes.
      </div>
    );
  }

  const cover = sections.cover || {};
  const geo = sections.geographicInfluence;
  const mapData = (geo?.states || []).map((s) => ({
    state: s.state,
    influenceScore: s.influence,
    confidence: s.confidence,
    tier: s.tier,
    evidence: [],
  }));
  const coverHeadline = cover.politicianName || cover.title;

  const scrollTo = (id) => {
    document.getElementById(`dossier-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={`lg:grid lg:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start ${className}`}>
      <nav className="hidden lg:block sticky top-20 space-y-1 print:hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 px-2">
          Contents
        </p>
        {available.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollTo(s.id)}
            className="block w-full text-left text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition"
          >
            {s.label}
          </button>
        ))}
        {showPrintButton && (
          <button
            type="button"
            onClick={() => window.print()}
            className="mt-4 w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] text-xs font-semibold text-slate-300 hover:bg-white/[0.04]"
          >
            <Printer size={13} /> Print Preview
          </button>
        )}
      </nav>

      {/* Document surface — light paper for dossier feel */}
      <article
        className="dossier-print-root bg-[#f8f7f4] text-slate-900 rounded-2xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden print:shadow-none print:border-0 print:rounded-none"
      >
        {/* Cover */}
        {sectionPresent(sections, "cover") && (
          <header
            id="dossier-cover"
            className="relative px-6 sm:px-10 pt-10 pb-8 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-white print:break-after-page"
          >
            <div className="mb-8">
              <div className="text-xs font-extrabold tracking-[0.25em] uppercase text-indigo-300">
                {cover.brand || "Social IQ"}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {cover.photo && (
                <img
                  src={cover.photo}
                  alt={coverHeadline || "Portrait"}
                  className="w-28 h-28 rounded-xl object-cover border border-white/20 shadow-lg shrink-0"
                />
              )}
              <div className="min-w-0 space-y-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  {coverHeadline}
                </h1>
                <p className="text-sm sm:text-base font-medium text-indigo-100/90">
                  {cover.documentType || "Political Intelligence Report"}
                </p>
                {cover.reportTypeLabel && (
                  <span className="inline-flex text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-white/10 text-indigo-200 border border-white/10">
                    {cover.reportTypeLabel}
                  </span>
                )}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-300">
                  {cover.currentPosition && (
                    <>
                      <dt className="text-slate-500">Position</dt>
                      <dd>{cover.currentPosition}</dd>
                    </>
                  )}
                  {cover.party && (
                    <>
                      <dt className="text-slate-500">Party</dt>
                      <dd>{cover.party}</dd>
                    </>
                  )}
                  {cover.state && (
                    <>
                      <dt className="text-slate-500">State</dt>
                      <dd className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {cover.state}
                      </dd>
                    </>
                  )}
                  {cover.confidence != null && (
                    <>
                      <dt className="text-slate-500">Confidence</dt>
                      <dd>{cover.confidence}%</dd>
                    </>
                  )}
                  {cover.generatedAt && (
                    <>
                      <dt className="text-slate-500">Generated</dt>
                      <dd>{formatIndianDate(cover.generatedAt)}</dd>
                    </>
                  )}
                  {cover.reportVersion && (
                    <>
                      <dt className="text-slate-500">Report Version</dt>
                      <dd>{cover.reportVersion}</dd>
                    </>
                  )}
                  {cover.generatedBy && (
                    <>
                      <dt className="text-slate-500">Generated By</dt>
                      <dd>{cover.generatedBy}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>
          </header>
        )}

        <div className="px-6 sm:px-10 py-2">
          {available
            .filter((s) => s.id !== "cover")
            .map((s) => (
              <CollapsibleSection
                key={s.id}
                id={s.id}
                title={
                  s.id === "executiveSummary"
                    ? sections.executiveSummary?.label || "Summary"
                    : s.label
                }
                open={openMap[s.id] !== false}
                onToggle={() =>
                  setOpenMap((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                }
              >
                {s.id === "executiveSummary" &&
                  sections.executiveSummary.paragraphs.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-slate-700">
                      {p}
                    </p>
                  ))}

                {s.id === "politicalProfile" && (
                  <>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      {(sections.politicalProfile.fields || []).map((f) => (
                        <div key={f.label} className="contents">
                          <dt className="text-slate-500">{safeText(f.label)}</dt>
                          <dd className="font-medium text-slate-900 break-words">{safeText(f.value)}</dd>
                        </div>
                      ))}
                      {sections.politicalProfile.profileConfidence != null && (
                        <div className="contents">
                          <dt className="text-slate-500">Profile Confidence</dt>
                          <dd className="font-medium">{sections.politicalProfile.profileConfidence}%</dd>
                        </div>
                      )}
                    </dl>
                    {sections.politicalProfile.socialAccounts?.length > 0 && (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                          Social Accounts
                        </h3>
                        <ul className="space-y-1 text-sm">
                          {sections.politicalProfile.socialAccounts.map((a) => (
                            <li key={a.platform}>
                              <span className="text-slate-500">{a.platform}: </span>
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-700 hover:underline break-all"
                              >
                                {a.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {s.id === "careerTimeline" && (
                  <ol className="relative border-l-2 border-indigo-200 ml-2 space-y-5">
                    {sections.careerTimeline.events.map((e, i) => {
                      const yearLabel = safeText(e.year) || "";
                      const desc = safeText(e.description);
                      const title = safeText(e.title);
                      const showDesc =
                        desc &&
                        desc.toLowerCase() !== title.toLowerCase() &&
                        !title.toLowerCase().includes(desc.toLowerCase());
                      return (
                        <li key={i} className="pl-5 relative">
                          <span className="absolute -left-[9px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 border-2 border-[#f8f7f4]" />
                          <div className="text-[11px] font-bold text-indigo-700 tracking-wide">
                            {yearLabel || "—"}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{title}</div>
                          {showDesc && (
                            <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{desc}</p>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}

                {s.id === "electionHistory" && (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-xs text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="border-b-2 border-slate-300 text-[10px] uppercase tracking-wider text-slate-500">
                          {[
                            "Election",
                            "Constituency",
                            "Party",
                            "Result",
                            "Votes",
                            "Vote %",
                            "Margin",
                            "Opponent",
                            "Source",
                          ].map((h) => (
                            <th key={h} className="py-2 pr-3 font-bold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sections.electionHistory.rows.map((r, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium">{safeText(r.election)}</td>
                            <td className="py-2 pr-3">{safeText(r.constituency)}</td>
                            <td className="py-2 pr-3">{safeText(r.party)}</td>
                            <td className="py-2 pr-3">{safeText(r.result)}</td>
                            <td className="py-2 pr-3 tabular-nums">
                              {r.votes != null && typeof r.votes !== "object"
                                ? Number(r.votes).toLocaleString()
                                : safeText(r.votes)}
                            </td>
                            <td className="py-2 pr-3 tabular-nums">{safeText(r.votePct)}</td>
                            <td className="py-2 pr-3 tabular-nums">{safeText(r.margin)}</td>
                            <td className="py-2 pr-3">{safeText(r.opponent)}</td>
                            <td className="py-2 pr-3 text-slate-500">{safeText(r.source)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {s.id === "influenceIntelligence" && (
                  <>
                    <div className="flex flex-wrap gap-6 justify-start mb-4 relative">
                      {(sections.influenceIntelligence.metrics || [])
                        .filter((m) => m.key === "overall" || m.label?.includes("Overall"))
                        .slice(0, 1)
                        .map((m) => (
                          <div key={m.key} className="relative flex items-center justify-center">
                            <CircularScore value={m.value} label={m.label} />
                          </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                      {(sections.influenceIntelligence.metrics || []).map((m) => (
                        <div key={m.key || m.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-800">{m.label}</span>
                            <span className="tabular-nums text-slate-600">{m.value}</span>
                          </div>
                          <ProgressBar value={m.value} />
                          {m.explanation && (
                            <p className="text-[11px] text-slate-500 mt-1">{m.explanation}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {sections.influenceIntelligence.explanation && (
                      <p className="text-sm text-slate-600">
                        {sections.influenceIntelligence.explanation}
                      </p>
                    )}
                    {sections.influenceIntelligence.calculatedAt && (
                      <p className="text-[11px] text-slate-400">
                        Calculated {formatIndianDateTime(sections.influenceIntelligence.calculatedAt)}
                      </p>
                    )}
                  </>
                )}

                {s.id === "geographicInfluence" && (
                  <>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                      {geo.primaryRegion && (
                        <>
                          <dt className="text-slate-500">Primary Region</dt>
                          <dd className="font-medium">{geo.primaryRegion}</dd>
                        </>
                      )}
                      {geo.secondaryRegions?.length > 0 && (
                        <>
                          <dt className="text-slate-500">Secondary Regions</dt>
                          <dd>{safeText(geo.secondaryRegions)}</dd>
                        </>
                      )}
                      {geo.emergingRegions?.length > 0 && (
                        <>
                          <dt className="text-slate-500">Emerging Regions</dt>
                          <dd>{safeText(geo.emergingRegions)}</dd>
                        </>
                      )}
                      {geo.verifiedCoverage != null && (
                        <>
                          <dt className="text-slate-500">Verified Coverage</dt>
                          <dd>{geo.verifiedCoverage}</dd>
                        </>
                      )}
                    </dl>
                    {mapData.length > 0 && (
                      <div className="print:hidden mb-4">
                        <IndiaMap
                          data={mapData}
                          activeState={geo.primaryRegion || ""}
                          geographicMeta={{
                            regionalSummary: {
                              primaryRegion: geo.primaryRegion,
                              secondaryRegions: geo.secondaryRegions,
                              emergingRegions: geo.emergingRegions,
                              verifiedCoverage: geo.verifiedCoverage,
                            },
                          }}
                        />
                      </div>
                    )}
                    {(geo.influenceTiers?.length > 0 ||
                      geo.states?.some((r) => r.tier)) && (
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                          Influence Tier
                        </h3>
                        <ul className="space-y-1.5 text-sm">
                          {(geo.influenceTiers?.length
                            ? geo.influenceTiers
                            : geo.states.filter((r) => r.tier)
                          ).map((row) => (
                            <li
                              key={`${row.state}-${row.tier}`}
                              className="flex justify-between gap-3 border-b border-slate-100 pb-1.5"
                            >
                              <span className="font-medium text-slate-800">
                                {safeText(row.state)}
                              </span>
                              <span className="text-slate-600 capitalize shrink-0">
                                {safeText(row.tier)}
                                {row.influence != null ? ` · ${safeText(row.influence)}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {s.id === "newsSentiment" && (
                  <>
                    {sections.newsSentiment.sentiment && (
                      <div className="flex flex-wrap gap-3 text-xs mb-3">
                        {["positive", "neutral", "negative"].map((k) =>
                          sections.newsSentiment.sentiment[k] != null ? (
                            <span
                              key={k}
                              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 capitalize"
                            >
                              {k}: {sections.newsSentiment.sentiment[k]}
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                    <ul className="space-y-4">
                      {(sections.newsSentiment.items || []).map((n, i) => (
                        <li key={i} className="border-b border-slate-100 pb-3">
                          <div className="text-sm font-semibold">
                            {n.url ? (
                              <a
                                href={n.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-900 no-underline hover:text-indigo-700 hover:underline underline-offset-2 transition-colors print:text-blue-700 print:underline"
                              >
                                {safeText(n.headline)}
                              </a>
                            ) : (
                              <>
                                <span className="text-slate-900">{safeText(n.headline)}</span>
                                <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                                  Verified article unavailable
                                </p>
                              </>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {[n.source, n.date || n.publishedAt, n.sentiment, n.importance != null ? `Importance ${safeText(n.importance)}` : null]
                              .map(safeText)
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          {n.summary && (
                            <p className="text-sm text-slate-600 mt-1">{safeText(n.summary)}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {s.id === "aiInsights" &&
                  sections.aiInsights.blocks.map((b, i) => (
                    <div key={i}>
                      <h3 className="text-sm font-bold text-slate-900 mb-1">{safeText(b.title)}</h3>
                      {b.body && (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {safeText(b.body)}
                        </p>
                      )}
                      {b.items?.length > 0 && (
                        <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                          {b.items.map((item, j) => (
                            <li key={j}>{safeText(item)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}

                {s.id === "evidenceSources" && (
                  <EvidenceList section={sections.evidenceSources} />
                )}

                {s.id === "metadata" && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {[
                      ["Generated", sections.metadata.generated],
                      ["Updated", sections.metadata.updated],
                      ["Engine Version", sections.metadata.engineVersion],
                      ["Analysis Version", sections.metadata.analysisVersion],
                      ["Report Version", sections.metadata.reportVersion],
                      ["Template Version", sections.metadata.templateVersion],
                      ["Confidence", sections.metadata.confidence],
                      [
                        "Modules Included",
                        Array.isArray(sections.metadata.modulesIncluded)
                          ? sections.metadata.modulesIncluded.join(", ")
                          : sections.metadata.modulesIncluded,
                      ],
                      ["Report Size", sections.metadata.reportSize],
                      ["Generated By", sections.metadata.generatedBy],
                    ]
                      .filter(([, v]) => v != null && v !== "")
                      .map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="font-medium text-slate-800 break-words">
                            {label === "Generated" || label === "Updated"
                              ? formatIndianDateTime(value)
                              : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </CollapsibleSection>
            ))}
        </div>

        <footer className="px-6 sm:px-10 py-4 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between print:fixed print:bottom-0 print:left-0 print:right-0">
          <span>Social IQ · Confidential Intelligence</span>
          <span>
            Template v{dossier.templateVersion ?? "—"}
            {dossier.assembledAt
              ? ` · Assembled ${formatIndianDate(dossier.assembledAt)}`
              : ""}
          </span>
        </footer>
      </article>
    </div>
  );
}
