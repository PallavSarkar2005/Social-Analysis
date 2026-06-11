import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeYoutubeUrl, analyzeXUrl } from "../api/analyzerApi";
import { getVideoInsights } from "../api/aiApi";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import ChannelSearch from "../components/dashboard/ChannelSearch";
import ChannelHeader from "../components/dashboard/ChannelHeader";
import KPICard from "../components/dashboard/KPICard";
import GrowthChart from "../components/dashboard/GrowthChart";
import RecentVideosGrid from "../components/dashboard/RecentVideosGrid";
import AIHealthCard from "../components/dashboard/AIHealthCard";
import FollowerChart from "../components/charts/FollowerChart";

// Premium micro-interactions
const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);

  const chartData = channel?.history || [];

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setResult(null);
      setChannel(null);
      setInsights("");

      let response;
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        response = await analyzeYoutubeUrl(url);
      } else if (url.includes("x.com") || url.includes("twitter.com")) {
        response = await analyzeXUrl(url);
      } else {
        throw new Error("Please enter a valid YouTube or X (Twitter) URL.");
      }

      setResult(response);
      if (response.type === "channel") {
        setChannel(response.data);
      }
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          error.message ||
          "Failed to complete analysis",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await getVideoInsights({
        title: result?.data?.title,
        views: result?.data?.views,
        likes: result?.data?.likes,
        comments: result?.data?.comments,
      });
      setInsights(response.insights);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Core Header Navigation */}
        <Navbar />

        {/* Dashboard Frame */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          {/* Stretched Omnibar Search Unit */}
          <div className="w-full border-b border-white/[0.06] pb-8">
            <div className="w-full bg-[#121318]/50 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 sm:p-8 shadow-2xl shadow-black/40">
              <div className="w-full max-w-5xl mx-auto">
                <ChannelSearch
                  url={url}
                  setUrl={setUrl}
                  onAnalyze={handleAnalyze}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* YOUTUBE VIDEO CONTAINER */}
            {result?.type === "video" && (
              <motion.div
                key="youtube-video"
                {...fadeInUp}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Thumbnail / Hero Unit */}
                  <div className="lg:col-span-1 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl lg:sticky lg:top-6">
                    <div className="relative group overflow-hidden aspect-video bg-slate-950">
                      <img
                        src={result.data.thumbnail}
                        alt={result.data.title}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute top-3 left-3 bg-red-500/10 border border-red-500/30 backdrop-blur-md text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase">
                        YouTube Video
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <h2 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 tracking-tight">
                        {result.data.title}
                      </h2>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {result.data.channel}
                      </div>
                    </div>
                  </div>

                  {/* Core Metrics & Actions Grid */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <KPICard
                        title="Total Views"
                        value={Number(result.data.views || 0).toLocaleString()}
                      />
                      <KPICard
                        title="Total Likes"
                        value={Number(result.data.likes || 0).toLocaleString()}
                      />
                      <KPICard
                        title="Comments"
                        value={Number(
                          result.data.comments || 0,
                        ).toLocaleString()}
                      />
                      <KPICard
                        title="Engagement"
                        value={`${result.data.engagement || 0}%`}
                      />
                    </div>

                    {/* AI Engine Actions Drawer */}
                    <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-2xl space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-white tracking-tight">
                            Advanced AI Insights
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Parse unstructured video metadata via deep-inference
                            pipeline.
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateInsights}
                          disabled={loadingInsights}
                          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] shrink-0"
                        >
                          {loadingInsights
                            ? "Synthesizing..."
                            : "Generate Intelligence"}
                        </button>
                      </div>

                      {/* Display Generated Insights */}
                      {insights && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.99 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-indigo-500/[0.02] border border-indigo-500/20 rounded-xl p-4 sm:p-5"
                        >
                          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-3">
                            <svg
                              className="w-3.5 h-3.5 text-purple-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                                clipRule="evenodd"
                              />
                            </svg>
                            AI Performance Audit
                          </div>
                          <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                            {insights}
                          </div>
                        </motion.div>
                      )}

                      {/* Video description */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Video Metadata Description
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-wrap bg-white/[0.01] p-4 rounded-xl max-h-40 overflow-y-auto border border-white/[0.04]">
                          {result.data.description ||
                            "No metadata description provided."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* YOUTUBE CHANNEL CONTAINER */}
            {channel && (
              <motion.div
                key="youtube-channel"
                {...fadeInUp}
                className="space-y-6"
              >
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-1.5 shadow-2xl">
                  <ChannelHeader channel={channel} />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard
                    title="Subscribers"
                    value={Number(channel.subscribers || 0).toLocaleString()}
                  />
                  <KPICard
                    title="Total Views"
                    value={Number(channel.totalViews || 0).toLocaleString()}
                  />
                  <KPICard
                    title="Videos Indexed"
                    value={Number(channel.videoCount || 0).toLocaleString()}
                  />
                  <KPICard
                    title="Internal ID Mapping"
                    value={
                      channel.channelId
                        ? `${channel.channelId.slice(0, 12)}...`
                        : "N/A"
                    }
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl">
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        Historical Audience Velocity
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Track delta velocity macro trends seamlessly over time
                        frames.
                      </p>
                    </div>
                    <GrowthChart data={chartData} />
                  </div>
                  <div className="lg:col-span-1">
                    <AIHealthCard channel={channel} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Recent Content Performance
                  </h3>
                  <RecentVideosGrid videos={channel.recentVideos} />
                </div>
              </motion.div>
            )}

            {/* X / TWITTER PROFILE CONTAINER */}
            {result?.type === "x" && (
              <motion.div
                key="x-profile"
                {...fadeInUp}
                className="max-w-5xl mx-auto bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden"
              >
                {/* Profile Header Block */}
                <div className="p-5 sm:p-8 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.01] to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                          {result.data.name}
                        </h2>
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
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-slate-400">
                        @{result.data.username}
                      </p>
                    </div>

                    <a
                      href={result.data.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-slate-200 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] active:scale-[0.98] rounded-xl transition-all shadow-md sm:w-auto w-full"
                    >
                      View Native Profile
                    </a>
                  </div>

                  {result.data.bio && (
                    <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                      {result.data.bio}
                    </p>
                  )}
                </div>

                {/* Core KPIs */}
                <div className="p-5 sm:p-8 bg-white/[0.01] border-b border-white/[0.06]">
                  <div className="grid grid-cols-3 gap-4">
                    <KPICard
                      title="Followers"
                      value={Number(
                        result.data.followers || 0,
                      ).toLocaleString()}
                    />
                    <KPICard
                      title="Following"
                      value={Number(
                        result.data.following || 0,
                      ).toLocaleString()}
                    />
                    <KPICard
                      title="Total Posts"
                      value={Number(result.data.posts || 0).toLocaleString()}
                    />
                  </div>
                </div>

                {/* Historical Analytical Node */}
                {result.data.history?.length > 0 && (
                  <div className="p-5 sm:p-8 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        Audience Growth Timeline
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Granular historical delta records for platform tracking.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] rounded-xl border border-white/[0.05] p-2">
                      <FollowerChart data={result.data.history} />
                    </div>

                    {/* Timeline Log Table */}
                    <div className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20">
                      <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06] flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Capture Point</span>
                        <span>Followers</span>
                      </div>
                      <div className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
                        {result.data.history.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center px-4 py-3 text-xs sm:text-sm hover:bg-white/[0.01] transition-colors"
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
