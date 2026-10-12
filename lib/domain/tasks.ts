import { addInterval } from "./watch";
import type { TaskStatus } from "./types";

/**
 * Rule 20: completing or dropping a task changes only the task. (It may clear a job's open
 * blockers, which follows from rule 1, not from any write here.)
 */
export function taskStatusUpdate(
  status: Exclude<TaskStatus, "open">,
  today: string,
): { status: TaskStatus; completed_on: string | null } {
  return { status, completed_on: status === "done" ? today : null };
}

/** Reopening clears the completion date. */
export function reopenTask(): { status: TaskStatus; completed_on: null } {
  return { status: "open", completed_on: null };
}

export type TaskLink = {
  job_id: string | null;
  part_id: string | null;
  phase_id: string | null;
  watch_item_id: string | null;
  blocks_job: boolean;
};

/** Each link points at exactly one record; only a job link can block (mirrors the DB checks). */
export function taskLinkError(link: TaskLink): string | null {
  const targets = [
    link.job_id,
    link.part_id,
    link.phase_id,
    link.watch_item_id,
  ].filter(Boolean).length;
  if (targets !== 1) return "Each link must point to exactly one record.";
  if (link.blocks_job && !link.job_id) return "Only a job link can block.";
  return null;
}

/** Tasks screen: open tasks by due date, undated last, then title. */
export function sortOpenTasks<
  T extends { due_on: string | null; title: string },
>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) =>
      (a.due_on ?? "9999-12-31").localeCompare(b.due_on ?? "9999-12-31") ||
      a.title.localeCompare(b.title),
  );
}

/** Dashboard: open tasks due within the next `days` days (including overdue ones). */
export function dueWithin<
  T extends { status: TaskStatus; due_on: string | null },
>(tasks: T[], today: string, days = 7): T[] {
  const limit = addInterval(today, days, "days");
  return tasks.filter(
    (t) => t.status === "open" && t.due_on !== null && t.due_on <= limit,
  );
}
