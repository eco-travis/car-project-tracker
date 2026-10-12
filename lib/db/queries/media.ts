import "server-only";
import { createClient } from "@/lib/db/server";
import type { AttachmentKind, AttachmentTag, Parent } from "@/lib/domain/media";
import { parentHref } from "@/lib/media-links";
import type { MediaScope } from "@/lib/schemas/attachment";

const BUCKET = "attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type MediaItem = {
  id: string;
  kind: AttachmentKind;
  mime: string;
  tag: AttachmentTag | null;
  highlight: boolean;
  caption: string | null;
  takenAt: string;
  url: string | null;
  thumbUrl: string | null;
  odometer: number | null;
  phaseName: string | null;
  jobTitle: string | null;
  parentKind: string;
  parentTitle: string | null;
  href: string;
};

const SELECT =
  "id, kind, mime_type, tag, highlight, caption, taken_at, storage_path, thumb_path, odometer, phase_name, job_title, parent_kind, parent_id, parent_title, effective_watch_item_id";

type Row = {
  id: string | null;
  kind: AttachmentKind | null;
  mime_type: string | null;
  tag: AttachmentTag | null;
  highlight: boolean | null;
  caption: string | null;
  taken_at: string | null;
  storage_path: string | null;
  thumb_path: string | null;
  odometer: number | null;
  phase_name: string | null;
  job_title: string | null;
  parent_kind: string | null;
  parent_id: string | null;
  parent_title: string | null;
  effective_watch_item_id: string | null;
};

/** Batch-signs full and thumbnail URLs (1-hour expiry) and shapes rows for the UI. */
async function toMediaItems(rows: Row[]): Promise<MediaItem[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const paths = rows.flatMap((r) => [
    r.storage_path!,
    ...(r.thumb_path ? [r.thumb_path] : []),
  ]);
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const urlFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({
    id: r.id!,
    kind: r.kind!,
    mime: r.mime_type!,
    tag: r.tag,
    highlight: Boolean(r.highlight),
    caption: r.caption,
    takenAt: r.taken_at!,
    url: urlFor.get(r.storage_path!) ?? null,
    thumbUrl: r.thumb_path ? (urlFor.get(r.thumb_path) ?? null) : null,
    odometer: r.odometer,
    phaseName: r.phase_name,
    jobTitle: r.job_title,
    parentKind: r.parent_kind ?? "vehicle",
    parentTitle: r.parent_title,
    href: parentHref(r.parent_kind, r.parent_id, r.effective_watch_item_id),
  }));
}

/** Everything attached directly to one record (or vehicle-level when parent is null). */
export async function getAttachmentsFor(parent: Parent): Promise<MediaItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("v_attachment_details")
    .select(SELECT)
    .order("taken_at")
    .order("id");
  if (parent) query = query.eq(`${parent.kind}_id`, parent.id);
  else query = query.eq("parent_kind", "vehicle");
  const { data, error } = await query;
  if (error) throw error;
  return toMediaItems(data as Row[]);
}

/** Flow 11: photos and clips for a record; a phase includes its jobs' media, a watch item its check-ins'. */
export async function getScopedMedia(scope: MediaScope): Promise<MediaItem[]> {
  const supabase = await createClient();
  const column = {
    job: "job_id",
    phase: "effective_phase_id",
    part: "part_id",
    watch_item: "effective_watch_item_id",
  }[scope.kind];
  const { data, error } = await supabase
    .from("v_attachment_details")
    .select(SELECT)
    .eq(column, scope.id)
    .in("kind", ["photo", "clip"])
    .order("taken_at")
    .order("id");
  if (error) throw error;
  return toMediaItems(data as Row[]);
}

export type GalleryFilters = {
  phase?: string;
  job?: string;
  tag?: AttachmentTag;
  kind?: AttachmentKind;
  highlights?: boolean;
  docs?: boolean;
  order?: "asc" | "desc";
};

export const GALLERY_PAGE_SIZE = 60;

/** Keyset cursor over (taken_at, id). */
export function encodeCursor(item: { takenAt: string; id: string }): string {
  return Buffer.from(JSON.stringify([item.takenAt, item.id])).toString(
    "base64url",
  );
}
function decodeCursor(cursor: string | undefined): [string, string] | null {
  if (!cursor) return null;
  try {
    const [t, id] = JSON.parse(Buffer.from(cursor, "base64url").toString());
    return typeof t === "string" &&
      typeof id === "string" &&
      !Number.isNaN(Date.parse(t)) &&
      /^[0-9a-f-]{36}$/.test(id)
      ? [t, id]
      : null;
  } catch {
    return null;
  }
}

/**
 * Gallery: photos and clips (receipts and documents only with `docs`), never inspiration media,
 * keyset-paginated on (taken_at, id), 60 per page.
 */
export async function getGalleryPage(filters: GalleryFilters, cursor?: string) {
  const supabase = await createClient();
  const asc = filters.order !== "desc";
  let query = supabase
    .from("v_attachment_details")
    .select(SELECT)
    .is("inspiration_id", null)
    .order("taken_at", { ascending: asc })
    .order("id", { ascending: asc })
    .limit(GALLERY_PAGE_SIZE + 1);

  const kinds: AttachmentKind[] = filters.kind
    ? [filters.kind]
    : filters.docs
      ? ["photo", "clip", "receipt", "document"]
      : ["photo", "clip"];
  query = query.in("kind", kinds);
  if (filters.phase) query = query.eq("effective_phase_id", filters.phase);
  if (filters.job) query = query.eq("job_id", filters.job);
  if (filters.tag) query = query.eq("tag", filters.tag);
  if (filters.highlights) query = query.eq("highlight", true);

  const after = decodeCursor(cursor);
  if (after) {
    const [t, id] = after;
    const op = asc ? "gt" : "lt";
    query = query.or(
      `taken_at.${op}.${t},and(taken_at.eq.${t},id.${op}.${id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data as Row[];
  const page = rows.slice(0, GALLERY_PAGE_SIZE);
  const items = await toMediaItems(page);
  return {
    items,
    nextCursor:
      rows.length > GALLERY_PAGE_SIZE ? encodeCursor(items.at(-1)!) : null,
  };
}

/** Inspiration board: each card's first photo (cover) and file count, in one query + one signing batch. */
export async function getInspirationCovers(): Promise<
  Map<string, { cover: MediaItem | null; count: number }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_attachment_details")
    .select(`${SELECT}, inspiration_id`)
    .not("inspiration_id", "is", null)
    .order("taken_at")
    .order("id");
  if (error) throw error;
  const rows = data as (Row & { inspiration_id: string })[];
  const counts = new Map<string, number>();
  const firstPhoto = new Map<string, Row & { inspiration_id: string }>();
  for (const r of rows) {
    counts.set(r.inspiration_id, (counts.get(r.inspiration_id) ?? 0) + 1);
    if (r.kind === "photo" && !firstPhoto.has(r.inspiration_id))
      firstPhoto.set(r.inspiration_id, r);
  }
  const covers = await toMediaItems([...firstPhoto.values()]);
  const byId = new Map(covers.map((c) => [c.id, c]));
  const result = new Map<string, { cover: MediaItem | null; count: number }>();
  for (const [inspId, count] of counts) {
    const row = firstPhoto.get(inspId);
    result.set(inspId, {
      cover: row ? (byId.get(row.id!) ?? null) : null,
      count,
    });
  }
  return result;
}
