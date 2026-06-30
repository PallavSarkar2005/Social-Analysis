import React from "react";
import { Database, Download, Trash2, ShieldAlert, Sparkles, FileSpreadsheet, FileJson, Layers } from "lucide-react";
import toast from "react-hot-toast";

export default function DataExport({ user }) {
  const handleDownloadProfile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `socialiq_profile_${user?._id || "user"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Profile JSON data exported.");
  };

  const handleExportCSV = () => {
    toast.success("Preparing analytical exports CSV download...");
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Local application cache successfully flushed!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="text-indigo-400" size={20} /> Data & Archive Export
        </h2>
        <p className="text-xs text-slate-400 mt-1">Download backup archives of your dashboard metrics or flush local browser caching.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Profile Export */}
        <div className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <FileJson size={18} />
              <h4 className="text-xs font-bold text-white">Download Profile Metadata</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Export your user accounts details, notification configurations, and login history logs as a backup JSON document.
            </p>
          </div>
          <button
            onClick={handleDownloadProfile}
            className="w-full h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Download size={12} /> Export Profile JSON
          </button>
        </div>

        {/* Analytics Export */}
        <div className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <FileSpreadsheet size={18} />
              <h4 className="text-xs font-bold text-white">Export Workspace Analytics</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Extract historical records of all tracked creator nodes, engagement cycles, and growth latency outputs into CSV files.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Download size={12} /> Export Sheets (CSV)
          </button>
        </div>
      </div>

      {/* Dangerous/Diagnostic utilities */}
      <div className="bg-[#111319]/40 border border-[#ea580c]/10 p-6 rounded-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#ea580c]/10 text-[#ea580c] rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">Browser Cache & Workspace Cleaning</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              If you experience telemetry mismatches, flushing your local storage will clear stored states and force a clean sync with our APIs.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <button
            onClick={handleClearCache}
            className="h-10 px-5 rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 hover:bg-[#ea580c] hover:text-white text-[#ea580c] transition text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 size={12} /> Flush Local Browser Cache
          </button>
        </div>
      </div>
    </div>
  );
}
