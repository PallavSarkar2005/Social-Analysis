import { useState, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useParty, useAccounts } from "../hooks/useQueries";
import { getPartyTheme } from "../config/partyThemes";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  Users, Eye, Video, TrendingUp, Clock, ArrowLeft,
  RefreshCw, Award, ChevronRight, Grid, List, Globe,
  Star, Zap, BarChart2, UserCheck, CalendarDays,
  TrendingDown, MapPin, Flame,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null || isNaN(n)) return "0";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
};

const relTime = (dateStr) => {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "Just now";
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const growthColor = (v) => {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-slate-400";
};

const growthSign = (v) => (v > 0 ? "+" : "");

// ─── Avatar ───────────────────────────────────────────────────────────────────
function CreatorAvatar({ creator, size = 40 }) {
  const src = creator.profileImage || creator.thumbnail || creator.profileUrl || "";
  const initials = (creator.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={creator.name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} />;
}

// ─── Summary metric card ──────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, color, theme }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-[#111318]/60 border ${theme.border} rounded-2xl p-5 space-y-2 overflow-hidden backdrop-blur-sm group transition-all hover:bg-[#13151e]/80`}
    >
      {/* Glow blob */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 30% 50%, ${theme.glowColor}, transparent 70%)` }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">{label}</span>
        {Icon && <Icon size={14} className={color || theme.text} />}
      </div>
      <p className={`text-3xl font-black tracking-tight leading-none ${color || theme.text}`}>{value}</p>
      {sub != null && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ─── State Distribution Bar ───────────────────────────────────────────────────
function StateBar({ state, count, total, theme }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-300 font-medium">{state}</span>
        <span className={`text-xs font-bold ${theme.text}`}>{count} creator{count !== 1 ? "s" : ""}</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accentLight})` }}
        />
      </div>
    </div>
  );
}

