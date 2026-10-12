import type { JobType } from "./types";

export type ExportFilters = {
  from: string | null;
  to: string | null;
  phase: string | null;
};

type DoneJob = {
  status: string;
  type: JobType;
  completed_on: string | null;
  phase_id: string | null;
};

function inRange(date: string | null, f: ExportFilters) {
  if (!date) return false;
  return (!f.from || date >= f.from) && (!f.to || date <= f.to);
}

const OWNERSHIP_TYPES: JobType[] = ["maintenance", "repair", "diagnosis"];

/** Service history: done Maintenance/Repair/Diagnosis jobs in the filters, newest first. */
export function serviceHistoryJobs<
  T extends DoneJob & { completed_odometer: number | null },
>(jobs: T[], f: ExportFilters): T[] {
  return jobs
    .filter(
      (j) =>
        j.status === "done" &&
        OWNERSHIP_TYPES.includes(j.type) &&
        inRange(j.completed_on, f) &&
        (!f.phase || j.phase_id === f.phase),
    )
    .sort(
      (a, b) =>
        (b.completed_on ?? "").localeCompare(a.completed_on ?? "") ||
        (b.completed_odometer ?? 0) - (a.completed_odometer ?? 0),
    );
}

/** Build sheet: done Modification jobs in the filters, grouped by phase in plan order (unphased last). */
export function buildSheetGroups<T extends DoneJob & { title: string }>(
  jobs: T[],
  phasesInOrder: { id: string; name: string }[],
  f: ExportFilters,
): { phase: { id: string; name: string } | null; jobs: T[] }[] {
  const mods = jobs
    .filter(
      (j) =>
        j.status === "done" &&
        j.type === "modification" &&
        inRange(j.completed_on, f) &&
        (!f.phase || j.phase_id === f.phase),
    )
    .sort(
      (a, b) =>
        (a.completed_on ?? "").localeCompare(b.completed_on ?? "") ||
        a.title.localeCompare(b.title),
    );
  const groups = phasesInOrder
    .map((p) => ({ phase: p, jobs: mods.filter((j) => j.phase_id === p.id) }))
    .filter((g) => g.jobs.length);
  const unphased = mods.filter(
    (j) => !j.phase_id || !phasesInOrder.some((p) => p.id === j.phase_id),
  );
  return unphased.length
    ? [...groups, { phase: null, jobs: unphased }]
    : groups;
}

/** Build sheet photo per job: the newest highlighted photo, else the newest After photo. */
export function pickJobPhoto<
  T extends {
    kind: string;
    highlight: boolean;
    tag: string | null;
    taken_at: string;
  },
>(attachments: T[]): T | null {
  const photos = attachments
    .filter((a) => a.kind === "photo")
    .sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  return (
    photos.find((p) => p.highlight) ??
    photos.find((p) => p.tag === "after") ??
    null
  );
}

/** Plan: above 200 service-history entries, receipt thumbnails are omitted and the footer says so. */
export const RECEIPT_THUMBNAIL_LIMIT = 200;

export function receiptThumbnailsDecision(
  entryCount: number,
  requested: boolean,
): { include: boolean; note: string | null } {
  if (!requested) return { include: false, note: null };
  if (entryCount > RECEIPT_THUMBNAIL_LIMIT) {
    return {
      include: false,
      note: `Receipt thumbnails omitted: more than ${RECEIPT_THUMBNAIL_LIMIT} entries.`,
    };
  }
  return { include: true, note: null };
}

/** Spreadsheet money: cents -> dollars with 2 decimals (as a number). */
export function centsToDollars(
  cents: number | null | undefined,
): number | null {
  return cents === null || cents === undefined ? null : Math.round(cents) / 100;
}

/** Column header for a money column: amount_cents -> amount_usd. */
export function exportHeader(column: string): string {
  return column.endsWith("_cents") ? column.replace(/_cents$/, "_usd") : column;
}

/** One cell value for xlsx/csv: money to dollars, arrays joined, nulls empty. */
export function exportValue(
  column: string,
  value: unknown,
): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (column.endsWith("_cents") && typeof value === "number")
    return centsToDollars(value);
  if (Array.isArray(value)) return value.join("; ");
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number | boolean;
}

/** RFC 4180 CSV cell. Money keeps 2 decimals. Formula-looking text is prefixed so spreadsheets don't execute it. */
export function csvCell(column: string, value: unknown): string {
  const v = exportValue(column, value);
  if (v === null) return "";
  let s =
    typeof v === "number" && column.endsWith("_cents")
      ? v.toFixed(2)
      : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Tables in the full export (one sheet / CSV each), in a reading order. */
export const EXPORT_TABLES = [
  "vehicles",
  "phases",
  "jobs",
  "job_dependencies",
  "parts",
  "tools",
  "job_tools",
  "expenses",
  "watch_items",
  "watch_checkins",
  "watch_item_parts",
  "tasks",
  "task_links",
  "inspirations",
  "attachments",
] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];
