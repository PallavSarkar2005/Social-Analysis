/**
 * Professional page-level skeleton loaders — replace spinners for Suspense / auth.
 */

export function Shimmer({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-white/[0.04] via-white/[0.09] to-white/[0.04] bg-[length:200%_100%] ${className}`}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full bg-[#090a0f] p-4 sm:p-6 lg:p-8 space-y-6" role="status" aria-label="Loading dashboard">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-3 w-72 max-w-full" />
        </div>
        <Shimmer className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Shimmer key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Shimmer className="h-72 rounded-2xl lg:col-span-2" />
        <Shimmer className="h-72 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Shimmer key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen w-screen bg-[#090a0f]" role="status" aria-label="Loading Social IQ">
      <div className="hidden lg:block w-64 xl:w-72 shrink-0 border-r border-white/[0.08] p-6 space-y-4">
        <Shimmer className="h-8 w-32" />
        <div className="space-y-2 pt-6">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Shimmer key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-20 border-b border-white/[0.08] px-6 flex items-center justify-between">
          <Shimmer className="h-5 w-40" />
          <div className="flex gap-3">
            <Shimmer className="h-10 w-48 hidden md:block" />
            <Shimmer className="h-10 w-10 rounded-xl" />
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading table">
      <Shimmer className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default AppShellSkeleton;
