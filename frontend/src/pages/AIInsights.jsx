import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getAccounts } from "../api/accountApi";
import { getChannelSummary, getTopContent } from "../api/analyticsApi";
import { getChannelInsights } from "../api/aiChannelApi";
import { Sparkles, Brain, Cpu, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AIInsights() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [summary, setSummary] = useState(null);
  const [topContent, setTopContent] = useState([]);
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await getAccounts();
        const filtered = (response.data || []).filter(a => a.platform === "youtube");
        setAccounts(filtered);
        if (filtered.length > 0) {
          setSelectedAccountId(filtered[0]._id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load accounts.");
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchChannelDetails = async () => {
      try {
        setLoading(true);
        setError("");
        setInsights(""); // Reset insights when changing channels
        
        const [sumRes, contentRes] = await Promise.all([
          getChannelSummary(selectedAccountId),
          getTopContent(selectedAccountId)
        ]);

        setSummary(sumRes.data);
        setTopContent(contentRes.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load channel details.");
      } finally {
        setLoading(false);
      }
    };

    fetchChannelDetails();
  }, [selectedAccountId]);

  const handleGenerateChannelInsights = async () => {
    const active = accounts.find((a) => a._id === selectedAccountId);
    if (!active || !summary) return;

    try {
      setGenerating(true);
      setError("");
      
      const recentTitles = topContent.slice(0, 5).map(v => v.title || "Untitled Video");

      const response = await getChannelInsights({
        title: active.name,
        subscribers: summary.followers,
        totalViews: summary.totalViews,
        videoCount: summary.videosTracked,
        recentTitles
      });

      setInsights(response.insights);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "AI generation failed. Please verify Groq API key is valid in your .env configuration.";
      setError(`Error: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  const activeAccount = accounts.find((a) => a._id === selectedAccountId);

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                <Brain className="text-purple-400 animate-pulse" size={28} />
                AI Strategy Insights
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Deploy cognitive algorithms to formulate channel strategy audits and content trajectory optimizations.
              </p>
            </div>

            {accounts.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Node:</span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                >
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id} className="bg-[#111319] text-white">
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="text-center py-20 bg-[#121318]/30 rounded-2xl border border-white/[0.06] border-dashed space-y-3">
              <p className="text-sm font-semibold text-slate-400">No YouTube channels indexed.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Head over to the Accounts panel to register active YouTube channels before triggering deep cognitive audits.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-6">
              <div className="h-40 w-full bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse" />
              <div className="h-64 w-full bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Channel Stats Overview */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                    <Cpu size={14} />
                    Node Telemetry Metadata
                  </div>
                  {summary && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-slate-500">Subscribers</span>
                        <span className="text-white font-semibold">{Number(summary.followers).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-slate-500">Total Views</span>
                        <span className="text-white font-semibold">{Number(summary.totalViews).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-slate-500">Videos Indexed</span>
                        <span className="text-white font-semibold">{summary.videosTracked}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                        <span className="text-slate-500">Avg Engagement</span>
                        <span className="text-indigo-400 font-bold">{summary.avgEngagement}%</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateChannelInsights}
                    disabled={generating || !summary}
                    className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-semibold rounded-xl transition shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0112-7.32V4a10 10 0 00-10 10h2z" />
                        </svg>
                        Auditing Trajectory...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Run AI Diagnostic
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Strategy Results */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-xl min-h-[300px] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/[0.06] pb-4">
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <ShieldCheck size={16} className="text-purple-400" />
                        Audit Output
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">llama-3.3-70b-versatile active</span>
                    </div>

                    <AnimatePresence mode="wait">
                      {insights ? (
                        <motion.div
                          key="insights"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-xs sm:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap font-sans bg-white/[0.01] p-5 border border-white/[0.04] rounded-xl"
                        >
                          {insights}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-16 text-center space-y-2"
                        >
                          <p className="text-xs font-semibold text-slate-400">Tactical dashboard idle.</p>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            Click "Run AI Diagnostic" to fetch video catalogs and construct standard channel growth reports.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
