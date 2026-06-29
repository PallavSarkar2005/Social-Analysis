import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useParty, useAccounts } from "../hooks/useQueries";
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
  Grid,
  List,
  Globe,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function GroupAnalytics() {
  const { groupName } = useParams();
  const { data: creators = [], isLoading: loading } = useParty(groupName);
  const { updateAccountGroup } = useAccounts();

  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem(`group-display-${groupName}`) || "card";
  });

  const handleGroupChange = async (e, creatorId) => {
    const newGroup = e.target.value;
    try {
      toast.loading("Updating group assignment...", { id: `group-${creatorId}` });
      await updateAccountGroup({ id: creatorId, group: newGroup });
      toast.success("Group updated successfully!", { id: `group-${creatorId}` });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update group.", { id: `group-${creatorId}` });
    }
  };

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem(`group-display-${groupName}`, mode);
  };

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

  const metrics = useMemo(() => {
    if (!creators || creators.length === 0) return null;

    const totalCreators = creators.length;
    const combinedSubscribers = creators.reduce((sum, c) => sum + (c.subscribers || 0), 0);
    const combinedViews = creators.reduce((sum, c) => sum + (c.totalViews || 0), 0);
    const totalVideos = creators.reduce((sum, c) => sum + (c.totalVideos || 0), 0);
    
    const avgMonthlyGrowth = (creators.reduce((sum, c) => sum + (c.growth || 0), 0) / totalCreators).toFixed(2);
    const avgEngagement = (creators.reduce((sum, c) => sum + (parseFloat(c.engagementRate) || 0), 0) / totalCreators).toFixed(2);

    const stateDist = {};
    creators.forEach(c => {
      const st = c.state || "Unknown State";
      stateDist[st] = (stateDist[st] || 0) + 1;
    });

    let topPerformer = creators[0];
    let fastestGrowing = creators[0];
    let mostViewed = creators[0];
    let newestAdded = creators[0];
    let lastSynced = new Date(creators[0].lastSync || 0);

    creators.forEach(c => {
      if ((c.subscribers || 0) > (topPerformer.subscribers || 0)) topPerformer = c;
      if ((c.growth || 0) > (fastestGrowing.growth || 0)) fastestGrowing = c;
      if ((c.totalViews || 0) > (mostViewed.totalViews || 0)) mostViewed = c;
      const cDate = new Date(c.lastSync || 0);
      if (cDate > new Date(newestAdded.lastSync || 0)) newestAdded = c;
      if (cDate > lastSynced) lastSynced = cDate;
    });

    return {
      totalCreators,
      combinedSubscribers,
      combinedViews,
      totalVideos,
      avgMonthlyGrowth,
      avgEngagement,
      stateDist,
      topPerformer,
      fastestGrowing,
      mostViewed,
      newestAdded,
      lastSynced,
    };
  }, [creators]);

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
            <div className="space-y-1 text-left">
              <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition mb-2">
                <ArrowLeft size={12} /> Back to Dashboard
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold uppercase ${theme.bg} ${theme.text} border border-white/[0.04]`}>
                  {groupName} Group
                </span>
                {groupName.toUpperCase()} Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Performance analytics of all tracked {groupName.toUpperCase()} leaders, ministers, and official creators.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* Display Mode Dropdown */}
              <div className="flex items-center bg-white/[0.02] border border-white/[0.08] rounded-xl p-0.5">
                <button
                  onClick={() => handleDisplayModeChange("card")}
                  className={`p-1.5 rounded-lg transition-all ${
                    displayMode === "card"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Card View"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => handleDisplayModeChange("list")}
                  className={`p-1.5 rounded-lg transition-all ${
                    displayMode === "list"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="List View"
                >
                  <List size={14} />
                </button>
              </div>

              <button
                onClick={() => loadCreators()}
                disabled={loading}
                className="h-10 px-4 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-xl text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Refresh Group Stats
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading political organization analytics...</p>
            </div>
          ) : creators.length > 0 ? (
            <>
              {/* Summary Cards */}
              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Card 1: Total Creators */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Total Creators</span>
                    <span className="text-xl font-black text-white mt-1 text-left">{metrics.totalCreators}</span>
                  </div>
                  {/* Card 2: Combined Subscribers */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Subscribers</span>
                    <span className="text-xl font-black text-indigo-400 mt-1 text-left">{formatNumber(metrics.combinedSubscribers)}</span>
                  </div>
                  {/* Card 3: Combined Views */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Combined Views</span>
                    <span className="text-xl font-black text-purple-400 mt-1 text-left">{formatNumber(metrics.combinedViews)}</span>
                  </div>
                  {/* Card 4: Avg Monthly Growth */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Avg Growth</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 text-left">+{metrics.avgMonthlyGrowth}%</span>
                  </div>
                  {/* Card 5: Total Videos */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Total Videos</span>
                    <span className="text-xl font-black text-slate-200 mt-1 text-left">{formatNumber(metrics.totalVideos)}</span>
                  </div>
                  {/* Card 6: Total Engagement */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-left">Avg Engagement</span>
                    <span className="text-xl font-black text-pink-400 mt-1 text-left">{metrics.avgEngagement}%</span>
                  </div>
                </div>
              )}

              {/* State and Performers Row */}
              {metrics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* State Distribution */}
                  <div className="bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 text-left">
                      <Globe size={12} className="text-indigo-400" />
                      State Distribution
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                      {Object.entries(metrics.stateDist).map(([st, count]) => (
                        <span key={st} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.02] border border-white/[0.06] text-slate-300">
                          {st}: <span className="text-indigo-400">{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Performers */}
                  <div className="lg:col-span-2 bg-[#121318]/40 border border-white/[0.06] rounded-2xl p-5 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Top Performer</span>
                      <span className="text-xs font-bold text-slate-200 block truncate">{metrics.topPerformer?.name || "N/A"}</span>
                      <span className="text-[10px] text-indigo-400 font-mono font-bold block">{formatNumber(metrics.topPerformer?.subscribers || 0)} subs</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Fastest Growing</span>
                      <span className="text-xs font-bold text-slate-200 block truncate">{metrics.fastestGrowing?.name || "N/A"}</span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold block">+{metrics.fastestGrowing?.growth || 0}%</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Most Viewed</span>
                      <span className="text-xs font-bold text-slate-200 block truncate">{metrics.mostViewed?.name || "N/A"}</span>
                      <span className="text-[10px] text-purple-400 font-mono font-bold block">{formatNumber(metrics.mostViewed?.totalViews || 0)} views</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Newest Added</span>
                      <span className="text-xs font-bold text-slate-200 block truncate">{metrics.newestAdded?.name || "N/A"}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{getRelativeTime(metrics.newestAdded?.lastSync)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Display list or card content */}
              <AnimatePresence mode="wait">
                {displayMode === "list" ? (
                  <motion.div
                    key="list-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="p-4">Name</th>
                            <th className="p-4">State</th>
                            <th className="p-4">Subscribers</th>
                            <th className="p-4">Total Views</th>
                            <th className="p-4">Videos</th>
                            <th className="p-4">Party</th>
                            <th className="p-4 text-right">Last Updated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {creators.map((creator) => (
                            <tr key={creator._id} className="hover:bg-white/[0.01] transition-colors text-xs">
                              <td className="p-4 font-bold text-slate-200">
                                <Link to={`/analyzer?url=${encodeURIComponent(creator.profileUrl || creator.accountId)}`} className="hover:text-indigo-400 transition-colors">
                                  {creator.name}
                                </Link>
                              </td>
                              <td className="p-4 text-slate-300">{creator.state || "Unknown State"}</td>
                              <td className="p-4 text-slate-300 font-mono">{formatNumber(creator.subscribers)}</td>
                              <td className="p-4 text-slate-300 font-mono">{formatNumber(creator.totalViews)}</td>
                              <td className="p-4 text-slate-300 font-mono">{formatNumber(creator.totalVideos)}</td>
                              <td className="p-4 text-indigo-400 font-bold">{creator.party || "Independent"}</td>
                              <td className="p-4 text-right text-slate-500">{getRelativeTime(creator.lastSync)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="card-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
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
                            {/* Creator Metadata & Group Selection */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                                  {(creator.profileImage || creator.thumbnail) ? (
                                    <img
                                      src={creator.profileImage || creator.thumbnail}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Award size={20} className="text-slate-500" />
                                  )}
                                </div>
                                <div className="min-w-0 text-left">
                                  <h3 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-indigo-400 transition-colors">
                                    {creator.name}
                                  </h3>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">
                                    {creator.state || "Unknown State"}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <select
                                  defaultValue={creator.group || groupName}
                                  onChange={(e) => handleGroupChange(e, creator._id)}
                                  className="bg-[#171923] border border-white/[0.08] text-[10px] text-slate-300 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
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

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4 border-t border-b border-white/[0.04] py-4 text-xs text-left">
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
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="text-center py-24 bg-[#121318]/20 border border-white/[0.06] border-dashed rounded-2xl space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Users size={28} className="text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-200">No {groupName.toUpperCase()} creators tracked yet</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Start tracking creators, ministers, and leaders belonging to the {groupName.toUpperCase()} group to view cumulative telemetry and performance indices.
                </p>
              </div>
              <Link to="/accounts" className="inline-block">
                <button className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-lg shadow-indigo-600/10 active:scale-[0.98] cursor-pointer">
                  Add Your First Creator
                </button>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
