import React, { useState } from "react";
import { Database, Download, Trash2, ShieldAlert, FileSpreadsheet, FileJson, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import client from "../../api/client";
import { useExportProfileData } from "../../hooks/useQueries";

export default function DataExport({ user }) {
  const exportProfile = useExportProfileData();
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleDownloadProfile = async () => {
    try {
      const res = await exportProfile.mutateAsync();
      const payload = res?.data ?? { profile: user };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const anchor = document.createElement("a");
      anchor.href = dataStr;
      anchor.download = `socialiq_profile_${user?._id || "user"}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success("Profile JSON data exported.");
    } catch {
      toast.error("Failed to export profile data.");
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCsv(true);
      const res = await client.get("/api/export/dashboard", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `socialiq_analytics_${Date.now()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Analytics CSV downloaded.");
    } catch (err) {
      const msg = err.response?.data?.message || "Export failed. Upgrade may be required for CSV exports.";
      toast.error(msg);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("si_appearance");
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
        <div className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <FileJson size={18} />
              <h4 className="text-xs font-bold text-white">Download Profile Metadata</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">Export your account details, notification configurations, and preferences as a backup JSON document.</p>
          </div>
          <button onClick={handleDownloadProfile} disabled={exportProfile.isPending} className="w-full h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-50">
            {exportProfile.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />} Export Profile JSON
          </button>
        </div>

        <div className="bg-[#111319]/40 border border-white/[0.04] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-white/[0.08] transition duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <FileSpreadsheet size={18} />
              <h4 className="text-xs font-bold text-white">Export Workspace Analytics</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">Extract historical records of tracked creators and engagement metrics into a CSV file.</p>
          </div>
          <button onClick={handleExportCSV} disabled={exportingCsv} className="w-full h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] text-slate-300 hover:text-white transition flex items-center justify-center gap-2 text-xs font-semibold disabled:opacity-50">
            {exportingCsv ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />} Export CSV
          </button>
        </div>
      </div>

      <div className="bg-[#111319]/40 border border-[#ea580c]/10 p-6 rounded-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#ea580c]/10 text-[#ea580c] rounded-xl"><ShieldAlert size={20} /></div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-white">Browser Cache & Workspace Cleaning</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">Flushing local storage clears stored appearance preferences and forces a clean sync with our APIs.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <button onClick={handleClearCache} className="h-10 px-5 rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 hover:bg-[#ea580c] hover:text-white text-[#ea580c] transition text-xs font-semibold flex items-center justify-center gap-2">
            <Trash2 size={12} /> Flush Local Browser Cache
          </button>
        </div>
      </div>
    </div>
  );
}
