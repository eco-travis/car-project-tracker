import "server-only";
import { createClient } from "@/lib/db/server";
import type { OpenBlocker } from "@/lib/domain/jobs";
import type { JobStatus, JobType, PhaseStatus } from "@/lib/domain/types";

export type PlanJob = {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  phase_id: string | null;
  budget_cents: number | null;
  completed_on: string | null;
  blockers: OpenBlocker[];
};

export type PlanPhase = {
  id: string;
  name: string;
  description: string | null;
  status: PhaseStatus;
  budget_cents: number | null;
  target_start: string | null;
  target_end: string | null;
  jobs: PlanJob[];
};

export async function getPlan(): Promise<{
  phases: PlanPhase[];
  unphased: PlanJob[];
}> {
  const supabase = await createClient();
  const [phases, jobs, blockers] = await Promise.all([
    supabase
      .from("phases")
      .select(
        "id, name, description, status, budget_cents, target_start, target_end",
      )
      .order("sort_order"),
    supabase
      .from("jobs")
      .select("id, title, type, status, phase_id, budget_cents, completed_on")
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("v_job_open_blockers")
      .select("job_id, kind, blocker_id, title"),
  ]);
  for (const r of [phases, jobs, blockers]) if (r.error) throw r.error;

  const blockersByJob = new Map<string, OpenBlocker[]>();
  for (const b of blockers.data!) {
    const list = blockersByJob.get(b.job_id!) ?? [];
    list.push({
      kind: b.kind as OpenBlocker["kind"],
      id: b.blocker_id!,
      title: b.title!,
    });
    blockersByJob.set(b.job_id!, list);
  }
  const planJobs: PlanJob[] = jobs.data!.map((j) => ({
    ...j,
    blockers: blockersByJob.get(j.id) ?? [],
  }));

  return {
    phases: phases.data!.map((p) => ({
      ...p,
      jobs: planJobs.filter((j) => j.phase_id === p.id),
    })),
    unphased: planJobs.filter((j) => j.phase_id === null),
  };
}

/** Phases for pickers, in plan order. */
export async function getPhaseOptions(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .select("id, name")
    .order("sort_order");
  if (error) throw error;
  return data;
}
