import { Bell, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="h-20 w-full bg-[#111319] border-b border-white/[0.08] flex items-center justify-between px-4 sm:px-6 lg:px-8 relative z-50 shadow-lg shadow-black/50 select-none"
    >
      {/* Left Section: High-Contrast Contextual Title */}
      <div className="min-w-0 py-2">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
          Social Analytics Node
        </h1>
        <p className="hidden sm:block text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
          Real-time cross-platform analytics engine
        </p>
      </div>

      {/* Right Section: System Metrics & Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Premium AI Status Badge - Enhanced Visibility */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wide"
        >
          <Sparkles size={13} className="animate-pulse text-indigo-400" />
          <span className="hidden xs:inline">AI Engine Active</span>
          <span className="xs:hidden">AI</span>
        </motion.div>

        {/* System Version Pin */}
        <div className="hidden md:block px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 font-mono text-[11px]">
          v1.0.4_core
        </div>

        {/* Notification Bell with Drop Shadow and High Contrast */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors group focus:outline-none shadow-sm"
        >
          <Bell
            size={18}
            className="group-hover:rotate-12 transition-transform"
          />
          {/* Active Ping Indicator */}
          <span className="absolute top-2 right-2 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </motion.button>

        {/* Separator Line */}
        <div className="h-6 w-[1px] bg-white/[0.12] hidden sm:block" />

        {/* Premium User Profile Block */}
        <motion.div
          whileHover={{ x: 1 }}
          className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] p-1.5 pr-3 rounded-xl cursor-pointer"
        >
          {/* Avatar with Strong Layering */}
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-indigo-600/30">
            P
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 blur-[4px] opacity-40 -z-10" />
          </div>

          {/* User Data Metas */}
          <div className="hidden sm:block text-left max-w-[100px]">
            <p className="font-semibold text-xs text-slate-100 leading-none truncate">
              Pallav
            </p>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1 leading-none">
              Developer
            </p>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
