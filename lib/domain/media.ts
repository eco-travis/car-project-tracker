import { wallTimeToUtc } from "./dates";

export type AttachmentKind = "photo" | "clip" | "receipt" | "document";
export type AttachmentTag = "before" | "during" | "after";

/** Files the uploader accepts (spec: photos, video or audio clips, PDFs). */
export const ACCEPTED_FILE_TYPES = "image/*,video/*,audio/*,application/pdf";

/** Default kind for a file. Images can be filed as receipts instead (the uploader decides). */
export function kindForMime(
  mime: string,
  opts: { receipt?: boolean } = {},
): AttachmentKind | null {
  if (mime.startsWith("image/")) return opts.receipt ? "receipt" : "photo";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "clip";
  if (mime === "application/pdf") return opts.receipt ? "receipt" : "document";
  return null;
}

/** HEIC/HEIF can't be decoded by most browsers' canvas: store as-is, show a generic tile. */
export function isHeic(mime: string, filename: string): boolean {
  return /image\/hei[cf]/i.test(mime) || /\.hei[cf]$/i.test(filename);
}

/** Photos get compressed with a thumbnail; everything else uploads as-is. */
export function shouldCompress(mime: string, filename: string): boolean {
  return (
    mime.startsWith("image/") &&
    !isHeic(mime, filename) &&
    mime !== "image/gif" &&
    mime !== "image/svg+xml"
  );
}

/** Supabase's resumable endpoint is recommended above 6 MB; it also needs exactly 6 MB chunks. */
export const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024;

export function uploadStrategy(
  sizeBytes: number,
  compressed: boolean,
): "standard" | "resumable" {
  return !compressed && sizeBytes > RESUMABLE_THRESHOLD_BYTES
    ? "resumable"
    : "standard";
}

export function tooLargeError(
  sizeBytes: number,
  maxBytes: number,
): string | null {
  if (sizeBytes <= maxBytes) return null;
  const mb = (n: number) =>
    `${Math.round(n / 1024 / 1024).toLocaleString("en-US")} MB`;
  return `This file is ${mb(sizeBytes)}; the limit is ${mb(maxBytes)}. Trim the clip or upload a smaller file.`;
}

export type ExifDates = {
  DateTimeOriginal?: string;
  CreateDate?: string;
  OffsetTimeOriginal?: string;
  OffsetTime?: string;
};

const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

/**
 * Taken date for an upload: EXIF DateTimeOriginal, else CreateDate (zone-less wall time, read as
 * Pacific unless the file records its own offset), else the file's lastModified, else now.
 */
export function resolveTakenAt(
  exif: ExifDates | null | undefined,
  lastModified: number | undefined,
  now: Date = new Date(),
): Date {
  const raw = exif?.DateTimeOriginal ?? exif?.CreateDate;
  const m = raw ? EXIF_DATE.exec(raw) : null;
  if (m) {
    const [year, month, day, hour, minute, second] = m.slice(1).map(Number);
    const offset = exif?.OffsetTimeOriginal ?? exif?.OffsetTime;
    if (offset && /^[+-]\d{2}:\d{2}$/.test(offset)) {
      const sign = offset.startsWith("-") ? -1 : 1;
      const [oh, om] = offset.slice(1).split(":").map(Number);
      return new Date(
        Date.UTC(year, month - 1, day, hour, minute, second) -
          sign * (oh * 60 + om) * 60000,
      );
    }
    return wallTimeToUtc({ year, month, day, hour, minute, second });
  }
  if (lastModified && Number.isFinite(lastModified) && lastModified > 0)
    return new Date(lastModified);
  return now;
}

/** Storage object names: keep it to safe characters, preserve the extension. */
export function safeFilename(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-+\./g, ".")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(-100);
  return cleaned || "file";
}

/** Rule: object paths are <owner_id>/<attachment_id>/<filename>. */
export function storagePaths(
  ownerId: string,
  attachmentId: string,
  filename: string,
  withThumb: boolean,
) {
  const base = `${ownerId}/${attachmentId}`;
  return {
    path: `${base}/${safeFilename(filename)}`,
    thumbPath: withThumb ? `${base}/thumb.jpg` : null,
  };
}

/** Which record an attachment hangs off. At most one; none means vehicle-level. */
export const PARENT_KINDS = [
  "phase",
  "job",
  "part",
  "tool",
  "inspiration",
  "watch_item",
  "watch_checkin",
  "task",
  "expense",
] as const;
export type ParentKind = (typeof PARENT_KINDS)[number];
export type Parent = { kind: ParentKind; id: string } | null;

export function parentColumns(
  parent: Parent,
): Record<`${ParentKind}_id`, string | null> {
  const cols = Object.fromEntries(
    PARENT_KINDS.map((k) => [`${k}_id`, null]),
  ) as Record<`${ParentKind}_id`, string | null>;
  if (parent) cols[`${parent.kind}_id`] = parent.id;
  return cols;
}
