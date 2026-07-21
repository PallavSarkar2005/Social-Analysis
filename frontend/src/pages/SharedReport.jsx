import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSharedReport } from "../api/reportApi";
import ReportTypeBadge from "../components/reports/ReportTypeBadge";
import ReportDossierPreview from "../components/reports/ReportDossierPreview";
import { formatIndianDateTime } from "../utils/dateFormatter";
import { getConfidenceLabel, getReportDisplayTitle } from "../utils/reportMeta";
import { FileText, ShieldAlert } from "lucide-react";

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getSharedReport(token);
        if (!cancelled) setReport(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || "This shared report is unavailable."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-8">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-lg font-bold">Link unavailable</h1>
          <p className="text-sm text-slate-400">{error}</p>
          <Link to="/login" className="text-xs text-indigo-400 hover:underline">
            Sign in to Social IQ
          </Link>
        </div>
      </div>
    );
  }

  const confidence = getConfidenceLabel(report.confidence);

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 antialiased">
      <header className="border-b border-white/[0.06] bg-[#111319] px-4 sm:px-8 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 font-extrabold tracking-tight">
          <FileText className="text-indigo-400" size={20} />
          Social IQ
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          Shared intelligence
        </span>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6 print:max-w-none print:p-0">
        <div className="space-y-2 print:hidden">
          <ReportTypeBadge type={report.type} />
          <h1 className="text-xl font-extrabold text-white">
            {getReportDisplayTitle(report)}
          </h1>
          <p className="text-xs text-slate-400">
            {confidence != null ? `${confidence}% confidence · ` : ""}
            Shared {formatIndianDateTime(report.createdAt)}
            {report.shareExpiresAt
              ? ` · expires ${formatIndianDateTime(report.shareExpiresAt)}`
              : ""}
          </p>
        </div>

        <ReportDossierPreview dossier={report.dossier} showPrintButton />
      </main>
    </div>
  );
}
