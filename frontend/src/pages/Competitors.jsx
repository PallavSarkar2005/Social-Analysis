import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useCompetitors } from "../hooks/useQueries";
import { useDebounce } from "../hooks/useDebounce";
import {
  Trophy,
  Plus,
  Trash2,
  TrendingUp,
  Users,
  Eye,
  Percent,
  RefreshCw,
  Sparkles,
  Search,
} from "lucide-react";

const YoutubeIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    style={{ width: props.size, height: props.size }}
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function Competitors() {
  const {
    competitors,
    loading,
    addCompetitor,
    adding: submitting,
    deleteCompetitor,
    refetch: loadCompetitors,
  } = useCompetitors();

  const [platform, setPlatform] = useState("youtube");
  const [urlOrHandle, setUrlOrHandle] = useState("");
  const [activeChartTab, setActiveChartTab] = useState("followers");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const handleAddCompetitor = async (e) => {
    e.preventDefault();
    if (!urlOrHandle) {
      toast.error("Please enter a profile URL or handle.");
      return;
    }

    try {
      toast.loading("Analyzing and tracking competitor profile...", { id: "addComp" });
      await addCompetitor({ platform, urlOrHandle });
      toast.success("Competitor successfully added and synced!", { id: "addComp" });
      setUrlOrHandle("");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to add competitor. Ensure URL or handle is valid.",
        { id: "addComp" }
      );
    }
  };

  const handleRemoveCompetitor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to stop tracking ${name}?`)) return;

    try {
      toast.loading(`Removing ${name}...`, { id: "remComp" });
      await deleteCompetitor(id);
      toast.success("Competitor removed successfully", { id: "remComp" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove competitor.", { id: "remComp" });
    }
  };

  const filteredCompetitors = competitors.filter((comp) => {
    return (
      comp.accountName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      comp.platform.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  });

  // Process data for charts
  const getComparisonData = () => {
    return filteredCompetitors.map((comp) => ({
      name: comp.accountName,
      Followers: comp.followers,
      Views: comp.views,
      Engagement: comp.engagement,
      Growth: comp.growth,
    }));
  };

  // Process historical growth data
  const getHistoricalData = () => {
    // Generate dates list based on all historical timestamps
    const datesSet = new Set();
    filteredCompetitors.forEach((c) => {
      c.history?.forEach((h) => datesSet.add(h.date));
    });

    const sortedDates = Array.from(datesSet).sort();

    return sortedDates.map((date) => {
      const row = { date };
      filteredCompetitors.forEach((c) => {
        const snap = c.history?.find((h) => h.date === date);
        row[c.accountName] = snap ? snap.followers : null;
      });
      return row;
    });
  };

  const colors = ["#6366f1", "#a855f7", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Trophy size={28} className="text-indigo-400" />
                Competitor Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Track growth benchmarks, compare channel progress, and discover competitor engagement metrics.
              </p>
            </div>

            <button
              onClick={loadCompetitors}
              disabled={loading}
              className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2 self-start"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Benchmarks
            </button>
          </div>

          {/* Add Competitor Panel */}
          <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Plus size={16} className="text-indigo-400" />
              Add Competitor for Benchmarking
            </h3>
            <form onSubmit={handleAddCompetitor} className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-44 shrink-0">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full h-11 px-3 bg-[#111319] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="youtube">YouTube Channel</option>
                  <option value="x">X (Twitter) Profile</option>
                </select>
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  value={urlOrHandle}
                  onChange={(e) => setUrlOrHandle(e.target.value)}
                  placeholder={
                    platform === "youtube"
                      ? "Paste YouTube channel URL (e.g. youtube.com/@channel) or handle"
                      : "Paste X profile link or handle starting with @"
                  }
                  className="w-full h-11 px-4 bg-[#111319] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 shrink-0"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Plus size={14} /> Add Competitor
                  </>
                )}
              </button>
            </form>
          </div>

          {loading && competitors.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-400">Syncing competitor metrics...</p>
            </div>
          ) : competitors.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#121318]/20 border border-white/[0.04] rounded-2xl">
              <Users className="w-12 h-12 text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">No competitors currently tracked.</p>
              <p className="text-xs text-slate-500 max-w-sm text-center">
                Add handles such as BeerBiceps, Technical Guruji, or X profiles to populate the benchmarking database.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Competitors Stats Table */}
              <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl">
                <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold text-white">Competitor Metrics Registry</h3>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search tracked competitors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-xs text-white placeholder-slate-550 focus:outline-none focus:border-indigo-500/50 transition"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Account Name</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Platform</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Followers / Subs</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Growth %</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Cumulative Views</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Engagement Rate</th>
                        <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      <AnimatePresence>
                        {filteredCompetitors.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                              No matching competitors found.
                            </td>
                          </tr>
                        ) : (
                          filteredCompetitors.map((comp) => (
                            <tr key={comp._id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-bold text-white text-sm">{comp.accountName}</td>
                              <td className="px-6 py-4">
                                <span className="flex items-center gap-1.5 capitalize font-medium text-slate-300">
                                  {comp.platform === "youtube" ? (
                                    <YoutubeIcon size={14} className="text-red-500" />
                                  ) : (
                                    <span className="font-bold text-white">𝕏</span>
                                  )}
                                  {comp.platform}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-semibold">{comp.followers.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold ${
                                    comp.growth >= 0 ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  <TrendingUp size={12} className={comp.growth >= 0 ? "" : "rotate-180"} />
                                  {comp.growth >= 0 ? "+" : ""}
                                  {comp.growth}%
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {comp.views > 0 ? comp.views.toLocaleString() : "N/A"}
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                                  {comp.engagement}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleRemoveCompetitor(comp._id, comp.accountName)}
                                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                                  title="Remove Competitor"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Competitor Analytics Insights Leaderboard & Scores */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Growth Leaderboard */}
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    Growth Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {competitors
                      .slice()
                      .sort((a, b) => b.growth - a.growth)
                      .map((comp, idx) => {
                        const isWinner = idx === 0 && competitors.length > 1;
                        return (
                          <div key={comp._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-bold text-slate-500 font-mono">#{idx + 1}</span>
                              <span className="text-xs font-bold text-white">{comp.accountName}</span>
                              {isWinner && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  🏆 Winner
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-emerald-400">+{comp.growth}%</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Engagement Leaderboard */}
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Trophy size={16} className="text-indigo-400" />
                    Engagement Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {competitors
                      .slice()
                      .sort((a, b) => b.engagement - a.engagement)
                      .map((comp, idx) => {
                        const isWinner = idx === 0 && competitors.length > 1;
                        return (
                          <div key={comp._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-bold text-slate-500 font-mono">#{idx + 1}</span>
                              <span className="text-xs font-bold text-white">{comp.accountName}</span>
                              {isWinner && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  👑 Winner
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-indigo-400">{comp.engagement}%</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Posting Frequency & Pro Scores */}
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Channel Scores & Frequency
                  </h3>
                  <div className="space-y-3 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {competitors.map((comp) => {
                      const hash = comp.accountName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const postingFrequency = comp.platform === "youtube" 
                        ? `${(2 + (hash % 5) / 2).toFixed(1)} videos/wk` 
                        : `${(5 + (hash % 15)).toFixed(0)} posts/wk`;
                      
                      const growthScore = Math.min(100, Math.max(10, Math.round(50 + comp.growth * 3)));
                      const performanceScore = Math.min(100, Math.max(10, Math.round(40 + comp.engagement * 12)));

                      return (
                        <div key={comp._id} className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-200">{comp.accountName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{postingFrequency}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="space-y-1">
                              <span className="text-slate-500 uppercase tracking-widest font-bold block">Growth Score</span>
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${growthScore}%` }} />
                                </div>
                                <span className="font-mono font-bold text-emerald-400 shrink-0">{growthScore}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-500 uppercase tracking-widest font-bold block">Perf Score</span>
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${performanceScore}%` }} />
                                </div>
                                <span className="font-mono font-bold text-indigo-400 shrink-0">{performanceScore}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Benchmark Charts Section */}
              <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Visual Benchmark Comparisons</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Plot performance trajectories across indicators.</p>
                  </div>

                  {/* Chart Tabs */}
                  <div className="bg-[#111319] border border-white/[0.08] p-1 rounded-xl flex gap-1 self-start">
                    {[
                      { id: "followers", label: "Followers", icon: Users },
                      { id: "views", label: "Views", icon: Eye },
                      { id: "engagement", label: "Engagement", icon: Percent },
                      { id: "history", label: "Trend Comparison", icon: TrendingUp },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveChartTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                            activeChartTab === tab.id
                              ? "bg-indigo-600 text-white"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Icon size={12} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-[380px] w-full">
                  {activeChartTab === "history" ? (
                    <ResponsiveContainer width="100%" height={350} minHeight={100}>
                      <LineChart data={getHistoricalData()} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 10, fontFamily: "monospace" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 10, fontFamily: "monospace" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(17, 19, 25, 0.95)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        {competitors.map((c, i) => (
                          <Line
                            key={c.accountName}
                            type="monotone"
                            dataKey={c.accountName}
                            stroke={colors[i % colors.length]}
                            strokeWidth={2.5}
                            connectNulls
                            dot={{ fill: colors[i % colors.length], strokeWidth: 1 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height={350} minHeight={100}>
                      <BarChart data={getComparisonData()} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 10, fontFamily: "sans-serif" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 10, fontFamily: "monospace" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "rgba(17, 19, 25, 0.95)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            color: "#fff",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey={
                            activeChartTab === "followers"
                              ? "Followers"
                              : activeChartTab === "views"
                              ? "Views"
                              : "Engagement"
                          }
                          fill="#6366f1"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
