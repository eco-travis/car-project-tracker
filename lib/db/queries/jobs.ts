import "server-only";
import { createClient } from "@/lib/db/server";
import type { OpenBlocker } from "@/lib/domain/jobs";
import type { JobStatus, PartStatus, TaskStatus } from "@/lib/domain/types";

export type JobSummary = { id: string; title: string; status: JobStatus };

export async function getJob(id: string) {
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("*, phase:phases(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;

  const [deps, dependents, allJobs, openBlockers, taskBlockers, parts] =
    await Promise.all([
      supabase
        .from("job_dependencies")
        .select("blocked_by_job_id")
        .eq("job_id", id),
      supabase
        .from("job_dependencies")
        .select("job_id")
        .eq("blocked_by_job_id", id),
      supabase.from("jobs").select("id, title, status").order("title"),
      supabase
        .from("v_job_open_blockers")
        .select("kind, blocker_id, title")
        .eq("job_id", id),
      supabase
        .from("task_links")
        .select("task:tasks(id, title, status)")
        .eq("job_id", id)
        .eq("blocks_job", true),
      supabase
        .from("parts")
        .select("id, name, status")
        .eq("job_id", id)
        .order("name"),
    ]);
  for (const r of [
    deps,
    dependents,
    allJobs,
    openBlockers,
    taskBlockers,
    parts,
  ])
    if (r.error) throw r.error;

  const byId = new Map(allJobs.data!.map((j) => [j.id, j as JobSummary]));
  const blockedBy = deps
    .data!.map((d) => byId.get(d.blocked_by_job_id))
    .filter((j): j is JobSummary => !!j);
  const blocks = dependents
    .data!.map((d) => byId.get(d.job_id))
    .filter((j): j is JobSummary => !!j);

  return {
    job,
    blockedBy,
    blocks,
    blockingTasks: taskBlockers
      .data!.map((t) => t.task)
      .filter(
        (t): t is { id: string; title: string; status: TaskStatus } => !!t,
      ),
    openBlockers: openBlockers.data!.map(
      (b) =>
        ({ kind: b.kind, id: b.blocker_id, title: b.title }) as OpenBlocker,
    ),
    /** Jobs that could become blockers (not this one, not already linked). */
    dependencyCandidates: allJobs.data!.filter(
      (j) => j.id !== id && !blockedBy.some((b) => b.id === j.id),
    ),
    parts: parts.data! as { id: string; name: string; status: PartStatus }[],
  };
}

export type WorkLogFilters = { type?: string; phase?: string; q?: string };

/** Done jobs, newest first (spec: Work Log). */
export async function getWorkLog(filters: WorkLogFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select(
      "id, title, type, completed_on, completed_odometer, performed_by, performer_name, diy_hours, phase:phases(id, name)",
    )
    .eq("status", "done")
    .order("completed_on", { ascending: false })
    .order("completed_odometer", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type as never);
  if (filters.phase === "none") query = query.is("phase_id", null);
  else if (filters.phase) query = query.eq("phase_id", filters.phase);
  const term = searchTerm(filters.q);
  if (term)
    query = query.or(
      `title.ilike.${term},description.ilike.${term},notes.ilike.${term}`,
    );

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * A PostgREST-safe ilike pattern. Two escaping layers: LIKE wildcards get a backslash, then the
 * value is double-quoted for PostgREST, where backslashes and quotes must be escaped again.
 */
function searchTerm(q: string | undefined): string | null {
  const trimmed = q?.trim();
  if (!trimmed) return null;
  const like = `%${trimmed.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return `"${like.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}
