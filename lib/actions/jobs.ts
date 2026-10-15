"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import {
  openBlockers,
  partsToOfferInstall,
  statusChangeError,
  wouldCreateCycle,
} from "@/lib/domain/jobs";
import type { JobStatus } from "@/lib/domain/types";
import {
  completionSchema,
  logWorkSchema,
  dependencySchema,
  jobSchema,
  statusChangeSchema,
} from "@/lib/schemas/job";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Rejects a phase id that isn't one of this vehicle's phases. */
async function phaseBelongsToVehicle(
  supabase: Supabase,
  phaseId: string | null,
  vehicleId: string,
) {
  if (!phaseId) return true;
  const { data } = await supabase
    .from("phases")
    .select("id")
    .eq("id", phaseId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();
  return Boolean(data);
}

/** Rule 1, computed from source rows with the domain function. */
async function loadOpenBlockers(supabase: Supabase, jobId: string) {
  const [deps, links] = await Promise.all([
    supabase
      .from("job_dependencies")
      .select(
        "blocker:jobs!job_dependencies_blocked_by_job_id_fkey(id, title, status)",
      )
      .eq("job_id", jobId),
    supabase
      .from("task_links")
      .select("blocks_job, task:tasks(id, title, status)")
      .eq("job_id", jobId),
  ]);
  if (deps.error) throw deps.error;
  if (links.error) throw links.error;
  return openBlockers(
    deps.data.flatMap((d) => (d.blocker ? [d.blocker] : [])),
    links.data.flatMap((l) =>
      l.task ? [{ ...l.task, blocks_job: l.blocks_job }] : [],
    ),
  );
}

export async function createJob(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (
    !(await phaseBelongsToVehicle(supabase, parsed.data.phase_id, vehicle.id))
  ) {
    return fail("Please fix the highlighted fields.", {
      phase_id: ["Pick one of your phases."],
    });
  }
  const { data, error } = await supabase
    .from("jobs")
    .insert({ ...parsed.data, vehicle_id: vehicle.id })
    .select("id")
    .single();
  if (error) return fail("Couldn't create the job.");
  refreshApp();
  return ok({ id: data.id });
}

/**
 * Log work (Work Log screen): a new job saved straight as Done. A new job has no blockers; the
 * odometer raise (rule 14) happens in the same transaction via jobs_raise_vehicle_odometer.
 */
export async function logWork(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = logWorkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (
    !(await phaseBelongsToVehicle(supabase, parsed.data.phase_id, vehicle.id))
  ) {
    return fail("Please fix the highlighted fields.", {
      phase_id: ["Pick one of your phases."],
    });
  }
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...parsed.data,
      vehicle_id: vehicle.id,
      status: "done" as JobStatus,
    })
    .select("id")
    .single();
  if (error) return fail("Couldn't log the work.");
  refreshApp();
  return ok({ id: data.id });
}

export async function updateJob(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const jobId = z.uuid().safeParse(id);
  const parsed = jobSchema.safeParse(input);
  if (!jobId.success) return fail("Job not found.");
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (
    !(await phaseBelongsToVehicle(supabase, parsed.data.phase_id, vehicle.id))
  ) {
    return fail("Please fix the highlighted fields.", {
      phase_id: ["Pick one of your phases."],
    });
  }
  const { data, error } = await supabase
    .from("jobs")
    .update(parsed.data)
    .eq("id", jobId.data)
    .select("id");
  if (error) return fail("Couldn't save the job.");
  if (!data.length) return fail("Job not found.");
  refreshApp();
  return ok();
}

