import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useTrackedNodes, useSnapshots } from "../hooks/useQueries";
import {
  Calendar, Layers, ShieldAlert, TrendingUp, TrendingDown,
  Eye, Video, Percent, Sparkles, Clock, RefreshCw, BarChart2,
  Tv, Heart, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis,
  Tooltip as ChartTooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

// Utility to format large numbers
const fmt = (n) => {
  if (n == null || isNaN(n)) return "0";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
};

export default function HistoryLogs() {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [activeChartTab, setActiveChartTab] = useState("subscribers"); // subscribers, views, engagement, avgEngagement, videos
  const [timeframe, setTimeframe] = useState("daily"); // hourly, daily, weekly, monthly

  const { data: accounts = [], isLoading: loadingAccounts, error: accountsError } = useTrackedNodes();
  const { data: snapshotData, isLoading: loadingSnapshots, error: snapshotsError, refetch } = useSnapshots(selectedAccountId);

  const history = snapshotData?.history || [];
  const forecast = snapshotData?.forecast || null;

  const loading = loadingAccounts || loadingSnapshots;
  const error = accountsError?.message || snapshotsError?.message || "";

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  const activeAccount = accounts.find((a) => a._id === selectedAccountId);

  // ─── Calculate Growth Over Offsets ──────────────────────────────────────────
  const deltaMetrics = useMemo(() => {
    if (history.length < 2) return null;

    const latest = history[history.length - 1];
    const latestTime = new Date(latest.capturedAt).getTime();

    // Map timeframes to millisecond thresholds
    const thresholds = {
      hourly: 1 * 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const targetDiff = thresholds[timeframe] || thresholds.daily;

    // Find the snapshot closest to the target timeframe ago
    let comparison = history[0];
    let closestDiff = Math.abs(latestTime - new Date(comparison.capturedAt).getTime() - targetDiff);

    for (let i = 1; i < history.length - 1; i++) {
      const diff = Math.abs(latestTime - new Date(history[i].capturedAt).getTime() - targetDiff);
      if (diff < closestDiff) {
        closestDiff = diff;
        comparison = history[i];
      }
    }

    // Calculations
    const subGain = latest.followers - comparison.followers;
    const viewGain = latest.views - comparison.views;
    const videoGain = latest.videos - comparison.videos;
    const engChange = latest.engagementRate - comparison.engagementRate;
    const avgEngChange = latest.averageEngagement - comparison.averageEngagement;
    const growthPct = comparison.followers > 0 ? (subGain / comparison.followers) * 100 : 0;

    return {
      subGain,
      viewGain,
      videoGain,
      engChange,
      avgEngChange,
      growthPct,
      compareDate: new Date(comparison.capturedAt).toLocaleString(),
    };
  }, [history, timeframe]);

  // ─── Chart Configs ───────────────────────────────────────────────────────────
  const chartConfigs = {
    subscribers: {
      title: "Subscriber Growth",
      icon: TrendingUp,
      color: "#6366f1", // Indigo
      dataKey: "followers",
      type: "area",
    },
    views: {
      title: "View Growth Timeline",
      icon: Eye,
      color: "#10b981", // Emerald
      dataKey: "views",
      type: "area",
    },
    engagement: {
      title: "Recent Video Engagement Rate",
      icon: Percent,
      color: "#8b5cf6", // Violet
      dataKey: "engagementRate",
      type: "line",
    },
    avgEngagement: {
      title: "Average Engagement Trend",
      icon: Sparkles,
      color: "#f59e0b", // Amber
      dataKey: "averageEngagement",
      type: "line",
    },
    videos: {
      title: "Video Upload Timeline",
      icon: Video,
      color: "#ec4899", // Pink
      dataKey: "videos",
      type: "bar",
    },
  };

  const activeChart = chartConfigs[activeChartTab];

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                <Layers className="si-accent-text" size={24} /> Snapshot History & Telemetry
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Deep-dive audit logs, historical charts, and delta growth velocity calculated directly from stored snapshots.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {accounts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Node:</span>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    {accounts.map((acc) => (
                      <option key={acc._id} value={acc._id} className="bg-[#111319] text-white">
                        {acc.name} ({acc.platform})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={() => refetch()}
                disabled={loading}
                className="h-10 px-4 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-xl text-xs font-semibold text-slate-300 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Sync Check
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
              <div className="lg:col-span-2 h-[380px] bg-white/[0.02] border border-white/[0.06] rounded-2xl" />
              <div className="lg:col-span-1 h-[380px] bg-white/[0.02] border border-white/[0.06] rounded-2xl" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-6">

              {/* ─── Delta Metrics & Velocity Panel ─── */}
              <div className="bg-[#111318]/60 border border-white/[0.05] rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={11} /> Historical Delta Velocity
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Comparing latest snapshot with checkpoint from {deltaMetrics?.compareDate || "previous capture"}.
                    </p>
                  </div>
                  <div className="flex bg-[#0d0e14] border border-white/[0.06] p-0.5 rounded-xl self-start">
                    {["hourly", "daily", "weekly", "monthly"].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                          timeframe === tf ? "si-accent-bg text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                {deltaMetrics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      {
                        label: "Subscriber Gain",
                        val: `${subGainSign(deltaMetrics.subGain)}${fmt(Math.abs(deltaMetrics.subGain))}`,
                        color: deltaMetrics.subGain >= 0 ? "text-emerald-400" : "text-red-400"
                      },
                      {
                        label: "View Gain",
                        val: `${subGainSign(deltaMetrics.viewGain)}${fmt(Math.abs(deltaMetrics.viewGain))}`,
                        color: deltaMetrics.viewGain >= 0 ? "text-emerald-400" : "text-red-400"
                      },
                      {
                        label: "Video Gain",
                        val: `${subGainSign(deltaMetrics.videoGain)}${deltaMetrics.videoGain}`,
                        color: deltaMetrics.videoGain >= 0 ? "text-emerald-400" : "text-red-400"
                      },
                      {
                        label: "Engagement Change",
                        val: `${subGainSign(deltaMetrics.engChange)}${Math.abs(deltaMetrics.engChange).toFixed(2)}%`,
                        color: deltaMetrics.engChange >= 0 ? "text-emerald-400" : "text-red-400"
                      },
                      {
                        label: "Avg Engagement Change",
                        val: `${subGainSign(deltaMetrics.avgEngChange)}${Math.abs(deltaMetrics.avgEngChange).toFixed(2)}%`,
                        color: deltaMetrics.avgEngChange >= 0 ? "text-emerald-400" : "text-red-400"
                      },
                      {
                        label: "Growth Rate",
                        val: `${subGainSign(deltaMetrics.growthPct)}${Math.abs(deltaMetrics.growthPct).toFixed(2)}%`,
                        color: deltaMetrics.growthPct >= 0 ? "text-emerald-400" : "text-red-400"
                      },
                    ].map((m, idx) => (
                      <div key={idx} className="bg-white/[0.03] border border-white/[0.04] p-3 rounded-xl space-y-1">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
                        <p className={`text-base font-black ${m.color}`}>{m.val}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Not enough historical data points to compute growth deltas yet.</p>
                )}
              </div>

              {/* ─── Multi-Chart Visualiser ─── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Chart container */}
                <div className="lg:col-span-2 bg-[#111318]/60 border border-white/[0.05] rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <activeChart.icon size={16} style={{ color: activeChart.color }} />
                        {activeChart.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Interactive history graph directly mapped from database captures.
                      </p>
                    </div>

                    {/* Chart Tabs */}
                    <div className="flex flex-wrap gap-1 bg-[#0d0e14] border border-white/[0.06] p-0.5 rounded-xl">
                      {Object.entries(chartConfigs).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setActiveChartTab(key)}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition ${
                            activeChartTab === key ? "text-white" : "text-slate-500 hover:text-white"
                          }`}
                          style={activeChartTab === key ? { backgroundColor: cfg.color } : {}}
                        >
                          {key.replace("avgE", "avg E")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart rendering */}
                  <div className="w-full h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {activeChart.type === "area" ? (
                        <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id={`grad-${activeChartTab}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={activeChart.color} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={activeChart.color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip content={<CustomTooltip activeTab={activeChartTab} color={activeChart.color} />} />
                          <Area
                            type="monotone"
                            dataKey={activeChart.dataKey}
                            stroke={activeChart.color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#grad-${activeChartTab})`}
                          />
                        </AreaChart>
                      ) : activeChart.type === "line" ? (
                        <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip content={<CustomTooltip activeTab={activeChartTab} color={activeChart.color} />} />
                          <Line
                            type="monotone"
                            dataKey={activeChart.dataKey}
                            stroke={activeChart.color}
                            strokeWidth={2}
                            dot={{ fill: activeChart.color, strokeWidth: 1 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip content={<CustomTooltip activeTab={activeChartTab} color={activeChart.color} />} />
                          <Bar
                            dataKey={activeChart.dataKey}
                            fill={activeChart.color}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={30}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Right Checklist / Audit Table */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-[#111318]/60 border border-white/[0.05] rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                      <Layers size={14} /> Audit Log Checkpoints
                    </div>

                    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-slate-950/20">
                      <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06] flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Timestamp</span>
                        <span>Value</span>
                      </div>
                      <div className="divide-y divide-white/[0.04] max-h-[240px] overflow-y-auto custom-scrollbar">
                        {history.slice().reverse().map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center px-4 py-3 text-xs hover:bg-white/[0.01] transition-colors"
                          >
                            <span className="text-slate-400 font-medium flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-500" />
                              {item.date}
                            </span>
                            <span className="text-white font-semibold">
                              {activeChartTab === "subscribers" && fmt(item.followers)}
                              {activeChartTab === "views" && fmt(item.views)}
                              {activeChartTab === "videos" && `${item.videos} vids`}
                              {activeChartTab === "engagement" && `${item.engagementRate.toFixed(2)}%`}
                              {activeChartTab === "avgEngagement" && `${item.averageEngagement.toFixed(2)}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Forecasting Panel */}
              {forecast && (
                <div className="bg-[#111318]/60 border border-white/[0.05] rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-4 gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                        <TrendingUp size={16} className="text-purple-400" />
                        Predictive Projections Engine
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Growth trajectory predictions computed over historical database capture snapshots.
                      </p>
                    </div>
                    {forecast.hasEnoughData && forecast.scores && (
                      <div className="flex gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          Growth Score: {forecast.scores.growthScore}/100
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                          Perf Score: {forecast.scores.performanceScore}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {!forecast.hasEnoughData ? (
                    <div className="p-6 text-center bg-white/[0.01] rounded-xl border border-dashed border-white/[0.06] text-xs text-slate-400">
                      {forecast.message || "At least 2 historical snapshots are required to calculate forecasting trends."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">30d Predicted Followers</p>
                          <h4 className="text-lg font-black text-white">{forecast.predictions?.followers30d?.toLocaleString()}</h4>
                          <p className="text-[9px] text-emerald-400">
                            +{(forecast.rates?.followersPerDay * 30).toFixed(0).toLocaleString()} projected
                          </p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">90d Predicted Followers</p>
                          <h4 className="text-lg font-black text-white">{forecast.predictions?.followers90d?.toLocaleString()}</h4>
                          <p className="text-[9px] text-emerald-400">
                            +{(forecast.rates?.followersPerDay * 90).toFixed(0).toLocaleString()} projected
                          </p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">30d Predicted Views</p>
                          <h4 className="text-lg font-black text-white">{forecast.predictions?.views30d?.toLocaleString()}</h4>
                          <p className="text-[9px] text-blue-400">
                            +{(forecast.rates?.viewsPerDay * 30).toFixed(0).toLocaleString()} projected
                          </p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">90d Predicted Views</p>
                          <h4 className="text-lg font-black text-white">{forecast.predictions?.views90d?.toLocaleString()}</h4>
                          <p className="text-[9px] text-blue-400">
                            +{(forecast.rates?.viewsPerDay * 90).toFixed(0).toLocaleString()} projected
                          </p>
                        </div>
                      </div>

                      <div className="lg:col-span-2 bg-[#121318]/20 border border-white/[0.06] p-4 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">90-Day Growth Trend Projection</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart data={forecast.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 9 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <ChartTooltip
                              contentStyle={{
                                background: "rgba(17, 19, 25, 0.9)",
                                border: "1px solid rgba(255, 255, 255, 0.08)",
                                borderRadius: "12px",
                                color: "#fff",
                                fontSize: "11px",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="followers"
                              name="Followers"
                              stroke="#a855f7"
                              strokeWidth={2}
                              dot={{ fill: "#a855f7", strokeWidth: 1 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="views"
                              name="Views"
                              stroke="#3b82f6"
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              dot={{ fill: "#3b82f6", strokeWidth: 1 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-20 bg-[#121318]/30 rounded-2xl border border-white/[0.06] border-dashed space-y-3">
              <p className="text-sm font-semibold text-slate-400">No telemetry checkpoints loaded.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeAccount
                  ? "Trigger a channel sync in Accounts or wait for the scheduler to capture snapshots."
                  : "Go to Accounts page to index social profiles."}
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

// ─── Custom Tooltip Component ───────────────────────────────────────────────
function CustomTooltip({ active, payload, activeTab, color }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#111319]/90 border border-white/[0.08] backdrop-blur-md rounded-xl p-3 shadow-xl space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400">{data.date}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold text-white">
            {activeTab === "subscribers" && `${fmt(data.followers)} Subscribers`}
            {activeTab === "views" && `${fmt(data.views)} Views`}
            {activeTab === "videos" && `${data.videos} Videos`}
            {activeTab === "engagement" && `${data.engagementRate.toFixed(2)}% Engagement`}
            {activeTab === "avgEngagement" && `${data.averageEngagement.toFixed(2)}% Avg Engagement`}
          </span>
        </div>
        <div className="border-t border-white/[0.04] pt-1 text-[9px] text-slate-500 flex flex-col gap-0.5">
          <span>Likes: {fmt(data.likes)}</span>
          <span>Comments: {fmt(data.comments)}</span>
          <span>Party: {data.party}</span>
          <span>State: {data.state}</span>
        </div>
      </div>
    );
  }
  return null;
}

const subGainSign = (val) => (val >= 0 ? "+" : "");
