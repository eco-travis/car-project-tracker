import "server-only";
import { createClient } from "@/lib/db/server";

export const EXPENSE_SELECT =
  "id, spent_on, amount_cents, category, state, vendor, notes, job_id, phase_id, part_id, tool_id, job:jobs(id, title), phase:phases(id, name), part:parts(id, name), tool:tools(id, name)";

export type ExpenseFilter = {
  job_id?: string;
  part_id?: string;
  tool_id?: string;
  phase_only?: string;
};

export async function getExpenses(filter: ExpenseFilter = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (filter.job_id) query = query.eq("job_id", filter.job_id);
  if (filter.part_id) query = query.eq("part_id", filter.part_id);
  if (filter.tool_id) query = query.eq("tool_id", filter.tool_id);
  if (filter.phase_only)
    query = query.eq("phase_id", filter.phase_only).is("job_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type ExpenseRow = Awaited<ReturnType<typeof getExpenses>>[number];

/** Expenses that count toward a job: its own plus part-only expenses on its parts (spec decision). */
export async function getJobExpenses(jobId: string) {
  const supabase = await createClient();
  const { data: parts } = await supabase
    .from("parts")
    .select("id")
    .eq("job_id", jobId);
  const partIds = (parts ?? []).map((p) => p.id);
  let query = supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .order("spent_on", { ascending: false });
  query = partIds.length
    ? query.or(
        `job_id.eq.${jobId},and(job_id.is.null,part_id.in.(${partIds.join(",")}))`,
      )
    : query.eq("job_id", jobId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
