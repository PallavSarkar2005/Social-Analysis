import { useEffect, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useTrackedNodes, useSnapshots } from "../hooks/useQueries";
import FollowerChart from "../components/charts/FollowerChart";
import { Calendar, Layers, ShieldAlert, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function HistoryLogs() {
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const { data: accounts = [], isLoading: loadingAccounts, error: accountsError } = useTrackedNodes();

  const { data: snapshotData, isLoading: loadingSnapshots, error: snapshotsError } = useSnapshots(selectedAccountId);

  const history = snapshotData?.history || [];
  const forecast = snapshotData?.forecast || null;

  const loading = loadingAccounts || loadingSnapshots;
  const loadingForecast = loadingSnapshots;

  const error = accountsError?.message || snapshotsError?.message || "";

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  const activeAccount = accounts.find((a) => a._id === selectedAccountId);

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Historical Audit Logs
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Access deep telemetry records and delta velocity checkpoints across all tracked nodes.
              </p>
            </div>

            {accounts.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Node:</span>
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
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="h-64 w-full bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse" />
              <div className="h-48 w-full bg-[#121318]/40 border border-white/[0.06] rounded-2xl animate-pulse" />
            </div>
          ) : history.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Follower chart */}
              <div className="lg:col-span-2 bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-400" />
                    Audience Progression Velocity
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Growth timeline over active capture intervals.
                  </p>
                </div>
                <div className="w-full">
                  <FollowerChart data={history} />
                </div>
              </div>

              {/* Logs table */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                    <Layers size={14} />
                    Audit Checkpoints
                  </div>
                  <div className="border border-white/[0.06] rounded-xl overflow-hidden shadow-xl bg-slate-950/20">
                    <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.06] flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Timestamp</span>
                      <span>Followers</span>
                    </div>
                    <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto custom-scrollbar">
                      {history.slice().reverse().map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center px-4 py-3 text-xs sm:text-sm hover:bg-white/[0.01] transition-colors"
                        >
                          <span className="text-slate-400 font-medium flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-500" />
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
              </div>

            </div>

            {/* Forecasting Panel */}
            {forecast && (
              <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-xl space-y-6">
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
                    {/* Cards */}
                    <div className="lg:col-span-1 grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">30d Predicted Followers</p>
                        <h4 className="text-lg font-black text-white">{forecast.predictions?.followers30d?.toLocaleString()}</h4>
                        <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                          +{(forecast.rates?.followersPerDay * 30).toFixed(0).toLocaleString()} projected
                        </p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">90d Predicted Followers</p>
                        <h4 className="text-lg font-black text-white">{forecast.predictions?.followers90d?.toLocaleString()}</h4>
                        <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                          +{(forecast.rates?.followersPerDay * 90).toFixed(0).toLocaleString()} projected
                        </p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">30d Predicted Views</p>
                        <h4 className="text-lg font-black text-white">{forecast.predictions?.views30d?.toLocaleString()}</h4>
                        <p className="text-[9px] text-blue-400 flex items-center gap-1">
                          +{(forecast.rates?.viewsPerDay * 30).toFixed(0).toLocaleString()} projected
                        </p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">90d Predicted Views</p>
                        <h4 className="text-lg font-black text-white">{forecast.predictions?.views90d?.toLocaleString()}</h4>
                        <p className="text-[9px] text-blue-400 flex items-center gap-1">
                          +{(forecast.rates?.viewsPerDay * 90).toFixed(0).toLocaleString()} projected
                        </p>
                      </div>
                    </div>

                    {/* Chart */}
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
          </>) : (
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
