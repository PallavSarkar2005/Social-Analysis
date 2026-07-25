import { memo } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Eye,
  Trash2,
  Star,
  Pin,
  Share2,
  RefreshCw,
  User,
} from "lucide-react";
import ReportTypeBadge from "./ReportTypeBadge";
import SafeImage from "../common/SafeImage";
import {
  getPoliticianLabel,
  getReportDisplayTitle,
  getConfidenceLabel,
  MODULE_ICON_MAP,
} from "../../utils/reportMeta";
import { formatIndianDate } from "../../utils/dateFormatter";

const EXPORT_FORMATS = ["pdf", "json", "md", "csv"];

function ModuleIcons({ modules = [] }) {
  if (!modules.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {modules.slice(0, 5).map((mod) => {
        const key = String(mod).toLowerCase();
        const Icon = MODULE_ICON_MAP[key] || MODULE_ICON_MAP.profile;
        return (
          <span
            key={mod}
            title={mod}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400"
          >
            <Icon size={12} />
          </span>
        );
      })}
    </div>
  );
}

function ProfileThumb({ report }) {
  const thumb = report.thumbnail || report.metadata?.thumbnail || report.metadata?.avatar;
  const label = getPoliticianLabel(report);
  const initial = (label || "?").trim().charAt(0).toUpperCase();

  if (thumb) {
    return (
      <SafeImage
        src={thumb}
        alt={label ? `${label} portrait` : "Report portrait"}
        className="h-10 w-10 rounded-full border border-white/[0.08] bg-[#111319] shrink-0"
        imgClassName="h-full w-full object-cover"
        size="thumb"
        fallback="avatar"
      />
    );
  }

  return (
    <div className="h-10 w-10 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
      {initial || <User size={14} />}
    </div>
  );
}

function ReportCard({
  report,
  exportingId,
  onOpen,
  onDelete,
  onExport,
  onToggleFavorite,
  onTogglePin,
  onShare,
  onRegenerate,
}) {
  const confidence = getConfidenceLabel(report.confidence);
  const politician = getPoliticianLabel(report);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="bg-[#121318]/50 backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 shadow-lg flex flex-col justify-between hover:border-indigo-500/30 hover:shadow-indigo-500/5 transition-colors group relative overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_280px]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-indigo-500/[0.04] to-transparent" />

      <div className="space-y-3 relative z-[1]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ReportTypeBadge type={report.type || report.reportType} />
            {report.updateAvailable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerate?.(report);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/25 transition"
                title="Newer analysis available — click to regenerate"
              >
                <RefreshCw size={10} />
                Update Available
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onTogglePin(report)}
              className={`p-1.5 rounded-lg transition ${
                report.pinned
                  ? "text-amber-300 bg-amber-500/10"
                  : "text-slate-500 hover:text-amber-300 hover:bg-white/[0.04]"
              }`}
              title={report.pinned ? "Unpin" : "Pin"}
            >
              <Pin size={14} className={report.pinned ? "fill-current" : ""} />
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(report)}
              className={`p-1.5 rounded-lg transition ${
                report.favorite
                  ? "text-yellow-300 bg-yellow-500/10"
                  : "text-slate-500 hover:text-yellow-300 hover:bg-white/[0.04]"
              }`}
              title={report.favorite ? "Unfavorite" : "Favorite"}
            >
              <Star size={14} className={report.favorite ? "fill-current" : ""} />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ProfileThumb report={report} />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-white group-hover:text-indigo-200 transition-colors line-clamp-2">
              {getReportDisplayTitle(report)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
              {[
                report.metadata?.currentPosition || report.content?.position,
                report.metadata?.party || report.content?.party,
                report.metadata?.state || report.content?.state,
              ]
                .filter(Boolean)
                .join(" · ") || politician}
            </p>
            {report.metadata?.syncStatus && (
              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                Status: {String(report.metadata.syncStatus).replace(/_/g, " ")}
              </p>
            )}
          </div>
        </div>

        {(report.summary || report.description) && (
          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
            {report.summary || report.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar size={11} />
            Created {formatIndianDate(report.createdAt)}
          </span>
          {report.updatedAt && (
            <span className="inline-flex items-center gap-1">
              Updated {formatIndianDate(report.updatedAt)}
            </span>
          )}
          {confidence != null && (
            <span className="inline-flex items-center gap-1 text-emerald-400/90 font-semibold">
              {confidence}% confidence
            </span>
          )}
        </div>

        <ModuleIcons modules={report.sourceModules} />
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.04] relative z-[1] gap-2">
        <button
          type="button"
          onClick={() => onOpen(report)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-600 hover:text-white transition text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Eye size={13} /> Open
        </button>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center bg-[#111319] border border-white/[0.08] p-0.5 rounded-lg">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={exportingId === `${report._id}-${fmt}`}
                onClick={() => onExport(report, fmt)}
                className="px-2 py-1 rounded text-[9px] font-bold uppercase text-slate-400 hover:text-indigo-300 transition disabled:opacity-50"
                title={`Export ${fmt.toUpperCase()}`}
              >
                {exportingId === `${report._id}-${fmt}` ? (
                  <RefreshCw size={10} className="animate-spin text-indigo-400" />
                ) : (
                  fmt
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onShare(report)}
            className="p-2 text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition"
            title="Create public share link"
          >
            <Share2 size={14} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(report)}
            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            title="Delete report"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default memo(ReportCard);
