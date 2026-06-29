import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { getReports, deleteReport } from "../api/reportApi";
import { triggerDownload } from "../api/exportApi";
import {
  FileText,
  Search,
  Trash2,
  Eye,
  Download,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  Database,
  Grid,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [exportingId, setExportingId] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await getReports();
      setReports(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load saved reports registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await deleteReport(id);
      toast.success("Report deleted successfully");
      if (selectedReport?._id === id) setSelectedReport(null);
      await loadReports();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete report.");
    }
  };

  const handleDownload = async (id, title, format) => {
    try {
      setExportingId(`${id}-${format}`);
      toast.loading(`Generating ${format.toUpperCase()} export...`, { id: "export" });
      
      await triggerDownload(`reports/${id}`, format, title.toLowerCase().replace(/\s+/g, "_"));
      
      toast.success("File downloaded successfully", { id: "export" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to export report.", { id: "export" });
    } finally {
      setExportingId("");
    }
  };

  // Filtering
  const filteredReports = reports.filter((rep) => {
    const matchesSearch =
      rep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rep.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    return rep.type === activeTab && matchesSearch;
  });

  const getReportTypeIcon = (type) => {
    switch (type) {
      case "ai_insight":
        return <Sparkles className="text-purple-400" size={16} />;
      case "comparison":
        return <Grid className="text-indigo-400" size={16} />;
      default:
        return <FileText className="text-blue-400" size={16} />;
    }
  };

  const formatReportTypeLabel = (type) => {
    return type ? type.replace("_", " ").toUpperCase() : "REPORT";
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
                <FileText size={28} className="text-indigo-400" />
                Saved Reports Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Access your archived AI strategies, channel comparisons, and audit analysis snapshots.
              </p>
            </div>

            <button
              onClick={loadReports}
              className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition flex items-center gap-2 self-start"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Registry
            </button>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search reports by title or source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-[#111319] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* Tabs */}
            <div className="bg-[#111319] border border-white/[0.08] p-1 rounded-xl flex gap-1 self-stretch md:self-auto overflow-x-auto">
              {[
                { id: "all", label: "All Reports" },
                { id: "ai_insight", label: "AI Strategy" },
                { id: "comparison", label: "Comparisons" },
                { id: "analysis", label: "Analyses" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reports Grid */}
          {loading && reports.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-400">Loading saved reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 bg-[#121318]/20 border border-white/[0.04] rounded-2xl text-center p-6">
              <Database className="w-12 h-12 text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No reports matched your query</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Save an AI insight, video analysis, or comparison directly from their respective pages to index them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredReports.map((rep) => (
                  <motion.div
                    key={rep._id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#121318]/40 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-lg flex flex-col justify-between hover:border-white/[0.12] transition-colors group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      {/* Top Type Indicator */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                          {getReportTypeIcon(rep.type)}
                          {formatReportTypeLabel(rep.type)}
                        </span>
                        
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Title & Source */}
                      <div>
                        <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {rep.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                          Source: <span className="text-slate-300">{rep.source}</span>
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.04]">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye size={13} /> Open
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Download Menu */}
                        <div className="flex items-center bg-[#111319] border border-white/[0.08] p-0.5 rounded-lg">
                          {["pdf", "xlsx", "csv"].map((fmt) => (
                            <button
                              key={fmt}
                              disabled={exportingId === `${rep._id}-${fmt}`}
                              onClick={() => handleDownload(rep._id, rep.title, fmt)}
                              className="px-2 py-1 rounded text-[9px] font-bold uppercase hover:text-indigo-400 transition"
                              title={`Export to ${fmt.toUpperCase()}`}
                            >
                              {exportingId === `${rep._id}-${fmt}` ? (
                                <RefreshCw size={10} className="animate-spin text-indigo-500" />
                              ) : (
                                fmt
                              )}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleDelete(rep._id, rep.title)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Report Reader Overlay Modal */}
          <AnimatePresence>
            {selectedReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedReport(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Contents */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-[#111319] border border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 max-h-[85vh] flex flex-col overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        {formatReportTypeLabel(selectedReport.type)} REPORT
                      </span>
                      <h2 className="text-lg font-bold text-white mt-1">{selectedReport.title}</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">Source target: {selectedReport.source}</p>
                    </div>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-xs sm:text-sm leading-relaxed custom-scrollbar">
                    {/* Render text directly or pretty JSON if comparison/array */}
                    {typeof selectedReport.content === "string" ? (
                      <div className="whitespace-pre-line bg-white/[0.01] p-4 rounded-xl border border-white/[0.04] text-slate-200">
                        {selectedReport.content}
                      </div>
                    ) : (
                      <pre className="bg-[#090a0f] p-4 rounded-xl border border-white/[0.06] font-mono text-[11px] text-emerald-400 overflow-x-auto select-text">
                        {JSON.stringify(selectedReport.content, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-white/[0.06] bg-black/10 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Captured: {new Date(selectedReport.createdAt).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleDownload(selectedReport._id, selectedReport.title, "pdf")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition flex items-center gap-2"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
