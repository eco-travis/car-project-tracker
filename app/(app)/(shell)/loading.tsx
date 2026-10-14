/** Shown while a screen's data loads (navigation stays interactive). */
export default function ShellLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <div className="bg-muted h-8 w-48 animate-pulse rounded-md" aria-hidden />
      <div className="bg-muted h-4 w-72 animate-pulse rounded-md" aria-hidden />
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-muted h-36 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}
