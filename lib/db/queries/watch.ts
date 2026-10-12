import "server-only";
import { createClient } from "@/lib/db/server";
import type { PartStatus } from "@/lib/domain/types";
import type { WatchSeverity, WatchStatus } from "@/lib/domain/watch";
import { getAttachmentsFor, type MediaItem } from "./media";

export type WatchListItem = {
  id: string;
  title: string;
  system: string;
  severity: WatchSeverity;
  status: WatchStatus;
  next_followup_on: string | null;
  next_followup_odometer: number | null;
  closed_on: string | null;
  promoted_job_id: string | null;
  is_due: boolean;
  is_overdue: boolean;
  last_checkin_on: string | null;
};

export async function getWatchList(): Promise<WatchListItem[]> {
  const supabase = await createClient();
  const [items, due] = await Promise.all([
    supabase
      .from("watch_items")
      .select(
        "id, title, system, severity, status, next_followup_on, next_followup_odometer, closed_on, promoted_job_id",
      ),
    supabase
      .from("v_watch_due")
      .select("watch_item_id, is_due, is_overdue, last_checkin_on"),
  ]);
  if (items.error) throw items.error;
  if (due.error) throw due.error;
  const byId = new Map(due.data.map((d) => [d.watch_item_id, d]));
  return items.data.map((i) => ({
    ...i,
    is_due: Boolean(byId.get(i.id)?.is_due),
    is_overdue: Boolean(byId.get(i.id)?.is_overdue),
    last_checkin_on: byId.get(i.id)?.last_checkin_on ?? null,
  }));
}

export async function getWatchItem(id: string) {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("watch_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!item) return null;
  const [checkins, suspected, allParts, due, job, itemMedia] =
    await Promise.all([
      supabase
        .from("watch_checkins")
        .select("id, checked_on, odometer, observation")
        .eq("watch_item_id", id)
        .order("checked_on", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("watch_item_parts")
        .select("part:parts(id, name, status, job_id)")
        .eq("watch_item_id", id),
      supabase.from("parts").select("id, name").order("name"),
      supabase
        .from("v_watch_due")
        .select("is_due, is_overdue")
        .eq("watch_item_id", id)
        .maybeSingle(),
      item.promoted_job_id
        ? supabase
            .from("jobs")
            .select("id, title")
            .eq("id", item.promoted_job_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      getAttachmentsFor({ kind: "watch_item", id }),
    ]);
  if (checkins.error) throw checkins.error;
  if (suspected.error) throw suspected.error;

  const media: Record<string, MediaItem[]> = {};
  await Promise.all(
    checkins.data.map(async (c) => {
      media[c.id] = await getAttachmentsFor({
        kind: "watch_checkin",
        id: c.id,
      });
    }),
  );
  const suspectedParts = suspected.data
    .map((s) => s.part)
    .filter(
      (
        p,
      ): p is {
        id: string;
        name: string;
        status: PartStatus;
        job_id: string | null;
      } => !!p,
    );
  return {
    item,
    checkins: checkins.data.map((c) => ({ ...c, media: media[c.id] ?? [] })),
    suspectedParts,
    partCandidates: (allParts.data ?? []).filter(
      (p) => !suspectedParts.some((s) => s.id === p.id),
    ),
    isDue: Boolean(due.data?.is_due),
    isOverdue: Boolean(due.data?.is_overdue),
    promotedJob: job.data as { id: string; title: string } | null,
    itemMedia,
  };
}

/** The watch item a job was promoted from, if any ("linked both ways"). */
export async function getPromotedFrom(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("watch_items")
    .select("id, title")
    .eq("promoted_job_id", jobId)
    .maybeSingle();
  return data;
}
