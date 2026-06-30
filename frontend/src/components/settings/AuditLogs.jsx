import React, { useState, useEffect } from "react";
import { Clock, Filter, AlertCircle, RefreshCw, Layers, ShieldCheck, Cpu } from "lucide-react";
import client from "../../api/client";
import toast from "react-hot-toast";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await client.get("/api/activity");
      if (res.data && res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error("Error loading activity logs:", err);
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesType = filterType === "all" || log.action?.toLowerCase().includes(filterType.toLowerCase());
    const matchesSeverity =
      filterSeverity === "all" ||
      (filterSeverity === "high" && log.severity === "high") ||
      (filterSeverity === "medium" && log.severity === "medium") ||
      (filterSeverity === "low" && log.severity === "low");

    return matchesType && matchesSeverity;
  });

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-indigo-400" size={20} /> Security Audit Trails
          </h2>
          <p className="text-xs text-slate-400 mt-1">Review chronological logs of profile rotations, session starts, and workspace modifications.</p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="h-10 px-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-xs font-semibold text-white transition flex items-center gap-2 self-start disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#111319]/40 border border-white/[0.04] p-4 rounded-2xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter size={14} className="text-indigo-400" /> Filters
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="all">All Actions</option>
            <option value="login">Login / Auth</option>
            <option value="password">Password Changes</option>
            <option value="session">Session Terminations</option>
            <option value="profile">Profile Updates</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="h-9 px-3 bg-[#181b24] border border-white/[0.06] rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="low">Info / Low</option>
            <option value="medium">Warning / Medium</option>
            <option value="high">Critical / High</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#111319]/40 border border-white/[0.04] p-6 rounded-2xl space-y-6">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-xs text-slate-500">
            Fetching timeline events...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No audit logs found matching selected filter criteria.
          </div>
        ) : (
          <div className="relative border-l border-white/[0.04] pl-6 space-y-6 ml-2">
            {filteredLogs.map((log) => (
              <div key={log._id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#111319] border-2 border-indigo-500 group-hover:scale-125 transition duration-200" />
                
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-white uppercase">{log.action?.replace(/_/g, " ")}</span>
                    <span className={`px-2 py-0.5 border rounded text-[8px] font-bold uppercase tracking-wider ${getSeverityBadge(log.severity)}`}>
                      {log.severity || "info"}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto font-medium">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {log.details || log.message || "Action executed successfully."}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-semibold pt-1">
                    <span>IP: {log.ipAddress || log.ip || "Unknown"}</span>
                    <span>Device: {log.device || "Server Process"}</span>
                    <span>OS: {log.os || "Web"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
