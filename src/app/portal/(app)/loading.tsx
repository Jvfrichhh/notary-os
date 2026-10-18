// Skeleton saat server component portal sedang mengambil data.
export default function PortalLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat">
      <div className="h-6 w-48 animate-pulse rounded bg-border" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-background" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-border bg-background" />
    </div>
  );
}
