import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { useReports } from "../hooks/useQueries";
import { useDebounce } from "../hooks/useDebounce";
import { shareReport, regenerateReport } from "../api/reportApi";
import { triggerDownload } from "../api/exportApi";
import { copyTextToClipboard } from "../utils/shareHelpers";
import { devError } from "../utils/devLog";
import ReportFilters from "../components/reports/ReportFilters";
import ReportCard from "../components/reports/ReportCard";
import ReportSkeletonCard from "../components/reports/ReportSkeletonCard";
import ReportEmptyState from "../components/reports/ReportEmptyState";
import ReportErrorState from "../components/reports/ReportErrorState";
import ReportVirtualGrid from "../components/reports/ReportVirtualGrid";
import { FileText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import { getReportDisplayTitle } from "../utils/reportMeta";

const PAGE_SIZE = 24;

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [exportingId, setExportingId] = useState("");
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, sort]);

  const listParams = useMemo(() => {
    const params = {
      sort,
      page,
      limit: PAGE_SIZE,
    };
    if (debouncedSearch) params.q = debouncedSearch;
    if (filter && filter !== "all") params.filter = filter;
    return params;
  }, [debouncedSearch, filter, sort, page]);

  const {
    reports,
    pagination,
    loading,
    isError,
    error,
    deleteReport,
    patchReport,
    refetch,
  } = useReports(listParams);

  const hasActiveFilters = Boolean(debouncedSearch) || filter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilter("all");
    setSort("newest");
    setPage(1);
  };

  const handleOpen = (report) => {
    navigate(`/reports/${report._id}`);
  };

  // Deep-link: /reports?open=<id> → detail page
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    navigate(`/reports/${openId}`, { replace: true });
  }, [searchParams, navigate]);

  const handleDelete = async (report) => {
    const displayTitle = getReportDisplayTitle(report);
    const archive = window.confirm(
      `Remove "${displayTitle}" from the hub?\n\nOK = Archive\nCancel = keep`
    );
    if (!archive) return;

    const wipe = window.confirm(
      "Permanently delete instead of archive?\n\nOK = permanent delete\nCancel = archive only"
    );

    try {
      await deleteReport(report._id, wipe ? { hard: true } : undefined);
      toast.success(wipe ? "Report permanently deleted" : "Report archived");
    } catch (err) {
      devError(err);
      toast.error("Failed to remove report.");
    }
  };

  const handleExport = async (report, format) => {
    try {
      setExportingId(`${report._id}-${format}`);
      toast.loading(`Generating ${format.toUpperCase()}…`, { id: "export" });
      await triggerDownload(
        `reports/${report._id}`,
        format,
        (getReportDisplayTitle(report) || "intelligence_report")
          .toLowerCase()
          .replace(/\s+/g, "_")
      );
      toast.success("Download ready", { id: "export" });
    } catch (err) {
      devError(err);
      toast.error(err?.message || "Failed to export report.", { id: "export" });
    } finally {
      setExportingId("");
    }
  };

  const handleToggleFavorite = async (report) => {
    try {
      await patchReport(report._id, { favorite: !report.favorite });
      toast.success(report.favorite ? "Removed from favorites" : "Added to favorites");
    } catch (err) {
      devError(err);
      toast.error("Could not update favorite.");
    }
  };

  const handleTogglePin = async (report) => {
    try {
      await patchReport(report._id, { pinned: !report.pinned });
      toast.success(report.pinned ? "Unpinned" : "Pinned to top");
    } catch (err) {
      devError(err);
      toast.error("Could not update pin.");
    }
  };

  const handleShare = async (report) => {
    try {
      const res = await shareReport(report._id, {
        visibility: "public",
        expiresInDays: 30,
      });
      const url = res.data?.shareUrl;
      if (!url) {
        toast.error("Share link was not returned by the server.");
        return;
      }
      try {
        await copyTextToClipboard(url);
        toast.success("Public share link copied (30-day expiry)");
      } catch {
        window.prompt("Copy this share link:", url);
        toast.success("Share link ready — copy from the dialog");
      }
    } catch (err) {
      devError(err);
      toast.error(err?.response?.data?.message || "Could not create share link.");
    }
  };

  const handleRegenerate = async (report) => {
    try {
      toast.loading("Regenerating from latest profile analysis…", { id: "regen" });
      await regenerateReport(report._id);
      await refetch();
      toast.success("Report refreshed", { id: "regen" });
    } catch (err) {
      devError(err);
      toast.error(err?.response?.data?.message || "Regenerate failed", { id: "regen" });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Toaster position="top-right" />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6 z-10 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <FileText size={28} className="text-indigo-400" />
                Intelligence Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1 max-w-2xl">
                Searchable knowledge base for every analysis Social IQ generates — find, filter, pin, and open in seconds.
              </p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              className="h-10 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-white transition inline-flex items-center gap-2 self-start"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <ReportFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
          />

          {isError || offline ? (
            <ReportErrorState
              error={error}
              offline={offline}
              onRetry={() => refetch()}
            />
          ) : loading && reports.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <ReportSkeletonCard key={i} />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <ReportEmptyState
              filtered={hasActiveFilters || page > 1}
              onClearFilters={clearFilters}
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {pagination?.total != null
                    ? `${pagination.total} report${pagination.total === 1 ? "" : "s"}`
                    : `${reports.length} report${reports.length === 1 ? "" : "s"}`}
                  {filter !== "all" ? ` · ${filter}` : ""}
                </span>
                {pagination && (
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                )}
              </div>

              <ReportVirtualGrid itemCount={reports.length}>
                <AnimatePresence mode="popLayout">
                  {reports.map((report) => (
                    <ReportCard
                      key={report._id}
                      report={report}
                      exportingId={exportingId}
                      onOpen={handleOpen}
                      onDelete={handleDelete}
                      onExport={handleExport}
                      onToggleFavorite={handleToggleFavorite}
                      onTogglePin={handleTogglePin}
                      onShare={handleShare}
                      onRegenerate={handleRegenerate}
                    />
                  ))}
                </AnimatePresence>
              </ReportVirtualGrid>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-white disabled:opacity-40 inline-flex items-center gap-1 hover:bg-white/[0.06] transition"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.hasMore || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-9 px-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs font-semibold text-white disabled:opacity-40 inline-flex items-center gap-1 hover:bg-white/[0.06] transition"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
