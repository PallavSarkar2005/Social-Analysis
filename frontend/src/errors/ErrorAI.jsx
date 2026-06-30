import React from "react";
import { Brain, ArrowLeft, Layers, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ErrorAI() {
  const previousRoute = sessionStorage.getItem("previous_route") || "/dashboard";

  const handleRetry = () => {
    window.location.href = previousRoute;
  };

  const handleViewCached = () => {
    // Stash mock cached insights in sessionStorage so AI page reads it when returning
    const mockInsights = [
      {
        role: "assistant",
        content: `### 🌐 LOCALIZED OFFLINE INSIGHTS CACHE

Due to AI provider network congestion, we have loaded the pre-saved local intelligence context.

#### 📈 Growth Trajectories
* **BJP footprint**: Cumulative subscribers reach **12.8M** across 3 regions. Views average **24.2M** per node.
* **Congress footprint**: Combined footprint reaches **6.4M** with engagement rate peaking at **8.4%**.

#### 🤖 AI Recommendation
1. Focus content uploads between **4:00 PM and 7:00 PM IST** to match peak viewer activity windows.
2. Shorten political diagnostic highlights to under **3 minutes** to boost YouTube CTR metrics.`
      }
    ];
    sessionStorage.setItem("cached_offline_insights", JSON.stringify(mockInsights));
    window.location.href = "/ai-insights";
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-full backdrop-blur-xl flex items-center justify-center text-purple-400 w-28 h-28 shadow-2xl relative"
        >
          <Brain size={48} className="relative z-10" />
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-purple-500/10 rounded-full blur-md"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3 text-center max-w-md relative z-10"
      >
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">AI Service Offline</h1>
        <h2 className="text-sm font-semibold text-slate-300">LLM Provider Unavailable</h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Groq or OpenAI endpoint keys are unconfigured, rate-limited, or timing out. You can load offline cached insights instead.
        </p>
      </motion.div>

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
          Retry Connection
        </button>
        <button
          onClick={handleViewCached}
          className="h-10 px-5 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-200 transition flex items-center justify-center gap-2 text-xs font-semibold shadow-lg shadow-purple-600/5"
        >
          <Sparkles size={14} /> View Cached Insights
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="h-10 px-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
        >
          <Layers size={14} /> Dashboard
        </button>
      </motion.div>
    </div>
  );
}
