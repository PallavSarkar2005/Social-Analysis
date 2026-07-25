import { AlertCircle, BarChart3 } from "lucide-react";

/**
 * Shown when a graph cannot be rendered from verified historical data.
 * Never invent placeholder chart values instead of this component.
 */
export default function InsufficientData({
  title = "Insufficient verified data",
  reason = "No verified historical data available yet.",
  metric = null,
  className = "",
  minHeight = 220,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-8 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] ${className}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/[0.06] flex items-center justify-center mb-3">
        <BarChart3 size={18} className="text-slate-500" />
      </div>
      <p className="text-sm font-semibold text-slate-200 tracking-tight">{title}</p>
      {metric && (
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">
          {metric}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed flex items-start gap-1.5 justify-center">
        <AlertCircle size={14} className="text-amber-500/80 shrink-0 mt-0.5" />
        <span>{reason}</span>
      </p>
    </div>
  );
}
