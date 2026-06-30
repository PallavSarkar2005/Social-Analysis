import React from "react";
import { motion } from "framer-motion";
import LeaderAvatar from "./LeaderAvatar";

const THEME_MAP = {
  topPerformer: {
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    border: "border-amber-500/20 hover:border-amber-500/40",
    text: "text-amber-400",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  fastestGrowing: {
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    text: "text-emerald-400",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  mostViewed: {
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
    border: "border-blue-500/20 hover:border-blue-500/40",
    text: "text-blue-400",
    glow: "rgba(59, 130, 246, 0.15)",
  },
  mostEngaged: {
    gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
    border: "border-violet-500/20 hover:border-violet-500/40",
    text: "text-violet-400",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  highestSubGain: {
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent",
    border: "border-orange-500/20 hover:border-orange-500/40",
    text: "text-orange-400",
    glow: "rgba(249, 115, 22, 0.15)",
  },
  highestViewGain: {
    gradient: "from-indigo-500/10 via-indigo-500/5 to-transparent",
    border: "border-indigo-500/20 hover:border-indigo-500/40",
    text: "text-indigo-400",
    glow: "rgba(99, 102, 241, 0.15)",
  },
  recentlySynced: {
    gradient: "from-teal-500/10 via-teal-500/5 to-transparent",
    border: "border-teal-500/20 hover:border-teal-500/40",
    text: "text-teal-400",
    glow: "rgba(20, 184, 166, 0.15)",
  },
  default: {
    gradient: "from-white/[0.02] to-transparent",
    border: "border-white/[0.06] hover:border-white/[0.12]",
    text: "text-slate-200",
    glow: "rgba(255, 255, 255, 0.02)",
  },
};

/**
 * StatCard component
 * Renders statistic cards with highly-differentiated visual identities, contrast ratios, and glow effects.
 */
export default function StatCard({ label, value, sub, icon: Icon, type = "topPerformer", creator }) {
  const cardTheme = THEME_MAP[type] || THEME_MAP.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={`relative bg-[#0d0e14]/90 border ${cardTheme.border} rounded-2xl p-5 space-y-2 overflow-hidden shadow-xl group transition-all backdrop-blur-sm`}
    >
      {/* Dynamic Glow blob */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
        style={{ background: `radial-gradient(circle at 30% 50%, ${cardTheme.glow}, transparent 70%)` }}
      />
      
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cardTheme.gradient} opacity-20 -z-20`} />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          {/* Subtle colored dot for visual keying */}
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${cardTheme.text}`} />
          {label}
        </span>
        {creator ? (
          <LeaderAvatar creator={creator} size={28} className="border border-white/[0.08]" />
        ) : (
          Icon && <Icon size={14} className={cardTheme.text} />
        )}
      </div>
      
      <p className="text-lg sm:text-xl font-bold tracking-tight leading-none text-white truncate">
        {value}
      </p>
      
      {sub != null && (
        <p className="text-[10.5px] font-medium text-slate-500 mt-1 select-none">
          {sub}
        </p>
      )}
    </motion.div>
  );
}
