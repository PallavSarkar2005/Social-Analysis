import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getActivityLogs } from "../api/activityApi";
import {
  History,
  Search,
  RefreshCw,
  Terminal,
  Activity as ActivityIcon,
  Shield,
  Clock,
  Globe,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

export default function Activity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await getActivityLogs();
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load audit logs history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.includes(searchQuery))
    );
  });

  const getActionColor = (action) => {
    if (action.includes("login")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (action.includes("creation")) return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (action.includes("delete") || action.includes("removed")) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    if (action.includes("export")) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  };

  const getFriendlyAction = (action) => {
    return action.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8 z-10 relative">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <History size={28} className="text-indigo-400" />
                Audit Logs Trail
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Monitor login events, report generation runs, competitor sync triggers, and workspace activity details.
              </p>
            </div>

            <button
              onClick={loadLogs}
              className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2 self-start"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Audits
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search audit trail by action name, details, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-[#111319] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Table Container */}
          {loading && logs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-400">Loading audit history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#121318]/20 border border-white/[0.04] rounded-2xl text-center p-6">
              <Terminal className="w-12 h-12 text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No matching activities found</h4>
              <p className="text-xs text-slate-500">Activities automatically register as you operate the dashboard.</p>
            </div>
          ) : (
            <div className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Action Type</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Audit Log Details</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider">Client IP</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-sans">
                    {filteredLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/[0.01] transition-colors">
                        {/* Action badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider ${getActionColor(
                              log.action
                            )}`}
                          >
                            <ActivityIcon size={11} />
                            {getFriendlyAction(log.action)}
                          </span>
                        </td>
                        {/* Details */}
                        <td className="px-6 py-4 text-slate-200 font-semibold">{log.details || "No details provided"}</td>
                        {/* IP Address */}
                        <td className="px-6 py-4 font-mono text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Globe size={12} />
                            {log.ipAddress || "Localhost"}
                          </span>
                        </td>
                        {/* Created At Timestamp */}
                        <td className="px-6 py-4 text-right text-slate-400 font-medium font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
