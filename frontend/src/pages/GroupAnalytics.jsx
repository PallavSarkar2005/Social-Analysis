import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useParty, useAccounts } from "../hooks/useQueries";
import { getPartyTheme } from "../config/partyThemes";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { healGroupImageUrls } from "../api/groupApi";

import {
  Users, Eye, Video, TrendingUp, Clock, ArrowLeft,
  RefreshCw, Award, ChevronRight, Grid, List, Globe,
  Star, Zap, BarChart2, UserCheck, CalendarDays,
  TrendingDown, MapPin, Flame, Trash2, AlertTriangle, X,
} from "lucide-react";

// Reusable components
import StatCard from "../components/common/StatCard";
import LeaderHeader from "../components/common/LeaderHeader";
import CreatorCard from "../components/common/CreatorCard";
import LeaderAvatar from "../components/common/LeaderAvatar";
import PartyBadge from "../components/common/PartyBadge";

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

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} />;
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

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ creator, onConfirm, onCancel, isDeleting }) {
  return (
    <AnimatePresence>
      {creator && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="relative z-10 w-full max-w-md bg-[#0f1117] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Red accent top bar */}
            <div className="h-0.5 w-full bg-gradient-to-r from-red-600 via-red-500 to-transparent" />

            <div className="p-6 space-y-5">
              {/* Icon + Title */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Remove Creator?</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    This will permanently remove{" "}
                    <span className="text-white font-semibold">{creator.name}</span>{" "}
                    from your research group. This action cannot be undone.
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={onCancel}
                  className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Creator preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <LeaderAvatar creator={creator} size={40} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{creator.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin size={9} />
                    {creator.state || "Unknown State"}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-slate-300">{fmt(creator.subscribers)}</p>
                  <p className="text-[10px] text-slate-500">subscribers</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-slate-300 hover:bg-white/[0.07] transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isDeleting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  {isDeleting ? "Removing…" : "Yes, Remove"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Creator Row (list view) ──────────────────────────────────────────────────
function CreatorRow({ creator, theme, index, onGroupChange, onDelete }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
    >
      <td className="py-4 px-5">
        <div className="flex items-center gap-3">
          <LeaderAvatar creator={creator} size={38} />
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
      <td className="py-4 px-5">
        <button
          onClick={() => onDelete(creator)}
          title="Remove creator"
          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </motion.tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GroupAnalytics() {
  const { groupName } = useParams();
  const queryClient = useQueryClient();
  const { data: creators = [], isLoading: loading, refetch: loadCreators } = useParty(groupName);
  const { updateAccountGroup, deleteAccount, deleting } = useAccounts();

  const [displayMode, setDisplayMode] = useState(
    () => localStorage.getItem(`group-display-${groupName}`) || "card"
  );

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState(null); // creator object

  const theme = getPartyTheme(groupName);

  // ── Auto-heal mangled image URLs from old XSS sanitizer bug ─────────────
  const healedRef = useRef(false);
  useEffect(() => {
    if (healedRef.current) return;
    healedRef.current = true;
    healGroupImageUrls()
      .then((result) => {
        if (result.healed > 0) {
          // Some records were fixed — invalidate party caches so images refresh
          queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().startsWith("party") });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
        }
      })
      .catch(() => {
        // Silent — heal is a best-effort operation, not critical
      });
  }, []);
  // ────────────────────────────────────────────────────────────────────────

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

  const handleDeleteRequest = (creator) => {
    setPendingDelete(creator);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    const creatorName = pendingDelete.name;
    const creatorId = pendingDelete._id;
    try {
      await deleteAccount(creatorId);
      // Invalidate party-specific query key so the list re-fetches without the deleted item
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0]?.toString().startsWith("party") });
      toast.success(`${creatorName} removed from group.`);
    } catch {
      toast.error("Failed to remove creator.");
    } finally {
      setPendingDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setPendingDelete(null);
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
      { label: "Top Performer",    creator: metrics.topPerformer,    type: "topPerformer",    meta: `${fmt(metrics.topPerformer?.subscribers)} subs` },
      { label: "Fastest Growing",  creator: metrics.fastestGrowing,  type: "fastestGrowing",  meta: `+${metrics.fastestGrowing?.growth?.toFixed(1)}%` },
      { label: "Most Viewed",      creator: metrics.mostViewed,      type: "mostViewed",      meta: `${fmt(metrics.mostViewed?.totalViews)} views` },
      { label: "Most Engaged",     creator: metrics.mostEngaged,     type: "mostEngaged",     meta: `${metrics.mostEngaged?.engagementRate?.toFixed(1)}% eng.` },
      { label: "Highest Sub Gain", creator: metrics.highestSubGain,  type: "highestSubGain",  meta: `+${fmt(metrics.highestSubGain?.subscriberGain)}` },
      { label: "Highest View Gain",creator: metrics.highestViewGain, type: "highestViewGain", meta: `+${fmt(metrics.highestViewGain?.viewGain)}` },
      { label: "Recently Synced",  creator: metrics.newestAdded,     type: "recentlySynced",  meta: relTime(metrics.newestAdded?.lastSync) },
    ];
  }, [metrics]);

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans">
      <Toaster position="top-right" />
      <Sidebar />

      {/* ── Confirm Delete Modal ── */}
      <ConfirmDeleteModal
        creator={pendingDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={deleting}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">

          {/* ── Header ── */}
          <LeaderHeader
            groupName={groupName}
            fullName={theme.fullName}
            creatorCount={metrics?.n || 0}
            theme={theme}
            actions={
              <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-md">
                {/* View toggle */}
                <div className="flex bg-white/[0.02] border border-white/[0.06] rounded-xl p-0.5">
                  <button
                    onClick={() => handleDisplayModeChange("card")}
                    className={`p-2.5 rounded-lg transition-all ${displayMode === "card" ? "text-white shadow-lg shadow-black/20" : "text-slate-500 hover:text-white"}`}
                    style={displayMode === "card" ? { backgroundColor: theme.accent } : {}}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => handleDisplayModeChange("list")}
                    className={`p-2.5 rounded-lg transition-all ${displayMode === "list" ? "text-white shadow-lg shadow-black/20" : "text-slate-500 hover:text-white"}`}
                    style={displayMode === "list" ? { backgroundColor: theme.accent } : {}}
                  >
                    <List size={18} />
                  </button>
                </div>

                <button
                  onClick={() => loadCreators()}
                  disabled={loading}
                  className="h-11 px-5 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] active:scale-95 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            }
          />

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
                  <StatCard label="Creators"    value={metrics.n}                                           icon={Users}      type="default" />
                  <StatCard label="Subscribers" value={fmt(metrics.totalSubscribers)}                       icon={UserCheck}  type="default" />
                  <StatCard label="Total Views" value={fmt(metrics.totalViews)}                             icon={Eye}        type="default" />
                  <StatCard label="Videos"      value={fmt(metrics.totalVideos)}                            icon={Video}      type="default" />
                  <StatCard label="Avg Eng."    value={`${metrics.avgEngagement.toFixed(1)}%`}              icon={BarChart2}  type="default" />
                  <StatCard label="Avg Growth"  value={`${growthSign(metrics.avgGrowth)}${metrics.avgGrowth.toFixed(1)}%`}   icon={TrendingUp} type="fastestGrowing" />
                  <StatCard label="Weekly Avg"  value={`${growthSign(metrics.avgWeekly)}${metrics.avgWeekly.toFixed(1)}%`}   icon={Zap}        type="recentlySynced" />
                  <StatCard label="Monthly Avg" value={`${growthSign(metrics.avgMonthly)}${metrics.avgMonthly.toFixed(1)}%`} icon={CalendarDays} type="highestViewGain" />
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
                      {highlights.map(({ label, creator, type, meta }) => (
                        creator ? (
                          <StatCard
                            key={label}
                            label={label}
                            value={creator.name}
                            sub={meta}
                            type={type}
                            creator={creator}
                          />
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
                          actions={
                            <div className="flex items-center gap-2">
                              <select
                                value={creator.group || "Other"}
                                onChange={(e) => handleGroupChange(e, creator._id)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[9px] font-semibold bg-transparent border border-white/[0.06] rounded-lg px-1.5 py-0.5 text-slate-400 cursor-pointer focus:outline-none"
                              >
                                {["BJP", "Congress", "AAP", "BJD", "SP", "TMC", "Independent", "Other"].map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRequest(creator);
                                }}
                                title="Remove creator"
                                className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#111318]/60 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            {["Creator", "Subscribers", "Views", "Videos", "Growth", "Engagement", "Last Sync", "Group", ""].map((h) => (
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
                              onDelete={handleDeleteRequest}
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
