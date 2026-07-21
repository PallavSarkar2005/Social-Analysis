import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { X, Download, ExternalLink } from "lucide-react";
import ReportTypeBadge from "./ReportTypeBadge";
import { formatIndianDateTime } from "../../utils/dateFormatter";
import {
  getReportDisplayTitle,
  getConfidenceLabel,
} from "../../utils/reportMeta";

export default function ReportViewerModal({ report, onClose, onExportPdf }) {
  if (!report) return null;

  const confidence = getConfidenceLabel(report.confidence);
  const cover = report.dossier?.sections?.cover;
  const summaryParagraphs = report.dossier?.sections?.executiveSummary?.paragraphs || [];
  const modules = report.dossier?.modulesIncluded || report.sourceModules || [];
  const displayTitle = getReportDisplayTitle(report);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-[#111319] border border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="p-5 sm:p-6 border-b border-white/[0.06] flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <ReportTypeBadge type={report.type || report.reportType} />
            <h2 className="text-lg font-bold text-white truncate">{displayTitle}</h2>
            <p className="text-[11px] text-slate-400">
              {confidence != null ? `${confidence}% confidence` : "Intelligence report"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-300 text-xs sm:text-sm leading-relaxed custom-scrollbar">
          {(cover?.politicianName || cover?.currentPosition || cover?.party) && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Political Intelligence Preview
              </div>
              {cover.politicianName && (
                <p className="text-sm font-semibold text-white">{cover.politicianName}</p>
              )}
              <p className="text-xs text-slate-400">
                {[cover.currentPosition, cover.party, cover.state].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}

          {(summaryParagraphs.length > 0 || report.summary || report.description) && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Summary
              </div>
              {summaryParagraphs.length > 0 ? (
                <div className="space-y-2">
                  {summaryParagraphs.slice(0, 3).map((p, i) => (
                    <p key={i} className="text-slate-300 text-sm leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed">
                  {report.summary || report.description}
                </p>
              )}
            </div>
          )}

          {modules.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Modules included
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modules.map((m) => (
                  <span
                    key={m}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-400 capitalize"
                  >
                    {String(m).replace(/([A-Z])/g, " $1")}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link
            to={`/reports/${report._id || report.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            Open full intelligence dossier <ExternalLink size={12} />
          </Link>
        </div>

        <div className="p-4 border-t border-white/[0.06] bg-black/10 flex justify-between items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">
            Captured {formatIndianDateTime(report.createdAt)}
            {report.viewCount ? ` · ${report.viewCount} views` : ""}
          </span>
          <button
            type="button"
            onClick={() => onExportPdf(report)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition inline-flex items-center gap-2"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}
