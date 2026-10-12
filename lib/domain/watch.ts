import type { PartStatus } from "./types";

export type WatchSeverity = "monitor" | "concerning" | "act_soon";
export type WatchStatus = "watching" | "promoted" | "resolved" | "dismissed";
export type IntervalUnit = "days" | "weeks" | "months";

/** Overdue thresholds (rule 15 + spec decision). */
export const OVERDUE_DAYS = 7;
export const OVERDUE_MILES = 500;

/** Adds days/weeks/months to a YYYY-MM-DD date. Months clamp to the end of shorter months. */
export function addInterval(
  dateIso: string,
  amount: number,
  unit: IntervalUnit,
): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  if (unit === "months") {
    const target = new Date(Date.UTC(y, m - 1 + amount, 1));
    const lastDay = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
  }
  const days = unit === "weeks" ? amount * 7 : amount;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export type FollowupInput = {
  /** Relative date: "in N units". */
  in_amount: number | null;
  in_unit: IntervalUnit | null;
  /** Absolute date (wins over relative). */
  on: string | null;
  /** Relative mileage: "in N miles". */
  in_miles: number | null;
  /** Absolute odometer reading (wins over relative). */
  at_odometer: number | null;
};

/** Rule 16: relative inputs become absolute values on save. Either, both, or neither may be set. */
export function resolveFollowup(
  input: FollowupInput,
  today: string,
  currentOdometer: number,
): { next_followup_on: string | null; next_followup_odometer: number | null } {
  const next_followup_on =
    input.on ??
    (input.in_amount !== null && input.in_unit
      ? addInterval(today, input.in_amount, input.in_unit)
      : null);
  const next_followup_odometer =
    input.at_odometer ??
    (input.in_miles !== null ? currentOdometer + input.in_miles : null);
  return { next_followup_on, next_followup_odometer };
}

export type DueInput = {
  status: WatchStatus;
  next_followup_on: string | null;
  next_followup_odometer: number | null;
};

/**
 * Rule 15: a watching item is due when its date has arrived or the odometer has reached its
 * reading; overdue when the date is more than 7 days past or the reading more than 500 miles
 * past. Items with neither set are never due.
 */
export function watchDue(
  item: DueInput,
  today: string,
  currentOdometer: number,
): { due: boolean; overdue: boolean } {
  if (item.status !== "watching") return { due: false, overdue: false };
  const dateDue =
    item.next_followup_on !== null && item.next_followup_on <= today;
  const milesDue =
    item.next_followup_odometer !== null &&
    item.next_followup_odometer <= currentOdometer;
  const dateOverdue =
    item.next_followup_on !== null &&
    item.next_followup_on < addInterval(today, -OVERDUE_DAYS, "days");
  const milesOverdue =
    item.next_followup_odometer !== null &&
    currentOdometer - item.next_followup_odometer > OVERDUE_MILES;
  return { due: dateDue || milesDue, overdue: dateOverdue || milesOverdue };
}

const SEVERITY_RANK: Record<WatchSeverity, number> = {
  act_soon: 0,
  concerning: 1,
  monitor: 2,
};

/** Watch list order: overdue, then due, then by next follow-up date (undated last), then severity. */
export function sortWatchList<
  T extends DueInput & { severity: WatchSeverity; title: string },
>(items: T[], today: string, currentOdometer: number): T[] {
  const rank = (i: T) => {
    const { due, overdue } = watchDue(i, today, currentOdometer);
    return overdue ? 0 : due ? 1 : 2;
  };
  return [...items].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.next_followup_on ?? "9999-12-31").localeCompare(
        b.next_followup_on ?? "9999-12-31",
      ) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.title.localeCompare(b.title),
  );
}

/** Rule 17: promote creates a Diagnosis job by default; Repair is the only alternative. */
export const PROMOTE_JOB_TYPES = ["diagnosis", "repair"] as const;
export type PromoteJobType = (typeof PROMOTE_JOB_TYPES)[number];

/** Rule 17: suspected parts carry over to the new job only when they have no job yet. */
export function partsToCarryOver<T extends { job_id: string | null }>(
  parts: T[],
): T[] {
  return parts.filter((p) => p.job_id === null);
}

/** Rule 18: resolve and dismiss set the status and closed_on; check-ins are kept. */
export function closeWatchItem(
  status: "resolved" | "dismissed",
  today: string,
): { status: WatchStatus; closed_on: string } {
  return { status, closed_on: today };
}

/** Suspected parts are often still ideas; keep the part status helper handy for display. */
export type SuspectedPart = {
  id: string;
  name: string;
  status: PartStatus;
  job_id: string | null;
};
