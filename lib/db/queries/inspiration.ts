import "server-only";
import { createClient } from "@/lib/db/server";
import { getInspirationCovers, type MediaItem } from "./media";

export type InspirationCard = {
  id: string;
  title: string;
  source_url: string | null;
  tags: string[];
  notes: string | null;
  promoted_part: { id: string; name: string } | null;
  promoted_job: { id: string; title: string } | null;
  promoted_part_id: string | null;
  promoted_job_id: string | null;
  cover: MediaItem | null;
  imageCount: number;
};

export async function getInspirations(): Promise<InspirationCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspirations")
    .select(
      "id, title, source_url, tags, notes, promoted_part_id, promoted_job_id, promoted_part:parts(id, name), promoted_job:jobs(id, title)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  const covers = await getInspirationCovers();
  return data.map((i) => ({
    ...i,
    cover: covers.get(i.id)?.cover ?? null,
    imageCount: covers.get(i.id)?.count ?? 0,
  })) as InspirationCard[];
}

/** Inspiration cards a part or job was promoted from ("link kept both ways"). */
export async function getInspirationSources(
  target: "part" | "job",
  id: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inspirations")
    .select("id, title")
    .eq(target === "part" ? "promoted_part_id" : "promoted_job_id", id);
  return data ?? [];
}
