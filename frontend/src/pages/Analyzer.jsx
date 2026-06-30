import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useAnalyzer } from "../hooks/useQueries";
import { getVideoInsights } from "../api/aiApi";
import { getChannelInsights } from "../api/aiChannelApi";
import FollowerChart from "../components/charts/FollowerChart";
import client from "../api/client";
import toast from "react-hot-toast";
import LeaderAvatar from "../components/common/LeaderAvatar";

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
  const [group, setGroup] = useState("Other");
  const [state, setState] = useState("");
  const [party, setParty] = useState("");
  const [searchParams] = useSearchParams();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [queryParams, setQueryParams] = useState({
    url: "",
    group: "Other",
    force: false,
    state: "",
    party: "",
    profileImage: "",
    timestamp: 0,
  });

  const { data: result, isLoading: loading, error: queryError } = useAnalyzer(
    queryParams.url,
    queryParams.group,
    queryParams.force,
    queryParams.state,
    queryParams.party,
    queryParams.profileImage
  );

  const [error, setError] = useState("");
  const displayError = queryError?.response?.data?.message || queryError?.message || error;

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, or WEBP image.");
        return;
      }
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error("File size must be less than 5 MB.");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleAnalyze = async (targetUrl = url, force = false) => {
    setError("");
    setInsights("");
    setChannelInsights("");

    const cleanTarget = targetUrl.trim();
    if (!cleanTarget) {
      setError("Please insert a valid YouTube channel/video link or handle.");
      return;
    }

    try {
      let profileImageUrl = "";
      if (photoFile) {
        toast.loading("Uploading profile photo...", { id: "photo-upload" });
        const formData = new FormData();
        formData.append("photo", photoFile);
        const uploadRes = await client.post("/api/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (uploadRes.data && uploadRes.data.success) {
          profileImageUrl = uploadRes.data.url;
          toast.success("Profile photo uploaded!", { id: "photo-upload" });
        } else {
          throw new Error("Failed to upload profile photo");
        }
      }

      setQueryParams({
        url: cleanTarget,
        group,
        force,
        state: state || "Unknown State",
        party: party || "Independent",
        profileImage: profileImageUrl,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to trigger analysis");
    }
  };

  useEffect(() => {
    const urlParam = searchParams.get("url");
    if (urlParam) {
      const decoded = decodeURIComponent(urlParam);
      setUrl(decoded);
      handleAnalyze(decoded);
    }
  }, [searchParams]);

  const [channelInsights, setChannelInsights] = useState("");
  const [loadingChannelInsights, setLoadingChannelInsights] = useState(false);
  const [insights, setInsights] = useState("");
  const [loadingInsights, setLoadingInsights] = useState(false);

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
        recentTitles: (result.data.recentVideos || []).map((v) => v.snippet.title),
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
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    Analyse performance
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    Paste content URLs to unlock instant telemetry matrix
                    structures and deep AI insights.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* URL Input */}
                    <div className="md:col-span-2 space-y-1.5 text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        YouTube URL or Handle
                      </label>
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube video/channel"
                        className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
                        required
                      />
                    </div>

                    {/* Group Selection */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Group Assignment
                      </label>
                      <select
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-[#171923] border border-white/[0.08] text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold cursor-pointer"
                        required
                      >
                        <option value="BJP">BJP</option>
                        <option value="Congress">Congress</option>
                        <option value="AAP">AAP</option>
                        <option value="TMC">TMC</option>
                        <option value="BJD">BJD</option>
                        <option value="DMK">DMK</option>
                        <option value="Shiv Sena">Shiv Sena</option>
                        <option value="NCP">NCP</option>
                        <option value="Independent">Independent</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* State Input */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Assam, Delhi, Gujarat"
                        className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
                        required
                      />
                    </div>

                    {/* Party Input */}
                    <div className="space-y-1.5 text-left">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Party
                      </label>
                      <input
                        type="text"
                        value={party}
                        onChange={(e) => setParty(e.target.value)}
                        placeholder="e.g. BJP, Congress, AAP"
                        className="w-full h-12 px-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
                        required
                      />
                    </div>
                  </div>

                  {/* Optional Profile Photo Upload */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Optional Profile Photo Upload (JPG, PNG, WEBP - Max 5MB)
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-[#171923] border border-white/[0.08]">
                      <div className="flex-1 w-full">
                        <input
                          type="file"
                          id="creator-photo-upload"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById("creator-photo-upload").click()}
                          className="w-full h-10 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          Select Image File
                        </button>
                      </div>

                      {photoPreview && (
                        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] p-2 rounded-lg shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-10 h-10 rounded-full object-cover border border-white/[0.1]"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={handleClearPhoto}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={loading}
                      className="w-full max-w-xs h-10 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0112-7.32V4a10 10 0 00-10 10h2z" />
                          </svg>
                          Parsing...
                        </>
                      ) : (
                        "Run Analysis"
                      )}
                    </button>
                  </div>
                </div>

                {displayError && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-medium text-red-400 text-center mt-3"
                  >
                    {displayError}
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
                        loading="lazy"
                      />
                      <div className="absolute top-3 left-3 bg-red-500/10 border border-red-500/30 backdrop-blur-md text-red-400 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider uppercase">
                        YouTube Video
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <h2 className="text-base font-bold text-white leading-snug line-clamp-2 tracking-tight flex items-center flex-wrap gap-2">
                          {result.data.title}
                          {result.cached !== undefined && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-semibold border ${result.cached
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              }`}>
                              {result.cached
                                ? (Math.round((Date.now() - result.cachedAt) / 60000) <= 0
                                  ? "Cached just now"
                                  : `Cached ${Math.round((Date.now() - result.cachedAt) / 60000)} min ago`)
                                : "Live Data"
                              }
                            </span>
                          )}
                        </h2>
                        <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-2">
                          {result.data.channel}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAnalyze(url, true)}
                        disabled={loading}
                        className="w-full h-10 inline-flex items-center justify-center text-xs font-semibold text-slate-200 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98] rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        {loading ? "Refreshing..." : "Refresh Data"}
                      </button>
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
                  <LeaderAvatar
                    creator={result.data}
                    size="w-24 h-24 sm:w-28 sm:h-28"
                    className="border-2 border-white/[0.08] shadow-md"
                  />
                  <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          {result.data.title}
                          {result.cached !== undefined && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${result.cached
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              }`}>
                              {result.cached
                                ? (Math.round((Date.now() - result.cachedAt) / 60000) <= 0
                                  ? "Cached just now"
                                  : `Cached ${Math.round((Date.now() - result.cachedAt) / 60000)} min ago`)
                                : "Live Data"
                              }
                            </span>
                          )}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 leading-normal line-clamp-2 mt-1">
                          {result.data.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAnalyze(url, true)}
                        disabled={loading}
                        className="inline-flex items-center justify-center h-10 px-4 text-xs font-semibold text-slate-200 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98] rounded-xl transition-all shadow-md shrink-0 w-full sm:w-auto cursor-pointer"
                      >
                        {loading ? "Refreshing..." : "Refresh Data"}
                      </button>
                    </div>
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
                            loading="lazy"
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

            {/* X / TWITTER PROFILE CONTAINER (Disabled) */}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default Analyzer;
