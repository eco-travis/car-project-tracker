import "server-only";
import { createClient } from "@/lib/db/server";
import type { CostSummary } from "@/lib/domain/costs";
import type { OpenBlocker } from "@/lib/domain/jobs";
import { partsNotOrdered } from "@/lib/domain/parts";
import type {
  JobStatus,
  JobType,
  PartStatus,
  PhaseStatus,
} from "@/lib/domain/types";
import { toSummary } from "./costs";

export type PlanJob = {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  phase_id: string | null;
  budget_cents: number | null;
  completed_on: string | null;
  blockers: OpenBlocker[];
  costs: CostSummary;
  /** Parts on this job still in planning (idea, researching, wishlist). */
  partsNotOrdered: { id: string; name: string }[];
  /** Tools on this job marked Need to buy. */
  toolsToBuy: { id: string; name: string }[];
};

export type PlanPhase = {
  id: string;
  name: string;
  description: string | null;
  status: PhaseStatus;
  budget_cents: number | null;
  target_start: string | null;
  target_end: string | null;
  costs: CostSummary;
  diyHours: number;
  jobs: PlanJob[];
};

export async function getPlan(): Promise<{
  phases: PlanPhase[];
  unphased: PlanJob[];
}> {
  const supabase = await createClient();
  const [phases, jobs, blockers, jobCosts, phaseCosts, parts, jobTools] =
    await Promise.all([
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
      supabase.from("v_job_costs").select("*"),
      supabase.from("v_phase_costs").select("*"),
      supabase
        .from("parts")
        .select("id, name, status, job_id")
        .not("job_id", "is", null),
      supabase.from("job_tools").select("job_id, tool:tools(id, name, status)"),
    ]);
  for (const r of [
    phases,
    jobs,
    blockers,
    jobCosts,
    phaseCosts,
    parts,
    jobTools,
  ])
    if (r.error) throw r.error;

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
  const costsByJob = new Map(jobCosts.data!.map((c) => [c.job_id, c]));
  const costsByPhase = new Map(phaseCosts.data!.map((c) => [c.phase_id, c]));

  const planJobs: PlanJob[] = jobs.data!.map((j) => ({
    ...j,
    blockers: blockersByJob.get(j.id) ?? [],
    costs: toSummary(costsByJob.get(j.id), j.budget_cents),
    partsNotOrdered: partsNotOrdered(
      parts.data!.filter((p) => p.job_id === j.id) as {
        id: string;
        name: string;
        status: PartStatus;
      }[],
    ).map(({ id, name }) => ({ id, name })),
    toolsToBuy: jobTools
      .data!.filter(
        (l) => l.job_id === j.id && l.tool?.status === "need_to_buy",
      )
      .map((l) => ({ id: l.tool!.id, name: l.tool!.name })),
  }));

  return {
    phases: phases.data!.map((p) => ({
      ...p,
      costs: toSummary(costsByPhase.get(p.id), p.budget_cents),
      diyHours: Number(costsByPhase.get(p.id)?.diy_hours ?? 0),
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
