import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { analyzeYoutubeUrl, analyzeXUrl } from "../api/analyzerApi";
import { getVideoInsights } from "../api/aiApi";
import { getChannelInsights } from "../api/aiChannelApi";
import FollowerChart from "../components/charts/FollowerChart";

// High-end micro-interaction animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

const calculateInfluenceScore = (followers, posts) => {
  const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === "number") return val;
    const clean = val.replace(/,/g, "");
    if (clean.endsWith("K")) return parseFloat(clean) * 1000;
    if (clean.endsWith("M")) return parseFloat(clean) * 1000000;
    return parseFloat(clean) || 0;
  };
  const f = parseNum(followers);
  const p = parseNum(posts);
  if (!f) return 50;
  const followerScore = Math.min(70, Math.round(Math.log10(f) * 10));
  const postScore = Math.min(30, Math.round(Math.log10(Math.max(p, 1)) * 6));
  return Math.max(10, Math.min(100, followerScore + postScore));
};

const getInfluenceText = (score) => {
  if (score >= 90) return "Dominant authority profile with exceptional reach and viral conversions.";
  if (score >= 75) return "High-tier influencer node with consistent audience engagement metrics.";
  if (score >= 50) return "Established social channel showing healthy conversion possibilities.";
  return "Emerging media node building initial audience velocity.";
};

