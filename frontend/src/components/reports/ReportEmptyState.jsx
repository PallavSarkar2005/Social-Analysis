import { Link } from "react-router-dom";
import { Database, UserRound, Grid, Sparkles } from "lucide-react";

const CTAS = [
  {
    to: "/analyzer",
    label: "Analyze a Profile",
    desc: "Run a channel or leader analysis",
    Icon: UserRound,
  },
  {
    to: "/compare",
    label: "Compare Creators",
    desc: "Save a side-by-side comparison",
    Icon: Grid,
  },
  {
    to: "/ai-insights",
    label: "Generate AI Strategy",
    desc: "Archive an AI strategy brief",
    Icon: Sparkles,
  },
];

export default function ReportEmptyState({ filtered = false, onClearFilters }) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/[0.06] bg-[#121318]/30 text-center px-6 py-16">
        <Database className="w-12 h-12 text-slate-600" />
        <div>
          <h4 className="text-sm font-semibold text-slate-200">No reports matched</h4>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
            Try another filter, sort, or search term. Your Intelligence Hub stays scoped to what you ask for.
          </p>
        </div>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-9 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white hover:bg-white/[0.08] transition"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#14161e] to-[#0e1016] px-6 py-14 text-center">
      <Database className="w-12 h-12 text-indigo-400/70 mx-auto mb-4" />
      <h3 className="text-lg font-bold text-white tracking-tight">No saved reports yet</h3>
      <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
        Reports are automatically created whenever you generate analyses. Start from a profile, comparison, or AI strategy — they land here as your searchable knowledge base.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
        {CTAS.map(({ to, label, desc, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left hover:border-indigo-500/40 hover:bg-indigo-500/[0.06] transition"
          >
            <Icon size={18} className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">{label}</div>
            <div className="text-[11px] text-slate-500 mt-1 leading-snug">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
