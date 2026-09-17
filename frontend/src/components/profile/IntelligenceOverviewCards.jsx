import { BarChart2 } from "lucide-react";

import { safeArray } from "../../utils/profileFacts";

export default function IntelligenceOverviewCards({ cards = [] }) {
  const safeCards = safeArray(cards);

  if (!safeCards.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Intelligence Overview</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {safeCards.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-white/[0.06] bg-[#121318]/30 p-4 transition hover:border-white/[0.1]"
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {card.label}
            </span>
            <p className="mt-1.5 text-lg font-extrabold text-white">{card.value}</p>
            {card.confidence > 0 && (
              <span className="mt-1 inline-block text-[9px] font-semibold text-emerald-400">
                {card.confidence}% confidence
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
