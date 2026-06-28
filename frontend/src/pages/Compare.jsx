import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { compareYoutubeCreators } from "../api/compareApi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Users,
  Trophy,
  Percent,
  Video,
  Eye,
  Sparkles,
  Search,
  MessageSquare,
  Heart,
  Calendar,
  RefreshCw,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function Compare() {
  const [creator1, setCreator1] = useState("");
  const [creator2, setCreator2] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!creator1 || !creator2) {
      setError("Please fill in both YouTube URL or handle fields.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setData(null);

      const response = await compareYoutubeCreators(creator1, creator2);
      if (response.success) {
        setData(response);
        toast.success("Creator analysis sheet generated successfully.");
      } else {
        setError(response.message || "Failed to generate comparison analysis.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          "Failed to compare handles. Verify that both exist on YouTube and try again."
      );
      toast.error("Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return diffHours <= 0 ? "Just now" : `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const formatCreationDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).getFullYear().toString();
  };

  const getComparisonStyles = (valA, valB, side) => {
    if (valA === valB) return "text-slate-300 bg-white/[0.01]";
    
    const isAHigher = valA > valB;
    if (side === "A") {
      return isAHigher 
        ? "text-emerald-400 font-bold bg-emerald-500/[0.04] border-l-2 border-emerald-500/40" 
        : "text-rose-400 font-medium bg-rose-500/[0.02] border-l-2 border-rose-500/20";
    } else {
      return !isAHigher 
        ? "text-emerald-400 font-bold bg-emerald-500/[0.04] border-l-2 border-emerald-500/40" 
        : "text-rose-400 font-medium bg-rose-500/[0.02] border-l-2 border-rose-500/20";
    }
  };

  // Recharts payload mapping
  const getChartData = (valA, valB) => {
    if (!data) return [];
    return [
      { name: data.creatorA.name, value: valA },
      { name: data.creatorB.name, value: valB },
    ];
  };

  const barColors = ["#6366f1", "#a855f7"]; // Creator A: Indigo, Creator B: Purple

  const MiniCompareChart = ({ dataList, title, unit = "" }) => (
    <div className="bg-[#121318]/45 border border-white/[0.06] p-5 rounded-2xl shadow-xl space-y-4 flex flex-col">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        <TrendingUp size={12} className="text-indigo-400" />
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={dataList} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => {
              if (val >= 1e9) return (val / 1e9).toFixed(1) + "B";
              if (val >= 1e6) return (val / 1e6).toFixed(1) + "M";
              if (val >= 1e3) return (val / 1e3).toFixed(1) + "K";
              return val;
            }}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString() + unit, ""]}
            contentStyle={{
              background: "rgba(17, 19, 25, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "11px",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {dataList.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

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
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
                Creator Comparison
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Compare two creators across key performance metrics in real time.
              </p>
            </div>
          </div>

          {/* Side by Side Inputs Form */}
          <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -z-10" />
            <form onSubmit={handleCompare} className="space-y-6 max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
                
                {/* Creator A Input */}
                <div className="w-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Creator A (Handle or Channel URL)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={creator1}
                      onChange={(e) => setCreator1(e.target.value)}
                      placeholder="e.g. @BJP or YouTube Channel URL..."
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50 transition font-sans"
                    />
                  </div>
                </div>

                {/* Compare Center Button & VS */}
                <div className="shrink-0 flex flex-col items-center justify-center pt-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 border border-white/[0.1] flex items-center justify-center font-extrabold text-white text-[11px] tracking-wider shadow-lg shadow-indigo-600/15 mb-2 select-none">
                    VS
                  </div>
                </div>

                {/* Creator B Input */}
                <div className="w-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Creator B (Handle or Channel URL)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={creator2}
                      onChange={(e) => setCreator2(e.target.value)}
                      placeholder="e.g. @Congress or YouTube Channel URL..."
                      className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-indigo-500/50 transition font-sans"
                    />
                  </div>
                </div>

              </div>

              <div className="flex flex-col items-center pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 px-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Comparing Channels...
                    </>
                  ) : (
                    "Compare Creators"
                  )}
                </button>
                {error && (
                  <p className="text-xs font-semibold text-rose-400 text-center">{error}</p>
                )}
              </div>
            </form>
          </div>

          <AnimatePresence>
            {data && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.4 }}
                className="space-y-12"
              >
                
                {/* Sticky Comparison Sheet Table */}
                <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      {/* Sticky Header */}
                      <thead className="sticky top-0 bg-[#090a0f] z-20 shadow-md">
                        <tr className="border-b border-white/[0.08]">
                          <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest w-[28%]">
                            Analytics Variable
                          </th>
                          <th className="p-5 text-center text-sm font-extrabold text-white border-l border-white/[0.04] w-[36%] bg-indigo-500/[0.01]">
                            <div className="flex items-center justify-center gap-3">
                              {data.creatorA.thumbnail && (
                                <img
                                  src={data.creatorA.thumbnail}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover"
                                />
                              )}
                              <span>{data.creatorA.name}</span>
                            </div>
                          </th>
                          <th className="p-5 text-center text-sm font-extrabold text-white border-l border-white/[0.04] w-[36%] bg-purple-500/[0.01]">
                            <div className="flex items-center justify-center gap-3">
                              {data.creatorB.thumbnail && (
                                <img
                                  src={data.creatorB.thumbnail}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-purple-500/30 object-cover"
                                />
                              )}
                              <span>{data.creatorB.name}</span>
                            </div>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                        {/* Channel Name */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Channel Name</td>
                          <td className="p-4 text-center font-sans text-white font-bold border-l border-white/[0.04]">
                            {data.creatorA.name}
                          </td>
                          <td className="p-4 text-center font-sans text-white font-bold border-l border-white/[0.04]">
                            {data.creatorB.name}
                          </td>
                        </tr>

                        {/* Subscribers */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Subscribers</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.subscribers, data.creatorB.subscribers, "A")}`}>
                            {data.creatorA.subscribers.toLocaleString()}
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.subscribers, data.creatorB.subscribers, "B")}`}>
                            {data.creatorB.subscribers.toLocaleString()}
                          </td>
                        </tr>

                        {/* Total Views */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Total Views</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.totalViews, data.creatorB.totalViews, "A")}`}>
                            {data.creatorA.totalViews.toLocaleString()}
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.totalViews, data.creatorB.totalViews, "B")}`}>
                            {data.creatorB.totalViews.toLocaleString()}
                          </td>
                        </tr>

                        {/* Videos */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Videos Assets</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.totalVideos, data.creatorB.totalVideos, "A")}`}>
                            {data.creatorA.totalVideos.toLocaleString()}
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.totalVideos, data.creatorB.totalVideos, "B")}`}>
                            {data.creatorB.totalVideos.toLocaleString()}
                          </td>
                        </tr>

                        {/* Average Views */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Average Views per Video</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.avgViews, data.creatorB.avgViews, "A")}`}>
                            {data.creatorA.avgViews.toLocaleString()}
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.avgViews, data.creatorB.avgViews, "B")}`}>
                            {data.creatorB.avgViews.toLocaleString()}
                          </td>
                        </tr>

                        {/* Average Likes */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Average Likes per Video</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.avgLikes, data.creatorB.avgLikes, "A")}`}>
                            {data.creatorA.avgLikes.toLocaleString()}
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.avgLikes, data.creatorB.avgLikes, "B")}`}>
                            {data.creatorB.avgLikes.toLocaleString()}
                          </td>
                        </tr>

                        {/* Average Comments */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Average Comments per Video</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.avgComments, data.creatorB.avgComments, "A")}`}>
                            {data.creatorA.avgComments.toLocaleString()}
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.avgComments, data.creatorB.avgComments, "B")}`}>
                            {data.creatorB.avgComments.toLocaleString()}
                          </td>
                        </tr>

                        {/* Engagement Rate */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Engagement Rate</td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.engagementRate, data.creatorB.engagementRate, "A")}`}>
                            {data.creatorA.engagementRate}%
                          </td>
                          <td className={`p-4 text-center border-l border-white/[0.04] ${getComparisonStyles(data.creatorA.engagementRate, data.creatorB.engagementRate, "B")}`}>
                            {data.creatorB.engagementRate}%
                          </td>
                        </tr>

                        {/* Channel Created */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Channel Created</td>
                          <td className="p-4 text-center border-l border-white/[0.04] text-slate-300">
                            {formatCreationDate(data.creatorA.publishedAt)}
                          </td>
                          <td className="p-4 text-center border-l border-white/[0.04] text-slate-300">
                            {formatCreationDate(data.creatorB.publishedAt)}
                          </td>
                        </tr>

                        {/* Upload Frequency */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Upload Frequency</td>
                          <td className="p-4 text-center border-l border-white/[0.04] text-slate-300 font-sans">
                            {data.creatorA.uploadFrequency}
                          </td>
                          <td className="p-4 text-center border-l border-white/[0.04] text-slate-300 font-sans">
                            {data.creatorB.uploadFrequency}
                          </td>
                        </tr>

                        {/* Latest Upload */}
                        <tr className="hover:bg-white/[0.01]">
                          <td className="p-4 text-slate-400 font-sans font-semibold">Latest Upload</td>
                          <td className="p-4 text-center border-l border-white/[0.04] text-slate-300 font-sans flex items-center justify-center gap-1.5">
                            <Clock size={12} className="text-slate-500" />
                            {getRelativeTime(data.creatorA.latestUpload)}
                          </td>
                          <td className="p-4 text-center border-l border-white/[0.04] text-slate-300 font-sans flex items-center justify-center gap-1.5">
                            <Clock size={12} className="text-slate-500" />
                            {getRelativeTime(data.creatorB.latestUpload)}
                          </td>
                        </tr>

                        {/* Winner Row */}
                        <tr className="bg-white/[0.02]">
                          <td className="p-4 text-slate-300 font-sans font-bold flex items-center gap-2">
                            <Trophy size={14} className="text-amber-400" /> Category Winner
                          </td>
                          <td className="p-4 text-center border-l border-white/[0.04]">
                            {data.comparison.overallWinner === "creatorA" ? (
                              <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                Winner
                              </span>
                            ) : data.comparison.overallWinner === "creatorB" ? (
                              <span className="text-slate-500">—</span>
                            ) : (
                              <span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold">Tie</span>
                            )}
                          </td>
                          <td className="p-4 text-center border-l border-white/[0.04]">
                            {data.comparison.overallWinner === "creatorB" ? (
                              <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                Winner
                              </span>
                            ) : data.comparison.overallWinner === "creatorA" ? (
                              <span className="text-slate-500">—</span>
                            ) : (
                              <span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 font-bold">Tie</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visual Comparison Charts */}
                <div className="space-y-6">
                  <div className="border-b border-white/[0.06] pb-3">
                    <h3 className="text-lg font-bold text-white tracking-tight">Visual Comparison</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Graphical comparisons of core telemetry variables.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <MiniCompareChart dataList={getChartData(data.creatorA.subscribers, data.creatorB.subscribers)} title="Subscribers" />
                    <MiniCompareChart dataList={getChartData(data.creatorA.totalViews, data.creatorB.totalViews)} title="Total Views" />
                    <MiniCompareChart dataList={getChartData(data.creatorA.totalVideos, data.creatorB.totalVideos)} title="Total Videos" />
                    <MiniCompareChart dataList={getChartData(data.creatorA.avgViews, data.creatorB.avgViews)} title="Average Views" />
                    <MiniCompareChart dataList={getChartData(data.creatorA.avgLikes, data.creatorB.avgLikes)} title="Average Likes" />
                    <MiniCompareChart dataList={getChartData(data.creatorA.engagementRate, data.creatorB.engagementRate)} title="Engagement Rate" unit="%" />
                  </div>
                </div>

                {/* AI Research Summary Section */}
                {data.aiReport && (
                  <div className="space-y-6">
                    <div className="border-b border-white/[0.06] pb-3">
                      <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <Sparkles size={18} className="text-purple-400 animate-pulse" />
                        AI Research Summary
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Synthesized intelligence analysis generated by Llama 3 models.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* Audience Size */}
                      <div className="bg-[#121318]/45 border border-white/[0.06] p-5 rounded-2xl shadow-xl space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audience Size Comparison</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{data.aiReport.audienceSizeComparison}</p>
                      </div>

                      {/* Engagement */}
                      <div className="bg-[#121318]/45 border border-white/[0.06] p-5 rounded-2xl shadow-xl space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engagement Comparison</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{data.aiReport.engagementComparison}</p>
                      </div>

                      {/* Growth */}
                      <div className="bg-[#121318]/45 border border-white/[0.06] p-5 rounded-2xl shadow-xl space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth Comparison</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{data.aiReport.growthComparison}</p>
                      </div>

                      {/* Content Consistency */}
                      <div className="bg-[#121318]/45 border border-white/[0.06] p-5 rounded-2xl shadow-xl space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Content Consistency</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{data.aiReport.contentConsistency}</p>
                      </div>

                      {/* Upload Frequency */}
                      <div className="bg-[#121318]/45 border border-white/[0.06] p-5 rounded-2xl shadow-xl space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Upload Frequency</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{data.aiReport.uploadFrequency}</p>
                      </div>

                      {/* Overall Stronger Creator */}
                      <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 p-5 rounded-2xl shadow-xl space-y-2">
                        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Overall Stronger Creator</h4>
                        <p className="text-xs text-slate-200 leading-relaxed font-semibold">{data.aiReport.overallStrongerCreator}</p>
                      </div>

                    </div>

                    {/* Key Strengths & Weaknesses Grids */}
                    <div className="grid md:grid-cols-2 gap-6 pt-2">
                      {/* Creator A Strengths/Weaknesses */}
                      <div className="bg-[#121318]/40 border border-white/[0.06] p-6 rounded-2xl space-y-5">
                        <h4 className="text-sm font-bold text-white tracking-tight border-b border-white/[0.06] pb-2 flex items-center gap-2">
                          <Award size={15} className="text-indigo-400" />
                          {data.creatorA.name} Profile Strategy
                        </h4>
                        
                        <div className="space-y-3">
                          <span className="text-[9px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Key Strengths</span>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1.5">
                            {data.aiReport.creatorA.keyStrengths?.map((str, idx) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <span className="text-[9px] uppercase tracking-wider bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold">Key Weaknesses</span>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1.5">
                            {data.aiReport.creatorA.keyWeaknesses?.map((weak, idx) => (
                              <li key={idx}>{weak}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Creator B Strengths/Weaknesses */}
                      <div className="bg-[#121318]/40 border border-white/[0.06] p-6 rounded-2xl space-y-5">
                        <h4 className="text-sm font-bold text-white tracking-tight border-b border-white/[0.06] pb-2 flex items-center gap-2">
                          <Award size={15} className="text-purple-400" />
                          {data.creatorB.name} Profile Strategy
                        </h4>
                        
                        <div className="space-y-3">
                          <span className="text-[9px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Key Strengths</span>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1.5">
                            {data.aiReport.creatorB.keyStrengths?.map((str, idx) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-3">
                          <span className="text-[9px] uppercase tracking-wider bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold">Key Weaknesses</span>
                          <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1.5">
                            {data.aiReport.creatorB.keyWeaknesses?.map((weak, idx) => (
                              <li key={idx}>{weak}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
