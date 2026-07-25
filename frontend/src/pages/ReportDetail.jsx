import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import ReportTypeBadge from "../components/reports/ReportTypeBadge";
import ReportDossierPreview from "../components/reports/ReportDossierPreview";
import {
  getReportById,
  shareReport,
  revokeReportShare,
  patchReport,
  deleteReport,
  regenerateReport,
} from "../api/reportApi";
import { triggerDownload } from "../api/exportApi";
import { copyTextToClipboard, buildClientShareUrl } from "../utils/shareHelpers";
import { getReportDisplayTitle, getConfidenceLabel } from "../utils/reportMeta";
import { devError } from "../utils/devLog";
import {
  ArrowLeft,
  Download,
  Share2,
  Link2Off,
  Star,
  Pin,
  Trash2,
  RefreshCw,
  ExternalLink,
  Eye,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const EXPORTS = ["pdf", "markdown", "csv", "json"];

export default function ReportDetail() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [shareExpiryDays, setShareExpiryDays] = useState(30);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const repRes = await getReportById(reportId);
      setReport(repRes.data);
    } catch (err) {
      devError(err);
      setError(err?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const applyShareResult = async (res, message) => {
    const url = res.data?.shareUrl;
    const nextReport = res.data?.report || report;
    setReport(nextReport);
    if (!url) {
      toast.error("Share link was not returned by the server.");
      return;
    }
    try {
      await copyTextToClipboard(url);
      toast.success(message || "Share link copied");
    } catch {
      window.prompt("Copy this share link:", url);
      toast.success("Share link ready — copy from the dialog");
    }
  };

  const handleShare = async ({ regenerate = false } = {}) => {
    try {
      setSharing(true);
      const res = await shareReport(reportId, {
        visibility: "public",
        expiresInDays: shareExpiryDays > 0 ? shareExpiryDays : undefined,
      });
      await applyShareResult(
        res,
        regenerate
          ? "New share link generated and copied"
          : `Public share link copied${shareExpiryDays > 0 ? ` (${shareExpiryDays}-day expiry)` : ""}`
      );
    } catch (err) {
      devError(err);
      toast.error(err?.response?.data?.message || "Could not create share link");
    } finally {
      setSharing(false);
    }
  };

  const handleMakePrivate = async () => {
    try {
      setSharing(true);
      const res = await shareReport(reportId, { visibility: "private" });
      setReport(res.data?.report || report);
      toast.success("Report set to private (link disabled)");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update visibility");
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async () => {
    try {
      const res = await revokeReportShare(reportId);
      setReport(res.data);
      toast.success("Share link revoked");
    } catch (err) {
      devError(err);
      toast.error(err?.response?.data?.message || "Could not revoke share");
    }
  };

  const displayTitle = getReportDisplayTitle(report);

  const handleExport = async (format) => {
    try {
      setExporting(format);
      toast.loading(`Generating ${format.toUpperCase()}…`, { id: "export" });
      await triggerDownload(
        `reports/${reportId}`,
        format,
        (displayTitle || "intelligence_report").toLowerCase().replace(/\s+/g, "_")
      );
      toast.success("Download ready", { id: "export" });
    } catch (err) {
      devError(err);
      toast.error(err?.message || "Export failed", { id: "export" });
    } finally {
      setExporting("");
    }
  };

  const handleToggle = async (field) => {
    try {
      const res = await patchReport(reportId, { [field]: !report[field] });
      setReport(res.data);
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDelete = async () => {
    const archive = window.confirm(
      `Remove "${displayTitle}" from the hub?\n\nOK = Archive\nCancel = Keep`
    );
    if (!archive) return;
    const wipe = window.confirm(
      "Permanently delete instead?\n\nOK = permanent\nCancel = archive only"
    );
    try {
      await deleteReport(reportId, wipe ? { hard: true } : undefined);
      toast.success(wipe ? "Permanently deleted" : "Archived");
      navigate("/reports");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      toast.loading("Regenerating from latest profile…", { id: "regen" });
      const res = await regenerateReport(reportId);
      setReport(res.data);
      toast.success("Report updated to latest analysis", { id: "regen" });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Regenerate failed", { id: "regen" });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="p-8 space-y-4 animate-pulse max-w-5xl mx-auto w-full">
            <div className="h-8 w-48 bg-white/[0.06] rounded" />
            <div className="h-40 bg-white/[0.04] rounded-2xl" />
            <div className="h-64 bg-white/[0.04] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <p className="text-sm text-rose-300">{error || "Report not found"}</p>
              <Link to="/reports" className="text-xs text-indigo-400 hover:underline">
                Back to Intelligence Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const confidence = getConfidenceLabel(report.confidence);
  const isShared = report.isShared || (report.shareToken && report.visibility === "public");

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans">
      <Toaster position="top-right" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6 print:max-w-none print:p-0">
          <div className="flex items-center justify-between gap-3 print:hidden">
            <button
              type="button"
              onClick={() => navigate("/reports")}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft size={14} /> Intelligence Hub
            </button>
            <button
              type="button"
              onClick={load}
              className="h-9 px-3 rounded-xl border border-white/[0.08] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/[0.04]"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <header className="rounded-2xl border border-white/[0.08] bg-[#121318]/50 p-5 sm:p-6 space-y-4 print:hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <ReportTypeBadge type={report.type} />
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {displayTitle}
                </h1>
                <p className="text-xs text-slate-400">
                  {confidence != null ? `${confidence}% confidence` : "Political intelligence"}
                  {report.viewCount ? ` · ${report.viewCount} views` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {report.updateAvailable && (
                  <button
                    type="button"
                    disabled={regenerating}
                    onClick={handleRegenerate}
                    className="h-9 px-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-amber-500/25"
                  >
                    <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
                    Update Available
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleToggle("favorite")}
                  className={`p-2 rounded-lg border transition ${report.favorite ? "text-yellow-300 border-yellow-500/30 bg-yellow-500/10" : "border-white/[0.08] text-slate-400"}`}
                >
                  <Star size={14} className={report.favorite ? "fill-current" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle("pinned")}
                  className={`p-2 rounded-lg border transition ${report.pinned ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "border-white/[0.08] text-slate-400"}`}
                >
                  <Pin size={14} />
                </button>
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => handleShare({ regenerate: isShared })}
                  className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Share2 size={13} /> {isShared ? "Regenerate link" : "Share"}
                </button>
                {isShared && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const url =
                          buildClientShareUrl(report.shareToken) ||
                          (await shareReport(reportId, {
                            visibility: "public",
                            expiresInDays: shareExpiryDays || undefined,
                          }).then((r) => r.data?.shareUrl));
                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      className="h-9 px-3 rounded-xl border border-white/[0.08] text-xs font-semibold inline-flex items-center gap-1.5 text-slate-300 hover:bg-white/[0.04]"
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleRevoke}
                      className="h-9 px-3 rounded-xl border border-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Link2Off size={13} /> Disable link
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={sharing}
                  onClick={handleMakePrivate}
                  className="h-9 px-3 rounded-xl border border-white/[0.08] text-xs font-semibold text-slate-400 hover:bg-white/[0.04]"
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-lg border border-white/[0.08] text-slate-400 hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold inline-flex items-center gap-1.5">
                Expiry
                <select
                  value={shareExpiryDays}
                  onChange={(e) => setShareExpiryDays(Number(e.target.value))}
                  className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] text-slate-300 px-2"
                >
                  <option value={0}>No expiry</option>
                  <option value={7}>7 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </label>
              {EXPORTS.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  disabled={exporting === fmt}
                  onClick={() => handleExport(fmt)}
                  className="h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-indigo-300 inline-flex items-center gap-1.5"
                >
                  <Download size={11} />
                  {exporting === fmt ? "…" : fmt}
                </button>
              ))}
              {isShared && report.shareToken && (
                <a
                  href={buildClientShareUrl(report.shareToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-lg border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider text-indigo-300 inline-flex items-center gap-1.5 hover:bg-indigo-500/10"
                >
                  <ExternalLink size={11} /> Open shared
                </a>
              )}
            </div>
          </header>

          <ReportDossierPreview dossier={report.dossier} />
        </main>
      </div>
    </div>
  );
}
