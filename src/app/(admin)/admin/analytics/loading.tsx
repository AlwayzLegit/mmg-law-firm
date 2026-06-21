/** Skeleton shown while the analytics queries run (the page aggregates 90
 *  days of leads from Postgres, so first paint can lag a beat). */
export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse">
      <div className="bg-secondary h-7 w-40 rounded" />
      <div className="bg-secondary/70 mt-2 h-4 w-96 max-w-full rounded" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border-border rounded-xl border p-6">
            <div className="bg-secondary h-3 w-20 rounded" />
            <div className="bg-secondary mt-3 h-8 w-16 rounded" />
            <div className="bg-secondary/70 mt-2 h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-card border-border mt-6 rounded-xl border p-6">
        <div className="bg-secondary h-4 w-48 rounded" />
        <div className="bg-secondary/60 mt-4 h-64 w-full rounded" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border-border rounded-xl border p-6">
            <div className="bg-secondary h-4 w-32 rounded" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="bg-secondary/60 h-3 w-full rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
