import { Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useDashboard } from "../hooks/useQueries";
import { devError } from "../utils/devLog";
import {
  Users,
  Eye,
  Percent,
  Plus,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Activity,
  Clock,
  Database,
  Layers,
  Radio,
} from "lucide-react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import PartyLogo from "../components/common/PartyLogo";
import {
  asArray,
  formatLocaleNumber,
  hasGrowthMetrics,
  formatGrowthPeriod,
  asNumber,
} from "../utils/safeData";
import { formatIndianDateTime } from "../utils/dateFormatter";

function GrowthDelta({ growth }) {
  if (!hasGrowthMetrics(growth)) return null;

  const week = formatGrowthPeriod(growth?.lastWeek, "Wk");
  const month = formatGrowthPeriod(growth?.lastMonth, "Mo");

  return (
    <div className="flex flex-col text-[10px] space-y-0.5 mt-1.5 border-t border-white/[0.04] pt-1.5">
      {week && (
        <span className={week.positive ? "text-emerald-400" : "text-rose-400"}>
          {week.label}: {week.text}
        </span>
      )}
      {month && (
        <span className={month.positive ? "text-emerald-400" : "text-rose-400"}>
          {month.label}: {month.text}
        </span>
      )}
    </div>
  );
}

function AnimatedValue({ value, suffix = "" }) {
  const display =
    typeof value === "number" && Number.isFinite(value)
      ? formatLocaleNumber(value)
      : value;

  return (
    <motion.span
      key={String(display)}
      initial={{ opacity: 0.35, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="tabular-nums"
    >
      {display}
      {suffix}
    </motion.span>
  );
}

function relativeTime(dateLike) {
  if (!dateLike) return null;
  const t = new Date(dateLike).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const {
    overview,
    groups: activeGroups = [],
    compareAccounts: accounts = [],
    loading,
    syncAll,
    syncing,
  } = useDashboard();

  const groupList = asArray(activeGroups);
  const accountList = asArray(accounts);
  const engineAccounts = asArray(overview?.accounts);

  const recentlyUpdated = [...engineAccounts]
    .filter((a) => a?.capturedAt)
    .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
    .slice(0, 6);

  const lastRefreshAt = recentlyUpdated[0]?.capturedAt || null;
  const profilesWithSnapshots = engineAccounts.length;
  const indexedCount = asNumber(overview?.totalAccounts, 0);
  const coveragePct =
    indexedCount > 0
      ? Math.round((profilesWithSnapshots / indexedCount) * 100)
      : null;

  const getGroupCount = (groupId) => {
    if (!groupId) return 0;
    const match = groupList.find(
      (g) => g?._id && String(g._id).trim().toLowerCase() === groupId.toLowerCase()
    );
    return asNumber(match?.count, 0);
  };

  const handleSyncAll = async () => {
    try {
      toast.loading("Syncing all active nodes with YouTube APIs...", {
        id: "sync",
      });
      await syncAll();
      toast.success("All channels synced successfully!", { id: "sync" });
    } catch (error) {
      devError(error);
      toast.error("Batch sync request failed.", { id: "sync" });
    }
  };

  const kpiCards = [
    {
      title: "Indexed Creators",
      numeric: asNumber(overview?.totalAccounts, 0),
      display: null,
      icon: Users,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      growth: null,
    },
    {
      title: "Total Subscribers",
      numeric: asNumber(
        overview?.growth?.subscribers?.current ?? overview?.totalFollowers,
        0
      ),
      display: null,
      icon: TrendingUp,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      growth: overview?.growth?.subscribers,
    },
    {
      title: "Total Video Views",
      numeric: asNumber(
        overview?.growth?.views?.current ?? overview?.totalViews,
        0
      ),
      display: null,
      icon: Eye,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
      growth: overview?.growth?.views,
    },
    {
      title: "Avg Engagement Rate",
      numeric: null,
      display: `${overview?.growth?.engagement?.current ?? overview?.avgEngagement ?? 0}%`,
      icon: Percent,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      growth: overview?.growth?.engagement,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#111319",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 z-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-white">Executive </span>
                <span className="text-indigo-400">Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Platform control center — KPIs, sync status, and recent indexed activity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAll}
                disabled={syncing || loading}
                className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={syncing ? "animate-spin text-indigo-400" : ""}
                />
                Batch Sync Channels
              </button>
              <Link to="/analyzer">
                <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/10">
                  <Plus size={14} />
                  Analyze Creator
                </button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse"
                  />
                ))}
              </div>
              <div className="h-56 bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpiCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -2 }}
                      className="bg-[#121318]/50 backdrop-blur-md rounded-2xl border border-white/[0.06] p-4 sm:p-5 shadow-xl flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                          {card.title}
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                          {card.display != null ? (
                            <AnimatedValue value={card.display} />
                          ) : (
                            <AnimatedValue value={card.numeric} />
                          )}
                        </h3>
                        {hasGrowthMetrics(card.growth) && (
                          <GrowthDelta growth={card.growth} />
                        )}
                      </div>
                      <div
                        className={`w-10 h-10 rounded-xl border shrink-0 flex items-center justify-center ${card.color}`}
                      >
                        <Icon size={18} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Operational status row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Clock size={14} className="text-indigo-400" />
                    Last Analytics Refresh
                  </div>
                  {lastRefreshAt ? (
                    <>
                      <p className="text-lg font-bold text-white">
                        {relativeTime(lastRefreshAt)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatIndianDateTime(lastRefreshAt)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Insufficient verified data — no analytics snapshots yet.
                    </p>
                  )}
                </div>

                <div className="bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Database size={14} className="text-emerald-400" />
                    Snapshot Coverage
                  </div>
                  <p className="text-lg font-bold text-white">
                    {profilesWithSnapshots}
                    <span className="text-slate-500 font-medium text-sm">
                      {" "}
                      / {indexedCount} profiles
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {coveragePct != null
                      ? `${coveragePct}% of indexed creators have verified AnalyticsSnapshots`
                      : "Index creators to begin snapshot coverage."}
                  </p>
                </div>

                <div className="bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Radio size={14} className="text-amber-400" />
                    Synchronization Status
                  </div>
                  <p className="text-lg font-bold text-white flex items-center gap-2">
                    {syncing ? (
                      <>
                        <RefreshCw size={16} className="animate-spin text-indigo-400" />
                        Syncing…
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Idle / ready
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {asNumber(overview?.totalVideos, 0).toLocaleString()} tracked
                    video records ·{" "}
                    {groupList.length} organization groups
                  </p>
                </div>
              </div>

              {/* Recent activity + quick actions */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <Activity size={14} className="text-indigo-400" />
                        Recently Updated Profiles
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Latest verified analytics captures from AnalyticsEngine.
                      </p>
                    </div>
                    <Link
                      to="/history"
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                    >
                      Snapshot History
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  {recentlyUpdated.length > 0 ? (
                    <ul className="divide-y divide-white/[0.04] border border-white/[0.05] rounded-xl overflow-hidden">
                      {recentlyUpdated.map((row) => (
                        <li key={String(row.accountId)}>
                          <Link
                            to={`/profile/${row.accountId}`}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {row.name || "Unnamed profile"}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                                {row.platform || "youtube"}
                                {row.subscribers != null
                                  ? ` · ${formatLocaleNumber(row.subscribers)} subs`
                                  : ""}
                                {row.influenceScore != null
                                  ? ` · influence ${row.influenceScore}`
                                  : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[11px] font-medium text-slate-300">
                                {relativeTime(row.capturedAt)}
                              </p>
                              <p className="text-[9px] text-slate-600 mt-0.5">
                                Verified snapshot
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-4 py-8 text-center">
                      <p className="text-sm text-slate-400">
                        Insufficient verified data
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Analyze a creator or run batch sync to capture the first analytics snapshots.
                      </p>
                      <Link to="/analyzer" className="inline-block mt-4">
                        <button className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition">
                          Analyze Creator
                        </button>
                      </Link>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <Sparkles size={14} className="text-purple-400" />
                    Quick Actions
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        title: "Run Analyzer",
                        desc: "Index a new political creator",
                        path: "/analyzer",
                      },
                      {
                        title: "Creator Compare",
                        desc: "Side-by-side channel metrics",
                        path: "/compare",
                      },
                      {
                        title: "Snapshot History",
                        desc: "Telemetry & verified captures",
                        path: "/history",
                      },
                      {
                        title: "Intelligence Hub",
                        desc: "Reports and dossier exports",
                        path: "/reports",
                      },
                    ].map((act) => (
                      <Link key={act.path} to={act.path} className="block group">
                        <div className="p-3 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] rounded-xl flex items-center justify-between transition">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">
                              {act.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {act.desc}
                            </p>
                          </div>
                          <ArrowRight
                            size={14}
                            className="text-slate-500 group-hover:text-white transition group-hover:translate-x-1"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Political organizations */}
              <div className="bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                    <Layers size={14} />
                    Political Organizations
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                    Explore tracked leaders by organization — counts are live from your index.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[
                    {
                      id: "BJP",
                      path: "/groups/BJP",
                      hover: "hover:border-orange-500/30 hover:bg-orange-950/5",
                      accent: "text-orange-400",
                      desc: "Bharatiya Janata Party — ministers, speakers, and official creators.",
                    },
                    {
                      id: "Congress",
                      path: "/groups/Congress",
                      hover: "hover:border-cyan-500/30 hover:bg-cyan-950/5",
                      accent: "text-cyan-400",
                      desc: "Indian National Congress — leaders and spokespersons.",
                    },
                    {
                      id: "Other",
                      path: "/groups/Other",
                      hover: "hover:border-indigo-500/30 hover:bg-indigo-950/5",
                      accent: "text-indigo-400",
                      desc: "Independent or uncategorized tracked creators.",
                    },
                  ].map((org) => (
                    <Link key={org.id} to={org.path} className="block group">
                      <div
                        className={`p-5 bg-[#171923]/45 border border-white/[0.05] ${org.hover} rounded-2xl flex flex-col justify-between min-h-[9.5rem] transition duration-300`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-white transition-colors">
                              {org.id}
                            </h4>
                            <p className={`text-[10px] ${org.accent} font-bold mt-1`}>
                              {getGroupCount(org.id)}{" "}
                              {getGroupCount(org.id) === 1 ? "Account" : "Accounts"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-[200px]">
                              {org.desc}
                            </p>
                          </div>
                          <PartyLogo
                            party={org.id}
                            size={48}
                            className="shadow-lg border-white/[0.04] shrink-0"
                          />
                        </div>
                        <span
                          className={`text-[10px] font-bold ${org.accent} flex items-center gap-1 mt-3`}
                        >
                          Explore Analytics{" "}
                          <ArrowRight
                            size={10}
                            className="group-hover:translate-x-0.5 transition-transform"
                          />
                        </span>
                      </div>
                    </Link>
                  ))}

                  {groupList
                    .filter(
                      (g) =>
                        g?._id &&
                        !["bjp", "congress", "other"].includes(
                          String(g._id).toLowerCase()
                        )
                    )
                    .map((g) => (
                      <Link
                        key={g._id}
                        to={`/groups/${encodeURIComponent(g._id)}`}
                        className="block group"
                      >
                        <div className="p-5 bg-[#171923]/45 border border-white/[0.05] hover:border-indigo-500/30 hover:bg-indigo-950/5 rounded-2xl flex flex-col justify-between min-h-[9.5rem] transition duration-300">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase">
                                {g._id}
                              </h4>
                              <p className="text-[10px] text-indigo-400/90 font-bold mt-1">
                                {asNumber(g.count, 0)}{" "}
                                {asNumber(g.count, 0) === 1 ? "Account" : "Accounts"}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-[200px]">
                                Tracked members of {String(g._id).toUpperCase()}.
                              </p>
                            </div>
                            <PartyLogo
                              party={g._id}
                              size={48}
                              className="shadow-lg border-white/[0.04] shrink-0"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 mt-3">
                            Explore Analytics{" "}
                            <ArrowRight
                              size={10}
                              className="group-hover:translate-x-0.5 transition-transform"
                            />
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>

              {/* Active index matrix */}
              <div className="bg-[#121318]/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Active Index Matrix
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Live comparison values from AnalyticsEngine for indexed profiles.
                    </p>
                  </div>
                  <Link
                    to="/compare"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 shrink-0"
                  >
                    Open Compare
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {accountList.length > 0 ? (
                  <div className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="p-4">Profile</th>
                            <th className="p-4">Subscribers</th>
                            <th className="p-4">Total Views</th>
                            <th className="p-4">Party</th>
                            <th className="p-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {accountList.map((acc, idx) => (
                            <tr
                              key={acc?._id || acc?.accountId || `account-${idx}`}
                              className="hover:bg-white/[0.01] transition-colors text-xs"
                            >
                              <td className="p-4 font-bold text-slate-200">
                                <Link
                                  to={`/profile/${acc?._id || acc?.accountId || ""}`}
                                  className="hover:text-indigo-400 hover:underline cursor-pointer transition"
                                >
                                  {acc?.name || "Unnamed Creator"}
                                </Link>
                              </td>
                              <td className="p-4 text-slate-300 tabular-nums">
                                {acc?.followers != null || acc?.subscribers != null
                                  ? formatLocaleNumber(
                                      acc?.followers ?? acc?.subscribers
                                    )
                                  : "—"}
                              </td>
                              <td className="p-4 text-slate-300 tabular-nums">
                                {acc?.totalViews != null || acc?.views != null
                                  ? formatLocaleNumber(acc?.totalViews ?? acc?.views)
                                  : "—"}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <PartyLogo
                                    party={acc?.party}
                                    size={22}
                                    className="shadow-sm"
                                  />
                                  <span className="font-semibold text-slate-200">
                                    {acc?.party || "Independent"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  ● Tracking
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-white/[0.01] border border-white/[0.05] border-dashed rounded-xl space-y-3">
                    <p className="text-xs text-slate-400">No creators indexed yet.</p>
                    <Link to="/analyzer">
                      <button className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition">
                        Analyze First Creator
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
