import React from "react";

/**
 * MetricItem component
 * Renders individual metrics in a aligned layout.
 * Metric Label is smaller with a secondary color.
 * Metric Value is large and semi-bold.
 */
export default function MetricItem({ label, value, className = "" }) {
  return (
    <div className={`space-y-1 text-center sm:text-left min-w-0 ${className}`}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block truncate select-none">
        {label}
      </span>
      <span className="text-xs sm:text-sm font-semibold text-slate-200 block truncate">
        {value}
      </span>
    </div>
  );
}
