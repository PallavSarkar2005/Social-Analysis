import { getReportTypeMeta } from "../../utils/reportMeta";

export default function ReportTypeBadge({ type, className = "" }) {
  const meta = getReportTypeMeta(type);
  const Icon = meta.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${meta.chip} ${className}`}
    >
      <Icon size={13} className={meta.accent} />
      {meta.label}
    </span>
  );
}
