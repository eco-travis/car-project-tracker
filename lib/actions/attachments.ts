"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUserId, requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import {
  getAttachmentsFor,
  getGalleryPage,
  getScopedMedia,
  type MediaItem,
} from "@/lib/db/queries/media";
import { wallTimeToUtc } from "@/lib/domain/dates";
import {
  kindForMime,
  parentColumns,
  storagePaths,
  tooLargeError,
  uploadStrategy,
  type Parent,
} from "@/lib/domain/media";
import { maxUploadBytes } from "@/lib/media-links";
import {
  attachmentUpdateSchema,
  finalizeUploadSchema,
  mediaScopeSchema,
  parentSchema,
  prepareUploadSchema,
} from "@/lib/schemas/attachment";
import { galleryFiltersSchema } from "@/lib/schemas/gallery";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

const BUCKET = "attachments";
type Supabase = Awaited<ReturnType<typeof createClient>>;

const PARENT_TABLE = {
  phase: "phases",
  job: "jobs",
  part: "parts",
  tool: "tools",
  inspiration: "inspirations",
  watch_item: "watch_items",
  watch_checkin: "watch_checkins",
  task: "tasks",
  expense: "expenses",
} as const;

/** The parent must be the user's (RLS) and, where the table has one, on this vehicle. */
async function parentIsValid(
  supabase: Supabase,
  vehicleId: string,
  parent: Parent,
): Promise<boolean> {
  if (!parent) return true;
  const table = PARENT_TABLE[parent.kind];
  let query = supabase.from(table).select("id").eq("id", parent.id);
  // watch_checkins has no vehicle_id and tools can move between vehicles; RLS still scopes both.
  if (table !== "watch_checkins" && table !== "tools")
    query = query.eq("vehicle_id" as never, vehicleId);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

export type PreparedUpload = {
  attachmentId: string;
  path: string;
  thumbPath: string | null;
  strategy: "standard" | "resumable";
  token: string | null;
  thumbToken: string | null;
};

/** Step 1: generate the id and paths and sign upload URLs. No row is written yet. */
export async function prepareUpload(
  input: unknown,
): Promise<ActionResult<PreparedUpload>> {
  const [userId, vehicle] = await Promise.all([
    requireUserId(),
    requireVehicle(),
  ]);
  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { filename, mime, size, withThumb, parent } = parsed.data;
  if (!kindForMime(mime))
    return fail("Only photos, video or audio clips, and PDFs can be uploaded.");
  const tooBig = tooLargeError(size, maxUploadBytes());
  if (tooBig) return fail(tooBig);

  const supabase = await createClient();
  if (!(await parentIsValid(supabase, vehicle.id, parent)))
    return fail("That record wasn't found.");

  const attachmentId = randomUUID();
  const { path, thumbPath } = storagePaths(
    userId,
    attachmentId,
    filename,
    withThumb,
  );
  const strategy = uploadStrategy(size, withThumb);
  let token: string | null = null;
  let thumbToken: string | null = null;
  if (strategy === "standard") {
    const signed = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (signed.error) return fail("Couldn't start the upload.");
    token = signed.data.token;
  }
  if (thumbPath) {
    const signed = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(thumbPath);
    if (signed.error) return fail("Couldn't start the upload.");
    thumbToken = signed.data.token;
  }
  return ok({ attachmentId, path, thumbPath, strategy, token, thumbToken });
}

/**
 * Step 2: after the bytes are in Storage, insert the row. Paths are recomputed server-side and
 * must exist. If the insert fails, the uploaded objects are removed.
 */
export async function finalizeUpload(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const [userId, vehicle] = await Promise.all([
    requireUserId(),
    requireVehicle(),
  ]);
  const parsed = finalizeUploadSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const a = parsed.data;
  const supabase = await createClient();
  if (!(await parentIsValid(supabase, vehicle.id, a.parent)))
    return fail("That record wasn't found.");

  const { path, thumbPath } = storagePaths(
    userId,
    a.attachmentId,
    a.filename,
    a.withThumb,
  );
  const { data: objects } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${a.attachmentId}`);
  const names = new Set(
    (objects ?? []).map((o) => `${userId}/${a.attachmentId}/${o.name}`),
  );
  if (!names.has(path) || (thumbPath && !names.has(thumbPath)))
    return fail("The upload didn't finish. Try again.");

  const { error } = await supabase.from("attachments").insert({
    id: a.attachmentId,
    vehicle_id: vehicle.id,
    storage_path: path,
    thumb_path: thumbPath,
    mime_type: a.mime,
    size_bytes: a.size,
    kind: a.kind,
    tag: a.tag,
    taken_at: a.taken_at,
    caption: a.caption || null,
    ...parentColumns(a.parent),
  });
  if (error) {
    await supabase.storage
      .from(BUCKET)
      .remove([path, ...(thumbPath ? [thumbPath] : [])]);
    return fail("Couldn't save the upload.");
  }
  refreshApp();
  return ok({ id: a.attachmentId });
}

export async function updateAttachment(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const attachmentId = z.uuid().safeParse(id);
  const parsed = attachmentUpdateSchema.safeParse(input);
  if (!attachmentId.success) return fail("Attachment not found.");
  if (!parsed.success) return invalid(parsed.error);
  const { taken_at_local, ...rest } = parsed.data;
  const [date, time] = taken_at_local.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const taken_at = wallTimeToUtc({
    year,
    month,
    day,
    hour,
    minute,
    second,
  }).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .update({ ...rest, taken_at })
    .eq("id", attachmentId.data)
    .select("id");
  if (error) return fail("Couldn't save the changes.");
  if (!data.length) return fail("Attachment not found.");
  refreshApp();
  return ok();
}

export async function setHighlight(
  id: unknown,
  highlight: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const attachmentId = z.uuid().safeParse(id);
  const value = z.boolean().safeParse(highlight);
  if (!attachmentId.success || !value.success)
    return fail("Attachment not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .update({ highlight: value.data })
    .eq("id", attachmentId.data)
    .select("id");
  if (error) return fail("Couldn't update the highlight.");
  if (!data.length) return fail("Attachment not found.");
  refreshApp();
  return ok();
}

/** Deletes the row and its storage objects (plan: in the action, not a trigger). */
export async function deleteAttachment(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const attachmentId = z.uuid().safeParse(id);
  if (!attachmentId.success) return fail("Attachment not found.");
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("attachments")
    .select("storage_path, thumb_path")
    .eq("id", attachmentId.data)
    .maybeSingle();
  if (!row) return fail("Attachment not found.");
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([row.storage_path, ...(row.thumb_path ? [row.thumb_path] : [])]);
  if (storageError) return fail("Couldn't delete the file.");
  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId.data);
  if (error) return fail("Couldn't delete the attachment.");
  refreshApp();
  return ok();
}

/** Scoped carousel (flow 11): photos and clips for a job, phase (incl. its jobs), part, or watch item. */
export async function loadScopedMedia(
  scope: unknown,
): Promise<ActionResult<MediaItem[]>> {
  await requireVehicle();
  const parsed = mediaScopeSchema.safeParse(scope);
  if (!parsed.success) return fail("Nothing to show.");
  return ok(await getScopedMedia(parsed.data));
}

/** "Load more" in the Gallery (keyset pagination). */
export async function loadGalleryPage(filters: unknown, cursor: unknown) {
  await requireVehicle();
  const parsedFilters = galleryFiltersSchema.parse(filters ?? {});
  const parsedCursor = z
    .string()
    .max(500)
    .optional()
    .parse(cursor ?? undefined);
  return getGalleryPage(parsedFilters, parsedCursor);
}

/** Attachments on one record, for the attachments dialog (phases, tools, expenses). */
export async function loadAttachments(
  parent: unknown,
): Promise<ActionResult<MediaItem[]>> {
  await requireVehicle();
  const parsed = parentSchema.safeParse(parent);
  if (!parsed.success) return fail("Nothing to show.");
  return ok(await getAttachmentsFor(parsed.data));
}
