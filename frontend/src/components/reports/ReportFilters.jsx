import { Search } from "lucide-react";
import { HUB_FILTERS, HUB_SORTS } from "../../utils/reportMeta";

export default function ReportFilters({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="search"
            placeholder="Search title, tags, summary, politician, module…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-[#111319] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
          Sort
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#111319] border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-indigo-500/50"
          >
            {HUB_SORTS.map((option) => (
              <option key={option.id} value={option.id} className="bg-[#111319]">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {HUB_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap border ${
              filter === tab.id
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-[#111319] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/[0.12]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