function Analyzer() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channelInsights, setChannelInsights] = useState("");

  const [loadingChannelInsights, setLoadingChannelInsights] = useState(false);
  const [insights, setInsights] = useState("");

  const [loadingInsights, setLoadingInsights] = useState(false);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError("");
      setResult(null);
      setInsights("");
      setChannelInsights("");

      let response;
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        response = await analyzeYoutubeUrl(url);
      } else if (url.includes("x.com")) {
        response = await analyzeXUrl(url);
      } else {
        throw new Error("Please insert a valid YouTube or X link.");
      }

      setResult(response);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || err.message || "Failed to analyze URL",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!result?.data) return;
    try {
      setLoadingInsights(true);
      const response = await getVideoInsights({
        title: result.data.title,
        views: result.data.views,
        likes: result.data.likes,
        comments: result.data.comments,
      });
      setInsights(response.insights);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Failed to generate AI insights.";
      setInsights(`Error: ${msg}`);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleChannelInsights = async () => {
    try {
      setLoadingChannelInsights(true);
      const response = await getChannelInsights({
        title: result.data.title,
        subscribers: result.data.subscribers,
        totalViews: result.data.totalViews,
        videoCount: result.data.videoCount,
        recentTitles: result.data.recentVideos.map((v) => v.snippet.title),
      });
      setChannelInsights(response.insights);
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || "Failed to generate channel insights.";
      setChannelInsights(`Error: ${msg}`);
    } finally {
      setLoadingChannelInsights(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Decorative Ambient Background Radiance */}
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none z-0" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-600/5 blur-[100px] pointer-events-none z-0" />

        {/* Core Header Navigation */}
        <Navbar />

        {/* Dashboard Frame */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          {/* Stretched Omnibar Search Card */}
          <div className="w-full border-b border-white/[0.06] pb-8">
            <div className="w-full bg-[#121318]/50 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 sm:p-8 shadow-2xl shadow-black/40">
              <div className="w-full max-w-5xl mx-auto space-y-6">
                <div className="text-center space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Analyze Platform Performance
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    Paste content URLs to unlock instant telemetry matrix
                    structures and deep AI insights.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste YouTube video/channel or X profile URL..."
                      className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 0112-7.32V4a10 10 0 00-10 10h2z"
                          />
                        </svg>
                        Parsing...
                      </>
                    ) : (
                      "Run Analytics"
                    )}
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-medium text-red-400 text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            </div>
          </div>

          {/* MAIN DYNAMIC CONTENT SWITCHBOARD */}
          <AnimatePresence mode="wait">
            {/* YOUTUBE VIDEO CONTAINER */}
            {result?.type === "video" && (
              <motion.div
                key="video-result"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Hero Media Entity */}
                  <div className="lg:col-span-1 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl lg:sticky lg:top-6">
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      <img
                        src={result.data.thumbnail}
                        alt={result.data.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-red-500/10 border border-red-500/30 backdrop-blur-md text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase">
                        YouTube Video
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <h2 className="text-base font-bold text-white leading-snug line-clamp-2 tracking-tight">
                        {result.data.title}
                      </h2>
                      <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {result.data.channel}
                      </div>
                    </div>
                  </div>

                  {/* Operational Data Engine Node */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: "Views", val: result.data.views },
                        { label: "Likes", val: result.data.likes },
                        { label: "Comments", val: result.data.comments },
                        {
                          label: "Engagement",
                          val: `${result.data.engagement}%`,
                          raw: true,
                        },
                      ].map((card, i) => (
                        <div
                          key={i}
                          className="bg-[#121318]/30 border border-white/[0.06] rounded-xl p-4 sm:p-5 shadow-sm"
                        >
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {card.label}
                          </p>
                          <h3 className="text-lg sm:text-2xl font-bold text-white mt-2">
                            {card.raw
                              ? card.val
                              : Number(card.val || 0).toLocaleString()}
                          </h3>
                        </div>
                      ))}
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-2xl space-y-6">
                      <div className="space-y-1.5">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Video Description
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-wrap bg-white/[0.01] p-4 rounded-xl max-h-40 overflow-y-auto border border-white/[0.04]">
                          {result.data.description ||
                            "No description provided."}
                        </p>
                      </div>

                      {/* AI Core Interaction Section */}
                      <div className="border-t border-white/[0.06] pt-6 space-y-4">
                        <button
                          onClick={handleGenerateInsights}
                          disabled={loadingInsights}
                          className="inline-flex items-center justify-center px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-xl transition-all shadow-md active:scale-[0.98]"
                        >
                          {loadingInsights
                            ? "Synthesizing Insights..."
                            : "Generate AI Insights"}
                        </button>

                        {insights && (
                          <motion.div
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="bg-purple-500/[0.02] border border-purple-500/20 rounded-xl p-4 sm:p-5"
                          >
                            <h3 className="text-sm font-bold text-purple-400 tracking-wide mb-3 flex items-center gap-2">
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              AI Performance Insights
                            </h3>
                            <div className="text-xs sm:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                              {insights}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* YOUTUBE CHANNEL CONTAINER */}
            {result?.type === "channel" && (
              <motion.div
                key="channel-result"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Channel Frame Header */}
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 shadow-2xl flex flex-col sm:flex-row items-center gap-6">
                  <img
                    src={result.data.thumbnail}
                    alt={result.data.title}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-white/[0.08] shadow-md object-cover"
                  />
                  <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                    <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
                      {result.data.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 leading-normal line-clamp-2">
                      {result.data.description}
                    </p>
                  </div>
                </div>

                {/* Grid KPI Core Matrix */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: "Subscribers", count: result.data.subscribers },
                    { title: "Total Views", count: result.data.totalViews },
                    { title: "Videos Indexed", count: result.data.videoCount },
                  ].map((metric, idx) => (
                    <div
                      key={idx}
                      className="bg-[#121318]/30 border border-white/[0.06] rounded-xl p-4 sm:p-5"
                    >
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {metric.title}
                      </p>
                      <h3 className="text-lg sm:text-2xl font-bold text-white mt-1">
                        {Number(metric.count || 0).toLocaleString()}
                      </h3>
                    </div>
                  ))}
                </div>

                {/* Recent Content Log units */}
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-6">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Recent Content Performance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.data.recentVideos?.map((video) => (
                      <div
                        key={video.id.videoId}
                        className="bg-white/[0.01] rounded-xl border border-white/[0.05] overflow-hidden shadow-sm hover:border-white/[0.1] transition-colors"
                      >
                        <div className="aspect-video relative bg-slate-900">
                          <img
                            src={video.snippet.thumbnails.high?.url}
                            alt={video.snippet.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 space-y-3">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-2 min-h-[40px]">
                            {video.snippet.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {new Date(
                              video.snippet.publishedAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Channel Analytical Engine Activation */}
                  <div className="border-t border-white/[0.06] pt-6 space-y-4">
                    <button
                      onClick={handleChannelInsights}
                      disabled={loadingChannelInsights}
                      className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition shadow-md active:scale-[0.98]"
                    >
                      {loadingChannelInsights
                        ? "Parsing Global Matrix..."
                        : "Generate AI Channel Insights"}
                    </button>

                    {channelInsights && (
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className="bg-indigo-500/[0.02] border border-indigo-500/20 rounded-xl p-5 shadow-inner"
                      >
                        <h3 className="text-sm font-bold text-indigo-400 tracking-wide mb-3 flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-purple-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Macro Channel Intelligence
                        </h3>
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                          {channelInsights}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* X / TWITTER PROFILE CONTAINER */}
            {result?.type === "x" && (
              <motion.div
                key="x-result"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="max-w-5xl mx-auto bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden"
              >
                {/* Profile Header Block */}
                <div className="p-5 sm:p-8 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.01] to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md shrink-0">
                        {result.data.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                          {result.data.name}
                          <svg
                            className="w-4 h-4 text-sky-400 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.267 3.455a.75.75 0 00-.708-.523.75.75 0 00-.55.244l-3 3.5a.75.75 0 00.059 1.053l3.5 3a.75.75 0 001.054-1.068L4.83 7.5h7.92a2.75 2.75 0 012.75 2.75v1a.75.75 0 001.5 0v-1a4.25 4.25 0 00-4.25-4.25H4.83l1.787-2.085a.75.75 0 00-.35-1.21z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-2 truncate">
                          @{result.data.username}
                          {result.data.source && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              result.data.source === "Live Data"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : result.data.source === "Cached Data"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            }`}>
                              {result.data.source}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <a
                      href={result.data.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-10 px-4 text-xs font-semibold text-slate-200 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] active:scale-[0.98] rounded-xl transition-all shadow-md sm:w-auto w-full"
                    >
                      View Native Profile
                    </a>
                  </div>

                  {result.data.bio && (
                    <div className="mt-6 bg-white/[0.01] border border-white/[0.04] rounded-xl p-4">
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {result.data.bio}
                      </p>
                    </div>
                  )}
                </div>

                {/* Core Network KPIs Grid */}
                <div className="p-5 sm:p-8 bg-white/[0.01] border-b border-white/[0.06]">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Followers", val: result.data.followers },
                      { label: "Following", val: result.data.following },
                      { label: "Total Posts", val: result.data.posts },
                    ].map((kpi, index) => (
                      <div
                        key={index}
                        className="bg-white/[0.01] border border-white/[0.05] rounded-xl p-4 sm:p-5 shadow-sm"
                      >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {kpi.label}
                        </p>
                        <h3 className="text-base sm:text-2xl font-black text-white mt-1.5">
                          {Number(kpi.val || 0).toLocaleString()}
                        </h3>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Context Blocks: Score Box & History Chart Layout */}
                <div className="p-5 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                    <div className="md:col-span-1 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-transparent border border-indigo-500/20 rounded-2xl p-5 shadow-lg">
                      <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                        Influence Score
                      </h4>
                      <div className="text-4xl sm:text-5xl font-black text-white mt-2 tracking-tight">
                        {calculateInfluenceScore(result.data.followers, result.data.posts)}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-300 leading-normal">
                        {getInfluenceText(calculateInfluenceScore(result.data.followers, result.data.posts))}
                      </p>
                    </div>

                    {/* Follower Expansion Node */}
                    {result.data.history?.length > 0 && (
                      <div className="md:col-span-3 bg-white/[0.01] rounded-2xl border border-white/[0.05] p-4 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Audience Expansion Timeline
                        </h4>
                        <div className="w-full">
                          <FollowerChart data={result.data.history} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Growth Logs Data Grid View */}
                  {result.data.history?.length > 0 && (
                    <div className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20">
                      <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06] flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Capture Point</span>
                        <span>Followers</span>
                      </div>
                      <div className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto custom-scrollbar">
                        {result.data.history.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center px-4 py-2.5 text-xs sm:text-sm hover:bg-white/[0.01] transition-colors"
                          >
                            <span className="text-slate-400 font-medium">
                              {item.date}
                            </span>
                            <span className="text-white font-semibold">
                              {Number(item.followers).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default Analyzer;
