export default function ReportSkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#121318]/40 p-5 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-16 rounded bg-white/[0.04]" />
      </div>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-white/[0.08]" />
          <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/[0.04]" />
        <div className="h-3 w-5/6 rounded bg-white/[0.04]" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <div className="h-8 w-16 rounded-lg bg-white/[0.06]" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-white/[0.04]" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.04]" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
