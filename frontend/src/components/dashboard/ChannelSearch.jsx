import { Search } from "lucide-react";
import { motion } from "framer-motion";

export default function ChannelSearch({ url, setUrl, onAnalyze, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-8 shadow-lg"
    >
      <h2 className="text-3xl font-bold mb-6">Analyze Any YouTube Channel</h2>

      <div className="flex gap-4">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube Channel URL..."
          className="flex-1 border p-4 rounded-2xl"
        />

        <button
          onClick={onAnalyze}
          className="bg-black text-white px-6 rounded-2xl flex items-center gap-2"
        >
          <Search size={18} />
          {loading ? "Loading..." : "Analyze"}
        </button>
      </div>
    </motion.div>
  );
}
