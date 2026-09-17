import { Trophy, ExternalLink } from "lucide-react";
import { isVerifiedValue, safeArray } from "../../utils/profileFacts";
import { safeText } from "../../utils/safeData";

const ElectionCard = ({ row }) => {
  const voteShare = row.voteShare ?? row.votePct;
  const fields = [
    { label: "Constituency", value: row.constituency },
    { label: "Party", value: row.party },
    { label: "Opponent", value: row.opponent },
    { label: "Votes", value: row.votes ? Number(row.votes).toLocaleString() : null },
    { label: "Vote Share", value: voteShare ? `${voteShare}%` : null },
    { label: "Margin", value: row.margin ? `+${Number(row.margin).toLocaleString()}` : null },
    { label: "Result", value: row.position || (row.winner ? "Winner" : null) },
    { label: "Runner Up", value: row.runnerUp },
    { label: "Turnout", value: row.turnout ? `${row.turnout}%` : null },
    { label: "Assets", value: row.assets },
    { label: "Liabilities", value: row.liabilities },
    { label: "Criminal Cases", value: row.criminalCases != null ? String(row.criminalCases) : null },
    { label: "Education", value: row.education },
    { label: "Occupation", value: row.occupation },
  ].filter((f) => isVerifiedValue(f.value));

  if (fields.length === 0 && !row.year) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-white/[0.1] hover:bg-white/[0.04]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Trophy className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-bold text-white">{safeText(row.election) || "Election"}</span>
        <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-extrabold text-indigo-300 ring-1 ring-indigo-500/20">
          {safeText(row.year)}
        </span>
        {row.position && (
          <span
            className={`rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
              /winner|won|elected/i.test(String(row.position))
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {safeText(row.position)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label} className="space-y-0.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {field.label}
            </span>
            <p className="text-xs font-semibold text-slate-200">{safeText(field.value)}</p>
          </div>
        ))}
      </div>

      {(row.affidavitLink || row.source) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.04] pt-3">
          {row.affidavitLink && (
            <a
              href={row.affidavitLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Affidavit <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {row.source && <span className="text-[10px] text-slate-500">Source: {safeText(row.source)}</span>}
        </div>
      )}
    </div>
  );
};

export default function ElectionIntelligencePanel({ elections = [], isLoading = false }) {
  const safeElections = safeArray(elections);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  if (!safeElections.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] px-4 py-10 text-center">
        <p className="text-xs font-semibold text-slate-400">No verified election records</p>
        <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
          Election intelligence appears when affidavit or electoral commission data is matched.
        </p>
      </div>
    );
  }

  const sorted = [...safeElections].sort((a, b) => (b.year || 0) - (a.year || 0));

  return (
    <div className="space-y-4">
      {sorted.map((row, idx) => (
        <ElectionCard key={`${row.year}-${row.constituency}-${idx}`} row={row} />
      ))}
    </div>
  );
}
