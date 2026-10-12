import "server-only";
import { createClient } from "@/lib/db/server";
import type { TaskStatus } from "@/lib/domain/types";

export type TaskLinkView = {
  job_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  watch_item_id: string | null;
  blocks_job: boolean;
  label: string;
  href: string;
};

export type TaskRow = {
  id: string;
  title: string;
  notes: string | null;
  due_on: string | null;
  status: TaskStatus;
  completed_on: string | null;
  links: TaskLinkView[];
};

const SELECT =
  "id, title, notes, due_on, status, completed_on, links:task_links(job_id, part_id, phase_id, watch_item_id, blocks_job, job:jobs(title), part:parts(name), phase:phases(name), watch_item:watch_items(title))";

type RawLink = {
  job_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  watch_item_id: string | null;
  blocks_job: boolean;
  job: { title: string } | null;
  part: { name: string } | null;
  phase: { name: string } | null;
  watch_item: { title: string } | null;
};

function shape(
  rows: (Omit<TaskRow, "links"> & { links: RawLink[] })[],
): TaskRow[] {
  return rows.map((t) => ({
    ...t,
    links: t.links.map((l) => ({
      job_id: l.job_id,
      part_id: l.part_id,
      phase_id: l.phase_id,
      watch_item_id: l.watch_item_id,
      blocks_job: l.blocks_job,
      label: l.job
        ? `Job: ${l.job.title}`
        : l.part
          ? `Part: ${l.part.name}`
          : l.phase
            ? `Phase: ${l.phase.name}`
            : `Watch: ${l.watch_item?.title ?? ""}`,
      href: l.job_id
        ? `/jobs/${l.job_id}`
        : l.part_id
          ? `/parts/${l.part_id}`
          : l.watch_item_id
            ? `/watch/${l.watch_item_id}`
            : "/plan",
    })),
  }));
}

export async function getTasks(): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return shape(data as never);
}

/** Tasks linked to one record (job checklist, part, phase, watch item). */
export async function getTasksFor(
  kind: "job" | "part" | "phase" | "watch_item",
  id: string,
): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from("task_links")
    .select("task_id")
    .eq(`${kind}_id`, id);
  if (linkError) throw linkError;
  const ids = [...new Set(links.map((l) => l.task_id))];
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT)
    .in("id", ids)
    .order("created_at");
  if (error) throw error;
  return shape(data as never);
}

export type TaskLinkOptions = {
  jobs: { id: string; name: string }[];
  parts: { id: string; name: string }[];
  phases: { id: string; name: string }[];
  watchItems: { id: string; name: string }[];
};

export async function getTaskLinkOptions(): Promise<TaskLinkOptions> {
  const supabase = await createClient();
  const [jobs, parts, phases, watch] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title")
      .neq("status", "cancelled")
      .order("title"),
    supabase.from("parts").select("id, name").order("name"),
    supabase.from("phases").select("id, name").order("sort_order"),
    supabase
      .from("watch_items")
      .select("id, title")
      .eq("status", "watching")
      .order("title"),
  ]);
  for (const r of [jobs, parts, phases, watch]) if (r.error) throw r.error;
  return {
    jobs: jobs.data!.map((j) => ({ id: j.id, name: j.title })),
    parts: parts.data!,
    phases: phases.data!,
    watchItems: watch.data!.map((w) => ({ id: w.id, name: w.title })),
  };
}
