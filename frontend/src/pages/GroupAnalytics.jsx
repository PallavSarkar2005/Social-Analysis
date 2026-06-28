import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getGroupCreators } from "../api/groupApi";
import {
  Users,
  Eye,
  Video,
  Percent,
  TrendingUp,
  Clock,
  ArrowLeft,
  RefreshCw,
  Award,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function GroupAnalytics() {
  const { groupName } = useParams();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCreators = async () => {
    try {
      setLoading(true);
      const res = await getGroupCreators(groupName);
      if (res.success) {
        setCreators(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load ${groupName.toUpperCase()} group analytics.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreators();
  }, [groupName]);

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num;
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return diffHours <= 0 ? "Just now" : `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Theme accent mappings based on group name
  const getGroupTheme = () => {
    const name = groupName.toLowerCase();
    if (name === "bjp") {
      return {
        accent: "from-orange-500 to-amber-600",
        shadow: "shadow-orange-500/10",
        border: "hover:border-orange-500/30",
        text: "text-orange-400",
        bg: "bg-orange-500/10",
      };
    }
    if (name === "congress") {
      return {
        accent: "from-cyan-500 to-indigo-600",
        shadow: "shadow-cyan-500/10",
        border: "hover:border-cyan-500/30",
        text: "text-cyan-400",
        bg: "bg-cyan-500/10",
      };
    }
    // Default theme for dynamic groups
    return {
      accent: "from-indigo-500 to-purple-600",
      shadow: "shadow-indigo-500/10",
      border: "hover:border-indigo-500/30",
      text: "text-indigo-400",
      bg: "bg-indigo-500/10",
    };
  };

  const theme = getGroupTheme();

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div className="space-y-1">
              <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition mb-2">
                <ArrowLeft size={12} /> Back to Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase ${theme.bg} ${theme.text} border border-white/[0.04]`}>
                  {groupName} Group
                </span>
                {groupName.toUpperCase()} Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Performance analytics of all tracked {groupName.toUpperCase()} leaders, ministers, and official creators.
              </p>
            </div>
            <button
              onClick={loadCreators}
              disabled={loading}
              className="h-10 px-4 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-xl text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 self-start sm:self-center disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh Group Stats
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading political organization analytics...</p>
            </div>
          ) : creators.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creators.map((creator) => (
                <Link
                  key={creator._id}
                  to={`/analyzer?url=${encodeURIComponent(creator.profileUrl || creator.accountId)}`}
                  className="block group"
                >
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`bg-[#121318]/45 backdrop-blur-md rounded-2xl border border-white/[0.06] ${theme.border} p-6 shadow-xl relative overflow-hidden transition-all flex flex-col justify-between h-full hover:shadow-2xl ${theme.shadow}`}
                  >
                    {/* Glow effect on hover */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.accent} opacity-0 group-hover:opacity-5 rounded-full blur-2xl transition-opacity duration-300`} />

                    <div className="space-y-5">
                      {/* Creator Metadata */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                          {creator.thumbnail ? (
                            <img
                              src={creator.thumbnail}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Award size={20} className="text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-indigo-400 transition-colors">
                            {creator.name}
                          </h3>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                            {creator.accountId}
                          </p>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 border-t border-b border-white/[0.04] py-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Users size={12} className="text-slate-500" />
                            Subscribers
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            {formatNumber(creator.subscribers)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Eye size={12} className="text-slate-500" />
                            Total Views
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            {formatNumber(creator.totalViews)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Video size={12} className="text-slate-500" />
                            Videos count
                          </span>
                          <span className="font-mono font-bold text-slate-200">
                            {formatNumber(creator.totalVideos)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Percent size={12} className="text-slate-500" />
                            Engagement
                          </span>
                          <span className="font-mono font-bold text-indigo-400">
                            {creator.engagementRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Stats and Nav Icon */}
                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/[0.04] text-[10px] text-slate-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{getRelativeTime(creator.lastSync)}</span>
                        </div>

                        {/* Growth % Badge */}
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold ${
                          creator.growth >= 0 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {creator.growth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          <span>{creator.growth >= 0 ? "+" : ""}{creator.growth}%</span>
                        </div>
                      </div>

                      <ChevronRight size={14} className="text-slate-500 group-hover:text-white transition group-hover:translate-x-0.5" />
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-[#121318]/20 border border-white/[0.06] border-dashed rounded-2xl space-y-4">
              <Award size={36} className="text-slate-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">No Tracked Nodes in {groupName.toUpperCase()}</h3>
                <p className="text-xs text-slate-500">Track politicians and creators to explore centralized organization metrics.</p>
              </div>
              <Link to="/accounts">
                <button className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition cursor-pointer">
                  Track Creators
                </button>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
