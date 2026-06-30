import React from "react";
import { ServerCrash, RefreshCw, ArrowLeft, Layers, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function Error500() {
  const previousRoute = sessionStorage.getItem("previous_route") || "/dashboard";
  const errorInfoStr = sessionStorage.getItem("latest_error_telemetry");
  let telemetry = {};
  try {
    if (errorInfoStr) {
      telemetry = JSON.parse(errorInfoStr);
    }
  } catch (e) {}

  const requestId = telemetry.requestId || "req-sys-" + Math.random().toString(36).substring(2, 8);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Dynamic particles background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      {/* Floating broken server icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <motion.div
          animate={{
            skewX: [0, -4, 4, -2, 2, 0],
            y: [0, -5, 0]
          }}
          transition={{
            skewX: { repeat: Infinity, duration: 2, ease: "linear" },
            y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
          }}
          className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-full backdrop-blur-xl flex items-center justify-center text-rose-500 w-28 h-28 shadow-2xl relative"
        >
          <ServerCrash size={48} className="relative z-10" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2.2 }}
            className="absolute inset-0 bg-rose-500/10 rounded-full blur-md"
          />
        </motion.div>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 text-center max-w-md relative z-10"
      >
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">500</h1>
        <h2 className="text-lg font-bold text-slate-300">Internal Server Error</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          The Social IQ telemetry API encountered an unhandled exception. The engineering team has been notified.
        </p>

        <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-slate-500 font-mono">
          <ShieldAlert size={12} className="text-indigo-500" />
          <span>REQUEST ID:</span>
          <span className="text-indigo-400 font-bold select-all">{requestId}</span>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 mt-8 relative z-10 w-full max-w-xs sm:max-w-md justify-center"
      >
        <button
          onClick={handleRetry}
          className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-indigo-600/15"
        >
          <RefreshCw size={14} /> Retry Connection
        </button>
        <button
          onClick={() => (window.location.href = previousRoute)}
          className="h-10 px-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Go Back
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="h-10 px-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <Layers size={14} /> Dashboard
        </button>
      </motion.div>
    </div>
  );
}