// ─── Creator Card (card view) ─────────────────────────────────────────────────
function CreatorCard({ creator, theme, onGroupChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={`relative bg-[#111318]/60 border ${theme.border} ${theme.borderHover} rounded-2xl p-5 space-y-4 overflow-hidden group transition-all backdrop-blur-sm`}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${theme.glowColor}, transparent 65%)` }}
      />

      {/* Top row */}
      <div className="flex items-start justify-between gap-3 relative">
        <div className="flex items-center gap-3">
          <CreatorAvatar creator={creator} size={48} />
          <div className="min-w-0">
            <p className="text-base font-bold text-white truncate">{creator.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${theme.badge}`}>
                {creator.party || "Independent"}
              </span>
              {creator.state && (
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <MapPin size={9} />{creator.state}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Growth badge */}
        <div className={`flex-shrink-0 text-xs font-bold flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg ${
          creator.growth > 0 ? "bg-emerald-500/10 text-emerald-400" :
          creator.growth < 0 ? "bg-red-500/10 text-red-400" : "bg-white/[0.04] text-slate-400"
        }`}>
          {creator.growth > 0 ? <TrendingUp size={10} /> : creator.growth < 0 ? <TrendingDown size={10} /> : null}
          {growthSign(creator.growth)}{creator.growth?.toFixed(1)}%
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Subscribers", val: fmt(creator.subscribers) },
          { label: "Total Views",  val: fmt(creator.totalViews) },
          { label: "Videos",       val: fmt(creator.totalVideos) },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white/[0.03] rounded-xl p-3 text-center">
            <p className={`text-base font-black ${theme.text}`}>{val}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Secondary row — engagement always colored & visible */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2.5">
          <span className="text-xs text-slate-400">Engagement</span>
          <span
            className="text-sm font-black"
            style={{ color: creator.engagementRate > 0 ? theme.accent : '#94a3b8' }}
          >
            {creator.engagementRate > 0 ? creator.engagementRate.toFixed(2) : '—'}%
          </span>
        </div>
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2.5">
          <span className="text-xs text-slate-400">Weekly ↑</span>
          <span className={`text-sm font-black ${growthColor(creator.weeklyGrowth)}`}>
            {growthSign(creator.weeklyGrowth)}{creator.weeklyGrowth?.toFixed(1) || '0.0'}%
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span className="text-[9px] text-slate-600 flex items-center gap-1">
          <Clock size={8} /> {relTime(creator.lastSync)}
        </span>

        <select
          value={creator.group || "Other"}
          onChange={(e) => onGroupChange(e, creator._id)}
          onClick={(e) => e.stopPropagation()}
          className="text-[9px] font-semibold bg-transparent border border-white/[0.06] rounded-lg px-1.5 py-0.5 text-slate-400 cursor-pointer focus:outline-none"
        >
          {["BJP", "Congress", "AAP", "BJD", "SP", "TMC", "Independent", "Other"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
    </motion.div>
  );
}

// ─── Creator Row (list view) ──────────────────────────────────────────────────
function CreatorRow({ creator, theme, index, onGroupChange }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
    >
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <CreatorAvatar creator={creator} size={38} />
          <div>
            <p className="text-sm font-semibold text-white">{creator.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin size={9} />{creator.state || "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-5 text-right">
        <span className={`text-sm font-bold ${theme.text}`}>{fmt(creator.subscribers)}</span>
      </td>
      <td className="py-4 px-5 text-right">
        <span className="text-sm text-slate-300">{fmt(creator.totalViews)}</span>
      </td>
      <td className="py-4 px-5 text-right">
        <span className="text-sm text-slate-300">{fmt(creator.totalVideos)}</span>
      </td>
      <td className="py-4 px-5 text-right">
        <span className={`text-sm font-bold ${growthColor(creator.growth)}`}>
          {growthSign(creator.growth)}{creator.growth?.toFixed(1)}%
        </span>
      </td>
      <td className="py-4 px-5 text-right">
        <span
          className="text-sm font-bold"
          style={{ color: creator.engagementRate > 0 ? theme.accent : '#94a3b8' }}
        >
          {creator.engagementRate > 0 ? `${creator.engagementRate.toFixed(2)}%` : '—'}
        </span>
      </td>
      <td className="py-4 px-5 text-right">
        <span className="text-xs text-slate-500">{relTime(creator.lastSync)}</span>
      </td>
      <td className="py-4 px-5">
        <select
          value={creator.group || "Other"}
          onChange={(e) => onGroupChange(e, creator._id)}
          className="text-xs bg-transparent border border-white/[0.06] rounded-lg px-2 py-0.5 text-slate-400"
        >
          {["BJP", "Congress", "AAP", "BJD", "SP", "TMC", "Independent", "Other"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </td>
    </motion.tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GroupAnalytics() {
  const { groupName } = useParams();
  const { data: creators = [], isLoading: loading, refetch: loadCreators } = useParty(groupName);
  const { updateAccountGroup } = useAccounts();

  const [displayMode, setDisplayMode] = useState(
    () => localStorage.getItem(`group-display-${groupName}`) || "card"
  );

  const theme = getPartyTheme(groupName);

  const handleGroupChange = async (e, creatorId) => {
    const newGroup = e.target.value;
    try {
      toast.loading("Updating group…", { id: `grp-${creatorId}` });
      await updateAccountGroup({ id: creatorId, group: newGroup });
      toast.success("Group updated!", { id: `grp-${creatorId}` });
    } catch {
      toast.error("Failed to update group.", { id: `grp-${creatorId}` });
    }
  };

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem(`group-display-${groupName}`, mode);
  };

  // ── Computed metrics ─────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (!creators || creators.length === 0) return null;

    const n = creators.length;
    const totalSubscribers = creators.reduce((s, c) => s + (c.subscribers || 0), 0);
    const totalViews       = creators.reduce((s, c) => s + (c.totalViews || 0), 0);
    const totalVideos      = creators.reduce((s, c) => s + (c.totalVideos || 0), 0);
    const avgEngagement    = creators.reduce((s, c) => s + (parseFloat(c.engagementRate) || 0), 0) / n;
    const avgGrowth        = creators.reduce((s, c) => s + (c.growth || 0), 0) / n;
    const avgWeekly        = creators.reduce((s, c) => s + (c.weeklyGrowth || 0), 0) / n;
    const avgMonthly       = creators.reduce((s, c) => s + (c.monthlyGrowth || 0), 0) / n;

    // State distribution
    const stateDist = {};
    creators.forEach((c) => {
      const st = c.state || "Unknown";
      stateDist[st] = (stateDist[st] || 0) + 1;
    });

    // Highlights
    const pick = (arr, key, higher = true) =>
      arr.reduce((best, c) =>
        higher
          ? (c[key] || 0) > (best[key] || 0) ? c : best
          : (c[key] || 0) < (best[key] || 0) ? c : best
      , arr[0]);

    const topPerformer    = pick(creators, "subscribers");
    const fastestGrowing  = pick(creators, "growth");
    const mostViewed      = pick(creators, "totalViews");
    const mostEngaged     = pick(creators, "engagementRate");
    const highestSubGain  = pick(creators, "subscriberGain");
    const highestViewGain = pick(creators, "viewGain");
    const newestAdded     = creators.reduce((a, b) =>
      new Date(a.lastSync || 0) > new Date(b.lastSync || 0) ? a : b
    , creators[0]);

    return {
      n, totalSubscribers, totalViews, totalVideos,
      avgEngagement, avgGrowth, avgWeekly, avgMonthly,
      stateDist,
      topPerformer, fastestGrowing, mostViewed, mostEngaged,
      highestSubGain, highestViewGain, newestAdded,
    };
  }, [creators]);

  // ── Sort states by count desc ────────────────────────────────────────────
  const sortedStates = useMemo(() => {
    if (!metrics?.stateDist) return [];
    return Object.entries(metrics.stateDist).sort((a, b) => b[1] - a[1]);
  }, [metrics]);

  const highlights = useMemo(() => {
    if (!metrics) return [];
    return [
      { label: "Top Performer",    creator: metrics.topPerformer,    icon: Star,      meta: `${fmt(metrics.topPerformer?.subscribers)} subs` },
      { label: "Fastest Growing",  creator: metrics.fastestGrowing,  icon: TrendingUp, meta: `+${metrics.fastestGrowing?.growth?.toFixed(1)}%` },
      { label: "Most Viewed",      creator: metrics.mostViewed,      icon: Eye,       meta: `${fmt(metrics.mostViewed?.totalViews)} views` },
      { label: "Most Engaged",     creator: metrics.mostEngaged,     icon: Flame,     meta: `${metrics.mostEngaged?.engagementRate?.toFixed(1)}% eng.` },
      { label: "Highest Sub Gain", creator: metrics.highestSubGain,  icon: UserCheck, meta: `+${fmt(metrics.highestSubGain?.subscriberGain)}` },
      { label: "Highest View Gain",creator: metrics.highestViewGain, icon: BarChart2, meta: `+${fmt(metrics.highestViewGain?.viewGain)}` },
      { label: "Recently Synced",  creator: metrics.newestAdded,     icon: CalendarDays, meta: relTime(metrics.newestAdded?.lastSync) },
    ];
  }, [metrics]);

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">

          {/* ── Header ── */}
          <div
            className="relative rounded-3xl overflow-hidden p-6 sm:p-8 border border-white/[0.06]"
            style={{ background: `linear-gradient(135deg, ${theme.glowColor} 0%, transparent 60%), #0d0e14` }}
          >
            {/* Decorative watermark */}
            <div className="absolute right-6 top-4 text-6xl opacity-[0.06] select-none pointer-events-none">
              {theme.watermark}
            </div>

            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition mb-4">
              <ArrowLeft size={12} /> Back to Dashboard
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${theme.badge}`}>
                    {groupName}
                  </span>
                  {metrics && (
                    <span className="text-xs text-slate-500 font-medium">
                      {metrics.n} creator{metrics.n !== 1 ? "s" : ""} tracked
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {theme.fullName} Analytics
                </h1>
                <p className="text-sm text-slate-400">
                  Live performance data for all tracked {theme.fullName} political creators.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* View toggle */}
                <div className="flex bg-white/[0.03] border border-white/[0.08] rounded-xl p-0.5">
                  <button
                    onClick={() => handleDisplayModeChange("card")}
                    className={`p-1.5 rounded-lg transition ${displayMode === "card" ? "text-white" : "text-slate-500 hover:text-white"}`}
                    style={displayMode === "card" ? { backgroundColor: theme.accent } : {}}
                  ><Grid size={13} /></button>
                  <button
                    onClick={() => handleDisplayModeChange("list")}
                    className={`p-1.5 rounded-lg transition ${displayMode === "list" ? "text-white" : "text-slate-500 hover:text-white"}`}
                    style={displayMode === "list" ? { backgroundColor: theme.accent } : {}}
                  ><List size={13} /></button>
                </div>

                <button
                  onClick={() => loadCreators()}
                  disabled={loading}
                  className="h-9 px-4 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-xl text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* ── Loading State ── */}
          {loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64" />
                ))}
              </div>
            </div>
          )}

          {/* ── Empty State ── */}
          {!loading && creators.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
                style={{ background: `${theme.glowColor}`, border: `1px solid ${theme.accent}33` }}
              >
                {theme.watermark}
              </div>
              <h2 className="text-xl font-bold text-white">No creators in {theme.fullName} yet</h2>
              <p className="text-sm text-slate-400 max-w-sm text-center">
                Use the Analyzer to track a channel and assign it to the {theme.fullName} group.
              </p>
              <Link
                to="/analyzer"
                className="h-10 px-6 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition"
                style={{ background: theme.accent, boxShadow: `0 0 20px ${theme.glowColor}` }}
              >
                <TrendingUp size={14} /> Go to Analyzer
              </Link>
            </div>
          )}

          {!loading && creators.length > 0 && metrics && (
            <AnimatePresence mode="wait">
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >

                {/* ── 8 Summary Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  <MetricCard label="Creators"    value={metrics.n}                                           icon={Users}      theme={theme} />
                  <MetricCard label="Subscribers" value={fmt(metrics.totalSubscribers)}                       icon={UserCheck}  theme={theme} />
                  <MetricCard label="Total Views" value={fmt(metrics.totalViews)}                             icon={Eye}        theme={theme} />
                  <MetricCard label="Videos"      value={fmt(metrics.totalVideos)}                            icon={Video}      theme={theme} />
                  <MetricCard label="Avg Eng."    value={`${metrics.avgEngagement.toFixed(1)}%`}              icon={BarChart2}  theme={theme} />
                  <MetricCard label="Avg Growth"  value={`${growthSign(metrics.avgGrowth)}${metrics.avgGrowth.toFixed(1)}%`}   icon={TrendingUp} color={growthColor(metrics.avgGrowth)} theme={theme} />
                  <MetricCard label="Weekly Avg"  value={`${growthSign(metrics.avgWeekly)}${metrics.avgWeekly.toFixed(1)}%`}   icon={Zap}        color={growthColor(metrics.avgWeekly)} theme={theme} />
                  <MetricCard label="Monthly Avg" value={`${growthSign(metrics.avgMonthly)}${metrics.avgMonthly.toFixed(1)}%`} icon={CalendarDays} color={growthColor(metrics.avgMonthly)} theme={theme} />
                </div>

                {/* ── State Distribution + Performance Highlights ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* State Distribution */}
                  <div className="lg:col-span-1 bg-[#111318]/60 border border-white/[0.06] rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Globe size={11} /> State Distribution
                      </h2>
                      <span className={`text-[10px] font-bold ${theme.text}`}>
                        {sortedStates.length} state{sortedStates.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {sortedStates.length > 0 ? sortedStates.map(([state, count]) => (
                        <StateBar key={state} state={state} count={count} total={metrics.n} theme={theme} />
                      )) : (
                        <p className="text-xs text-slate-500 italic">No state data available.</p>
                      )}
                    </div>
                  </div>

                  {/* Performance Highlights */}
                  <div className="lg:col-span-2 bg-[#111318]/60 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                      <Award size={11} /> Performance Highlights
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {highlights.map(({ label, creator, icon: Icon, meta }) => (
                        creator ? (
                          <div
                            key={label}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${theme.border} ${theme.bgHover} transition-all group`}
                            style={{ background: `${theme.glowColor}` }}
                          >
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: `${theme.accent}22` }}
                            >
                              <Icon size={13} style={{ color: theme.accent }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</p>
                              <p className="text-xs font-bold text-white truncate">{creator.name}</p>
                              <p className="text-[10px]" style={{ color: theme.accent }}>{meta}</p>
                            </div>
                            <CreatorAvatar creator={creator} size={28} />
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Creator Grid / Table ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users size={14} className={theme.text} />
                      All Creators
                      <span className="text-xs text-slate-500 font-normal">({metrics.n})</span>
                    </h2>
                  </div>

                  {displayMode === "card" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {creators.map((creator) => (
                        <CreatorCard
                          key={creator._id}
                          creator={creator}
                          theme={theme}
                          onGroupChange={handleGroupChange}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#111318]/60 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            {["Creator", "Subscribers", "Views", "Videos", "Growth", "Engagement", "Last Sync", "Group"].map((h) => (
                              <th key={h} className="text-left py-3 px-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {creators.map((creator, i) => (
                            <CreatorRow
                              key={creator._id}
                              creator={creator}
                              theme={theme}
                              index={i}
                              onGroupChange={handleGroupChange}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </motion.div>
            </AnimatePresence>
          )}

        </main>
      </div>
    </div>
  );
}
