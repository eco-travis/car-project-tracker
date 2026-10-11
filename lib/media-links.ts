/** Where a media item's "Open record" link goes. Shared by server queries and client components. */
export function parentHref(
  kind: string | null,
  id: string | null,
  watchItemId?: string | null,
): string {
  switch (kind) {
    case "job":
      return `/jobs/${id}`;
    case "part":
      return `/parts/${id}`;
    case "watch_item":
      return `/watch/${id}`;
    case "watch_checkin":
      return watchItemId ? `/watch/${watchItemId}` : "/watch";
    case "phase":
      return "/plan";
    case "tool":
      return "/tools";
    case "task":
      return "/tasks";
    case "inspiration":
      return "/inspiration";
    default:
      return "/vehicle";
  }
}

/** Per-file cap for uploads, from the bucket's configured limit (human setup step 6). */
export function maxUploadBytes(): number {
  const mb = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 500) * 1024 * 1024;
}
