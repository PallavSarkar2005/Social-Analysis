import { Search } from "lucide-react";
import { motion } from "framer-motion";

export default function ChannelSearch({ url, setUrl, onAnalyze, loading }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-transparent space-y-4"
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Analyze Social Nodes</h2>
        <p className="text-xs text-slate-400 mt-1">
          Paste any YouTube video/channel or X (Twitter) profile URL below to index statistics and run AI diagnostics.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube channel/video or X profile link (e.g. https://x.com/nasa)..."
            className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-semibold text-white rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0112-7.32V4a10 10 0 00-10 10h2z" />
              </svg>
              Indexing...
            </>
          ) : (
            <>
              <Search size={14} />
              Run Audit
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