export async function deleteJob(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const jobId = z.uuid().safeParse(id);
  if (!jobId.success) return fail("Job not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId.data)
    .select("id");
  if (error) return fail("Couldn't delete the job.");
  if (!data.length) return fail("Job not found.");
  refreshApp();
  return ok();
}

/** Status changes other than Done. Rule 2 guards ready and in_progress. */
export async function setJobStatus(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const jobId = z.uuid().safeParse(id);
  const parsed = statusChangeSchema.safeParse(input);
  if (!jobId.success) return fail("Job not found.");
  if (!parsed.success)
    return fail("Pick a valid status. Use Mark done to finish a job.");

  const supabase = await createClient();
  const blocked = statusChangeError(
    parsed.data.status,
    await loadOpenBlockers(supabase, jobId.data),
  );
  if (blocked) return fail(blocked);

  const { data, error } = await supabase
    .from("jobs")
    .update({ status: parsed.data.status })
    .eq("id", jobId.data)
    .select("id");
  if (error) return fail("Couldn't change the status.");
  if (!data.length) return fail("Job not found.");
  refreshApp();
  return ok();
}

/**
 * Mark done (rules 2, 3) or edit a done job's completion. The odometer raise (rule 14) happens
 * in the same transaction via the jobs_raise_vehicle_odometer trigger.
 * Returns the Received parts to offer as Installed (rule 4).
 */
export async function completeJob(
  id: unknown,
  input: unknown,
): Promise<ActionResult<{ receivedParts: { id: string; name: string }[] }>> {
  await requireVehicle();
  const jobId = z.uuid().safeParse(id);
  const parsed = completionSchema.safeParse(input);
  if (!jobId.success) return fail("Job not found.");
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId.data)
    .maybeSingle();
  if (!current) return fail("Job not found.");
  if (current.status !== "done") {
    const blocked = statusChangeError(
      "done",
      await loadOpenBlockers(supabase, jobId.data),
    );
    if (blocked) return fail(blocked);
  }

  const { error } = await supabase
    .from("jobs")
    .update({ ...parsed.data, status: "done" as JobStatus })
    .eq("id", jobId.data);
  if (error) return fail("Couldn't mark the job done.");

  const { data: parts } = await supabase
    .from("parts")
    .select("id, name, status")
    .eq("job_id", jobId.data);
  refreshApp();
  return ok({
    receivedParts: partsToOfferInstall(parts ?? []).map(({ id, name }) => ({
      id,
      name,
    })),
  });
}

/** Rule 4 follow-up: mark this job's Received parts Installed, only when the user accepts. */
export async function installReceivedParts(
  id: unknown,
): Promise<ActionResult<{ count: number }>> {
  await requireVehicle();
  const jobId = z.uuid().safeParse(id);
  if (!jobId.success) return fail("Job not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .update({ status: "installed" })
    .eq("job_id", jobId.data)
    .eq("status", "received")
    .select("id");
  if (error) return fail("Couldn't update the parts.");
  refreshApp();
  return ok({ count: data.length });
}

/** Rule 5: reject a dependency that would create a cycle. */
export async function addDependency(input: unknown): Promise<ActionResult> {
  await requireVehicle();
  const parsed = dependencySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { job_id, blocked_by_job_id } = parsed.data;

  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id")
    .in("id", [job_id, blocked_by_job_id]);
  if ((jobs?.length ?? 0) < (job_id === blocked_by_job_id ? 1 : 2))
    return fail("Job not found.");

  const { data: edges, error: edgeError } = await supabase
    .from("job_dependencies")
    .select("job_id, blocked_by_job_id");
  if (edgeError) return fail("Couldn't add the dependency.");
  if (wouldCreateCycle(edges, job_id, blocked_by_job_id)) {
    return fail(
      "That would create a loop: this job already blocks that one, directly or through other jobs.",
    );
  }

  const { error } = await supabase
    .from("job_dependencies")
    .insert({ job_id, blocked_by_job_id });
  if (error?.code === "23505") return fail("That job is already a blocker.");
  if (error) return fail("Couldn't add the dependency.");
  refreshApp();
  return ok();
}

export async function removeDependency(input: unknown): Promise<ActionResult> {
  await requireVehicle();
  const parsed = dependencySchema.safeParse(input);
  if (!parsed.success) return fail("Dependency not found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_dependencies")
    .delete()
    .match(parsed.data);
  if (error) return fail("Couldn't remove the dependency.");
  refreshApp();
  return ok();
}
