import "server-only";
import type { createClient } from "@/lib/db/server";
import type { Database } from "@/lib/db/types";
import {
  buildSheetGroups,
  pickJobPhoto,
  receiptThumbnailsDecision,
  serviceHistoryJobs,
  type ExportFilters,
  type ExportTable,
} from "@/lib/domain/exports";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type PdfImage = { data: Buffer; format: "jpg" | "png" };

const BUCKET = "attachments";
const JOB_COLUMNS =
  "id, title, type, status, description, notes, completed_on, completed_odometer, performed_by, performer_name, diy_hours, phase_id";

/** Downloads image bytes as the signed-in user (RLS applies). Only JPEG/PNG embed in PDFs. */
async function imageBytes(
  supabase: Supabase,
  path: string | null,
  mime: string,
): Promise<PdfImage | null> {
  if (!path) return null;
  const format =
    /png/.test(mime) || path.endsWith(".png")
      ? "png"
      : /jpe?g/.test(mime) || /\.jpe?g$/i.test(path)
        ? "jpg"
        : null;
  if (!format) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return { data: Buffer.from(await data.arrayBuffer()), format };
}

async function partsByJob(
  supabase: Supabase,
  jobIds: string[],
  onlyInstalled: boolean,
) {
  if (!jobIds.length)
    return new Map<
      string,
      {
        name: string;
        brand: string | null;
        oem_part_number: string | null;
        aftermarket_part_number: string | null;
      }[]
    >();
  let query = supabase
    .from("parts")
    .select(
      "job_id, name, brand, oem_part_number, aftermarket_part_number, status",
    )
    .in("job_id", jobIds)
    .order("name");
  if (onlyInstalled) query = query.eq("status", "installed");
  const { data, error } = await query;
  if (error) throw error;
  const map = new Map<string, typeof data>();
  for (const p of data) map.set(p.job_id!, [...(map.get(p.job_id!) ?? []), p]);
  return map;
}

async function paidByJob(supabase: Supabase, jobIds: string[]) {
  if (!jobIds.length) return new Map<string, number>();
  const { data, error } = await supabase
    .from("v_job_costs")
    .select("job_id, paid_cents, committed_cents")
    .in("job_id", jobIds);
  if (error) throw error;
  return new Map(
    data.map((c) => [
      c.job_id!,
      (c.paid_cents ?? 0) + (c.committed_cents ?? 0),
    ]),
  );
}

export async function loadServiceHistory(
  supabase: Supabase,
  vehicle: Vehicle,
  filters: ExportFilters,
  opts: { costs: boolean; receipts: boolean },
) {
  const [{ data: jobs, error }, { data: phases }] = await Promise.all([
    supabase.from("jobs").select(JOB_COLUMNS).eq("status", "done"),
    supabase.from("phases").select("id, name"),
  ]);
  if (error) throw error;
  const entries = serviceHistoryJobs(jobs, filters);
  const ids = entries.map((j) => j.id);
  const [parts, costs] = await Promise.all([
    partsByJob(supabase, ids, false),
    opts.costs
      ? paidByJob(supabase, ids)
      : Promise.resolve(new Map<string, number>()),
  ]);

  const receiptPlan = receiptThumbnailsDecision(entries.length, opts.receipts);
  const receipts = new Map<string, PdfImage[]>();
  if (receiptPlan.include && ids.length) {
    const { data: expenses } = await supabase
      .from("expenses")
      .select("id, job_id")
      .in("job_id", ids);
    const expenseJob = new Map((expenses ?? []).map((e) => [e.id, e.job_id!]));
    const { data: files } = await supabase
      .from("attachments")
      .select("job_id, expense_id, thumb_path, storage_path, mime_type")
      .eq("kind", "receipt")
      .or(
        `job_id.in.(${ids.join(",")})${expenseJob.size ? `,expense_id.in.(${[...expenseJob.keys()].join(",")})` : ""}`,
      );
    for (const f of files ?? []) {
      const jobId =
        f.job_id ?? (f.expense_id ? expenseJob.get(f.expense_id) : undefined);
      const img = jobId
        ? await imageBytes(
            supabase,
            f.thumb_path ?? f.storage_path,
            f.thumb_path ? "image/jpeg" : f.mime_type,
          )
        : null;
      if (jobId && img)
        receipts.set(jobId, [...(receipts.get(jobId) ?? []), img]);
    }
  }
  const phaseName = new Map((phases ?? []).map((p) => [p.id, p.name]));
  return {
    vehicle,
    filters: {
      ...filters,
      phaseName: filters.phase ? (phaseName.get(filters.phase) ?? null) : null,
    },
    showCosts: opts.costs,
    note: receiptPlan.note,
    entries: entries.map((j) => ({
      ...j,
      phaseName: j.phase_id ? (phaseName.get(j.phase_id) ?? null) : null,
      parts: parts.get(j.id) ?? [],
      costCents: opts.costs ? (costs.get(j.id) ?? 0) : null,
      receipts: receipts.get(j.id) ?? [],
    })),
  };
}

export async function loadBuildSheet(
  supabase: Supabase,
  vehicle: Vehicle,
  filters: ExportFilters,
  opts: { costs: boolean },
) {
  const [{ data: jobs, error }, { data: phases }] = await Promise.all([
    supabase
      .from("jobs")
      .select(JOB_COLUMNS)
      .eq("status", "done")
      .eq("type", "modification"),
    supabase.from("phases").select("id, name").order("sort_order"),
  ]);
  if (error) throw error;
  const groups = buildSheetGroups(jobs, phases ?? [], filters);
  const ids = groups.flatMap((g) => g.jobs.map((j) => j.id));
  const [parts, costs, { data: files }] = await Promise.all([
    partsByJob(supabase, ids, true),
    opts.costs
      ? paidByJob(supabase, ids)
      : Promise.resolve(new Map<string, number>()),
    ids.length
      ? supabase
          .from("attachments")
          .select(
            "job_id, kind, highlight, tag, taken_at, storage_path, mime_type",
          )
          .in("job_id", ids)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const photos = new Map<string, PdfImage>();
  for (const id of ids) {
    const pick = pickJobPhoto((files ?? []).filter((f) => f.job_id === id));
    const img = pick
      ? await imageBytes(supabase, pick.storage_path, pick.mime_type)
      : null;
    if (img) photos.set(id, img);
  }
  return {
    vehicle,
    showCosts: opts.costs,
    filters: {
      ...filters,
      phaseName: filters.phase
        ? ((phases ?? []).find((p) => p.id === filters.phase)?.name ?? null)
        : null,
    },
    groups: groups.map((g) => {
      const groupJobs = g.jobs.map((j) => ({
        ...j,
        parts: parts.get(j.id) ?? [],
        costCents: opts.costs ? (costs.get(j.id) ?? 0) : null,
        photo: photos.get(j.id) ?? null,
      }));
      return {
        phaseName: g.phase?.name ?? "Unphased",
        jobs: groupJobs,
        subtotalCents: opts.costs
          ? groupJobs.reduce((s, j) => s + (j.costCents ?? 0), 0)
          : null,
      };
    }),
  };
}

/** Every row of one table (RLS limits it to the owner). */
export async function loadTable(
  supabase: Supabase,
  table: ExportTable,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data as Record<string, unknown>[];
}
