import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useDashboard } from "../hooks/useQueries";
import {
  Users,
  Eye,
  Percent,
  Video,
  Plus,
  Sparkles,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import PartyLogo from "../components/common/PartyLogo";


export default function Dashboard() {
  const {
    overview,
    groups: activeGroups,
    topContent,
    compareAccounts: accounts,
    loading,
    syncAll,
    syncing,
  } = useDashboard();

  const getGroupCount = (groupId) => {
    if (!activeGroups) return 0;
    const match = activeGroups.find(
      (g) => g._id && g._id.trim().toLowerCase() === groupId.toLowerCase()
    );
    return match ? match.count : 0;
  };

  const handleSyncAll = async () => {
    try {
      toast.loading("Syncing all active nodes with YouTube APIs...", {
        id: "sync",
      });
      await syncAll();
      toast.success("All channels synced successfully!", { id: "sync" });
    } catch (error) {
      console.error(error);
      toast.error("Batch sync request failed.", { id: "sync" });
    }
  };

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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          {/* Header & Quick Sync */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="text-white">Profile </span>
                <span className="text-indigo-400">Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Real-time cross-platform metrics distribution and node index
                statistics.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAll}
                disabled={syncing || loading}
                className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2"
              >
                <RefreshCw
                  size={14}
                  className={syncing ? "animate-spin text-indigo-400" : ""}
                />
                Batch Sync Nodes
              </button>
              <Link to="/accounts">
                <button className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/10">
                  <Plus size={14} />
                  Add Node
                </button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-[#121318]/40 border border-white/[0.06] rounded-xl"
                  />
                ))}
              </div>
              <div className="h-80 bg-[#121318]/40 border border-white/[0.06] rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: "Tracked Nodes",
                    value: overview?.totalAccounts || 0,
                    icon: Users,
                    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                    growth: null,
                  },
                  {
                    title: "Total Subscribers",
                    value: Number(
                      overview?.growth?.subscribers?.current ??
                        overview?.totalFollowers ??
                        0,
                    ).toLocaleString(),
                    icon: TrendingUp,
                    color:
                      "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                    growth: overview?.growth?.subscribers,
                  },
                  {
                    title: "Total Video Views",
                    value: Number(
                      overview?.growth?.views?.current ??
                        overview?.totalViews ??
                        0,
                    ).toLocaleString(),
                    icon: Eye,
                    color:
                      "text-purple-400 bg-purple-500/10 border-purple-500/20",
                    growth: overview?.growth?.views,
                  },
                  {
                    title: "Avg Engagement Rate",
                    value: `${overview?.growth?.engagement?.current ?? overview?.avgEngagement ?? 0}%`,
                    icon: Percent,
                    color: "text-pink-400 bg-pink-500/10 border-pink-500/20",
                    growth: overview?.growth?.engagement,
                  },
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -2 }}
                      className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-xl flex items-center justify-between"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                          {card.title}
                        </p>
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                          {card.value}
                        </h3>
                        {card.growth && (
                          <div className="flex flex-col text-[10px] space-y-0.5 mt-1 border-t border-white/[0.04] pt-1">
                            <span
                              className={
                                card.growth.lastWeek.value >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              Wk: {card.growth.lastWeek.value >= 0 ? "+" : ""}
                              {card.growth.lastWeek.value.toLocaleString()} (
                              {card.growth.lastWeek.percentage}%)
                            </span>
                            <span
                              className={
                                card.growth.lastMonth.value >= 0
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }
                            >
                              Mo: {card.growth.lastMonth.value >= 0 ? "+" : ""}
                              {card.growth.lastMonth.value.toLocaleString()} (
                              {card.growth.lastMonth.percentage}%)
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-xl border shrink-0 ml-4 ${card.color}`}
                      >
                        <Icon size={18} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Quick Actions Panel & Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1 bg-[#121318]/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                    <Sparkles size={14} className="text-purple-400" />
                    Quick Actions Panel
                  </div>
                  <div className="space-y-2.5">
                    {[
                      {
                        title: "Run Analyzer",
                        desc: "Audit single profile links via AI",
                        path: "/analyzer",
                      },
                      {
                        title: "Competitor Comparison",
                        desc: "Compare handles side-by-side",
                        path: "/compare",
                      },
                      {
                        title: "Verify Audit Trail",
                        desc: "View detailed capture tables",
                        path: "/history",
                      },
                      {
                        title: "Settings Engine",
                        desc: "Configure session variables",
                        path: "/settings",
                      },
                    ].map((act, i) => (
                      <Link key={i} to={act.path} className="block group">
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

                {/* Research Groups Section */}
                <div className="lg:col-span-2 bg-[#121318]/45 border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                      <Sparkles size={14} className="text-indigo-400 animate-pulse" />
                      Research Groups
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 leading-normal">
                      Select a political organization to explore analytics of all tracked leaders, spokespersons, ministers and official creators.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Render BJP Card */}
                    <Link to="/groups/BJP" className="block group">
                      <div className="p-5 bg-[#171923]/45 border border-white/[0.05] hover:border-orange-500/30 hover:bg-orange-950/5 hover:shadow-orange-500/[0.04] hover:shadow-2xl rounded-2xl flex flex-col justify-between h-44 transition duration-300 relative overflow-hidden select-none cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">BJP Group</h4>
                            <p className="text-[10px] text-orange-400/90 font-bold mt-1">
                              {getGroupCount("BJP")} {getGroupCount("BJP") === 1 ? "Account" : "Accounts"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[170px]">
                              Bharatiya Janata Party (BJP) - Explore statistics, tracked ministers, and key speakers.
                            </p>
                          </div>
                          <PartyLogo party="BJP" size={56} className="shadow-lg border-white/[0.04] shrink-0" />
                        </div>
                        <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                          Explore Analytics <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>

                    {/* Render Congress Card */}
                    <Link to="/groups/Congress" className="block group">
                      <div className="p-5 bg-[#171923]/45 border border-white/[0.05] hover:border-cyan-500/30 hover:bg-cyan-950/5 hover:shadow-cyan-500/[0.04] hover:shadow-2xl rounded-2xl flex flex-col justify-between h-44 transition duration-300 relative overflow-hidden select-none cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Congress Group</h4>
                            <p className="text-[10px] text-cyan-400/90 font-bold mt-1">
                              {getGroupCount("Congress")} {getGroupCount("Congress") === 1 ? "Account" : "Accounts"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[170px]">
                              Indian National Congress (INC) - Explore statistics, tracked leaders, and spokespersons.
                            </p>
                          </div>
                          <PartyLogo party="Congress" size={56} className="shadow-lg border-white/[0.04] shrink-0" />
                        </div>
                        <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                          Explore Analytics <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>

                    {/* Render Other Card */}
                    <Link to="/groups/Other" className="block group">
                      <div className="p-5 bg-[#171923]/45 border border-white/[0.05] hover:border-indigo-500/30 hover:bg-indigo-950/5 hover:shadow-indigo-500/[0.04] hover:shadow-2xl rounded-2xl flex flex-col justify-between h-44 transition duration-300 relative overflow-hidden select-none cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Other Group</h4>
                            <p className="text-[10px] text-indigo-400/90 font-bold mt-1">
                              {getGroupCount("Other")} {getGroupCount("Other") === 1 ? "Account" : "Accounts"}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[170px]">
                              Independent, other, or uncategorized tracked creators and channels.
                            </p>
                          </div>
                          <PartyLogo party="Other" size={56} className="shadow-lg border-white/[0.04] shrink-0" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                          Explore Analytics <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </Link>

                    {/* Render Dynamic groups from database (AAP, TMC, etc.) */}
                    {activeGroups
                      .filter(g => g._id && g._id.toLowerCase() !== "bjp" && g._id.toLowerCase() !== "congress" && g._id.toLowerCase() !== "other")
                      .map((g) => (
                        <Link key={g._id} to={`/groups/${g._id}`} className="block group">
                          <div className="p-5 bg-[#171923]/45 border border-white/[0.05] hover:border-indigo-500/30 hover:bg-indigo-950/5 hover:shadow-indigo-500/[0.04] hover:shadow-2xl rounded-2xl flex flex-col justify-between h-44 transition duration-300 relative overflow-hidden select-none cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase">{g._id} Group</h4>
                                <p className="text-[10px] text-indigo-400/90 font-bold mt-1">
                                  {g.count} {g.count === 1 ? "Account" : "Accounts"}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed max-w-[170px]">
                                  Explore analytics for tracked members, ministers, and leaders of the {g._id.toUpperCase()} organization.
                                </p>
                              </div>
                              <PartyLogo party={g._id} size={56} className="shadow-lg border-white/[0.04] shrink-0" />
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                              Explore Analytics <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              </div>

              {/* Tracked Nodes Comparison Table */}
              <div className="bg-[#121318]/40 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Active Index Matrix
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time comparison values of all tracked social nodes.
                    </p>
                  </div>
                  <Link
                    to="/accounts"
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Manage Accounts
                    <ArrowRight size={12} />
                  </Link>
                </div>

                {accounts.length > 0 ? (
                  <div className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/[0.06] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <th className="p-4">Profile Node</th>
                            <th className="p-4">Subscribers / Followers</th>
                            <th className="p-4">Total Views</th>
                            <th className="p-4">Party</th>
                            <th className="p-4 text-right">Activity Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {accounts.map((acc, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-white/[0.01] transition-colors text-xs"
                            >
                              <td className="p-4 font-bold text-slate-200">
                                {acc.name}
                              </td>
                              <td className="p-4 text-slate-300">
                                {Number(acc.followers).toLocaleString()}
                              </td>
                              <td className="p-4 text-slate-300">
                                {Number(acc.totalViews).toLocaleString()}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <PartyLogo party={acc.party} size={22} className="shadow-sm" />
                                  <span className="font-semibold text-slate-200">{acc.party || "Independent"}</span>
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
                    <p className="text-xs text-slate-400">
                      No tracked nodes indexed yet.
                    </p>
                    <Link to="/accounts">
                      <button className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition">
                        Index First Node
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
