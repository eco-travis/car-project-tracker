import type { JobStatus, PartStatus, TaskStatus } from "./types";

export type BlockingJob = { id: string; title: string; status: JobStatus };
export type BlockingTaskLink = {
  id: string;
  title: string;
  status: TaskStatus;
  blocks_job: boolean;
};
export type OpenBlocker = { kind: "job" | "task"; id: string; title: string };

const CLOSED_JOB_STATUSES: JobStatus[] = ["done", "cancelled"];

/**
 * Rule 1: a job's open blockers are blocking jobs not done or cancelled, plus linked tasks
 * that block the job and are still open.
 */
export function openBlockers(
  blockingJobs: BlockingJob[],
  taskLinks: BlockingTaskLink[],
): OpenBlocker[] {
  return [
    ...blockingJobs
      .filter((j) => !CLOSED_JOB_STATUSES.includes(j.status))
      .map((j) => ({ kind: "job" as const, id: j.id, title: j.title })),
    ...taskLinks
      .filter((t) => t.blocks_job && t.status === "open")
      .map((t) => ({ kind: "task" as const, id: t.id, title: t.title })),
  ];
}

/** Statuses a job can't move to while it has open blockers (rule 2). */
export const GUARDED_STATUSES: readonly JobStatus[] = [
  "ready",
  "in_progress",
  "done",
];

/**
 * Rule 2: returns an error naming the blockers when `target` is guarded and blockers are open,
 * otherwise null. Other statuses are unrestricted.
 */
export function statusChangeError(
  target: JobStatus,
  blockers: OpenBlocker[],
): string | null {
  if (!GUARDED_STATUSES.includes(target) || blockers.length === 0) return null;
  const names = blockers.map((b) =>
    b.kind === "task" ? `task "${b.title}"` : `"${b.title}"`,
  );
  return `Blocked by ${joinNames(names)}. Finish or remove ${blockers.length === 1 ? "it" : "them"} first.`;
}

export type Completion = {
  completed_on: string | null;
  completed_odometer: number | null;
};

/** Rule 3: marking done requires a completion date and odometer. Returns field errors, empty when valid. */
export function completionErrors(
  c: Completion,
): Partial<Record<keyof Completion, string>> {
  const errors: Partial<Record<keyof Completion, string>> = {};
  if (!c.completed_on)
    errors.completed_on = "Enter the date the job was finished.";
  if (c.completed_odometer === null || c.completed_odometer === undefined) {
    errors.completed_odometer = "Enter the odometer reading.";
  }
  return errors;
}

/** Rule 3: the Mark done form pre-fills today and the vehicle's current odometer. */
export function completionDefaults(
  today: string,
  currentOdometer: number,
): { completed_on: string; completed_odometer: number } {
  return { completed_on: today, completed_odometer: currentOdometer };
}

/** Rule 4: after Done, offer to mark the job's Received parts as Installed (never forced). */
export function partsToOfferInstall<T extends { status: PartStatus }>(
  parts: T[],
): T[] {
  return parts.filter((p) => p.status === "received");
}

export type DependencyEdge = { job_id: string; blocked_by_job_id: string };

/**
 * Rule 5: true when making `jobId` blocked by `blockedById` would create a cycle
 * (including a job blocking itself).
 */
export function wouldCreateCycle(
  edges: DependencyEdge[],
  jobId: string,
  blockedById: string,
): boolean {
  if (jobId === blockedById) return true;
  // A cycle exists if jobId is already (transitively) a blocker of blockedById.
  const blockersOf = new Map<string, string[]>();
  for (const e of edges) {
    blockersOf.set(e.job_id, [
      ...(blockersOf.get(e.job_id) ?? []),
      e.blocked_by_job_id,
    ]);
  }
  const seen = new Set<string>();
  const stack = [blockedById];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === jobId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(blockersOf.get(current) ?? []));
  }
  return false;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
