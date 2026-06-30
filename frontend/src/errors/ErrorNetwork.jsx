import React from "react";
import { WifiOff, RefreshCw, Layers, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function ErrorNetwork() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-slate-500/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mb-8"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-full backdrop-blur-xl flex items-center justify-center text-slate-400 w-28 h-28 shadow-2xl relative"
        >
          <WifiOff size={48} className="relative z-10" />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-white/[0.04] rounded-full blur-md"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 text-center max-w-md relative z-10"
      >
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Network Error</h1>
        <h2 className="text-lg font-bold text-slate-300">Server Connection Lost</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          The Social IQ database gateway is currently unreachable. Please check your internet connection or backend port configurations.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 mt-8 relative z-10 w-full max-w-xs sm:max-w-sm justify-center"
      >
        <button
          onClick={handleRetry}
          className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-indigo-600/15"
        >
          <RefreshCw size={14} className="animate-spin" /> Retry Connection
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="h-10 px-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <Layers size={14} /> Go to Dashboard
        </button>
      </motion.div>
    </div>
  );
}
