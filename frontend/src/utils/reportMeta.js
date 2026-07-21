import {
  Sparkles,
  Grid,
  FileText,
  UserRound,
  Vote,
  Clock3,
  Newspaper,
  Radio,
  Activity,
  Camera,
  Wrench,
  Layers,
} from "lucide-react";

export const REPORT_TYPE_META = {
  political_profile: {
    label: "Political Profile",
    Icon: UserRound,
    accent: "text-sky-400",
    chip: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  },
  ai_insight: {
    label: "AI Strategy",
    Icon: Sparkles,
    accent: "text-violet-400",
    chip: "bg-violet-500/10 border-violet-500/20 text-violet-300",
  },
  comparison: {
    label: "Competitor Comparison",
    Icon: Grid,
    accent: "text-indigo-400",
    chip: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
  },
  election: {
    label: "Election Intelligence",
    Icon: Vote,
    accent: "text-amber-400",
    chip: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  },
  timeline: {
    label: "Timeline Report",
    Icon: Clock3,
    accent: "text-cyan-400",
    chip: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300",
  },
  news_sentiment: {
    label: "News & Sentiment",
    Icon: Newspaper,
    accent: "text-rose-400",
    chip: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  },
  influence: {
    label: "Influence Intelligence",
    Icon: Radio,
    accent: "text-emerald-400",
    chip: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  },
  telemetry: {
    label: "Telemetry Report",
    Icon: Activity,
    accent: "text-teal-400",
    chip: "bg-teal-500/10 border-teal-500/20 text-teal-300",
  },
  snapshot: {
    label: "Snapshot",
    Icon: Camera,
    accent: "text-slate-300",
    chip: "bg-slate-500/10 border-slate-500/20 text-slate-300",
  },
  analysis: {
    label: "Analysis",
    Icon: FileText,
    accent: "text-blue-400",
    chip: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  },
  competitor_report: {
    label: "Competitor Report",
    Icon: Layers,
    accent: "text-indigo-300",
    chip: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
  },
  custom: {
    label: "Custom Report",
    Icon: Wrench,
    accent: "text-orange-400",
    chip: "bg-orange-500/10 border-orange-500/20 text-orange-300",
  },
};

export const HUB_FILTERS = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "pinned", label: "Pinned" },
  { id: "recent", label: "Recent" },
];

export const HUB_SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "recently_viewed", label: "Recently Viewed" },
  { id: "alphabetical", label: "Alphabetical" },
  { id: "confidence", label: "Confidence" },
  { id: "most_opened", label: "Most Opened" },
  { id: "favorites", label: "Favorites" },
  { id: "pinned_first", label: "Pinned First" },
];

export const MODULE_ICON_MAP = {
  ai: Sparkles,
  ai_insight: Sparkles,
  profile: UserRound,
  political_profile: UserRound,
  comparison: Grid,
  election: Vote,
  elections: Vote,
  timeline: Clock3,
  news: Newspaper,
  news_sentiment: Newspaper,
  sentiment: Newspaper,
  influence: Radio,
  geographic: Radio,
  telemetry: Activity,
  snapshot: Camera,
};

export function getReportTypeMeta(type) {
  return REPORT_TYPE_META[type] || REPORT_TYPE_META.custom;
}

export function getPoliticianLabel(report) {
  return (
    report?.metadata?.politicianName ||
    report?.metadata?.politician ||
    report?.metadata?.profileName ||
    report?.dossier?.sections?.cover?.politicianName ||
    report?.source ||
    "Unknown source"
  );
}

/** Display title without legacy " — Political Profile" style suffixes. */
export function getReportDisplayTitle(report) {
  const fromMeta =
    report?.metadata?.politicianName ||
    report?.dossier?.sections?.cover?.politicianName ||
    report?.dossier?.sections?.cover?.title;
  if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();

  const raw = String(report?.title || "").trim();
  if (!raw) return "Untitled report";
  return raw
    .replace(
      /\s*[—–\-]\s*(Political Profile|Election Intelligence|Influence Intelligence|News & Sentiment|Timeline Report|Political Intelligence Report)\s*$/i,
      ""
    )
    .trim();
}

export function getConfidenceLabel(confidence) {
  if (confidence == null || Number.isNaN(Number(confidence))) return null;
  return Math.round(Number(confidence));
}
