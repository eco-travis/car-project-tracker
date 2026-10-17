import type { JobType } from "./types";

export type ExpenseState = "committed" | "paid";
export type ExpenseCategory =
  | "part"
  | "tool"
  | "shop_labor_bay"
  | "shipping_tax_fees"
  | "fluids_consumables"
  | "other"
  | "sale";
export type Bucket =
  "tools" | "recovered" | "build" | "ownership" | "unassigned";

export type CostSummary = {
  budget: number | null;
  committed: number;
  paid: number;
  /** null when there's no budget (rule 9). */
  remaining: number | null;
  /** Positive overage when over budget (rule 12), otherwise null. */
  overage: number | null;
};

/** Rule 9: committed and paid sum by state (paid includes negatives); remaining = budget - committed - paid. */
export function costSummary(
  budget: number | null,
  expenses: { amount_cents: number; state: ExpenseState }[],
): CostSummary {
  let committed = 0;
  let paid = 0;
  for (const e of expenses) {
    if (e.state === "committed") committed += e.amount_cents;
    else paid += e.amount_cents;
  }
  const remaining = budget === null ? null : budget - committed - paid;
  return {
    budget,
    committed,
    paid,
    remaining,
    overage: remaining !== null && remaining < 0 ? -remaining : null,
  };
}

export type AttributableExpense = {
  amount_cents: number;
  category: ExpenseCategory;
  job_id: string | null;
  phase_id: string | null;
  part_id: string | null;
};
export type JobRef = { id: string; type: JobType; phase_id: string | null };
export type PartRef = { id: string; job_id: string | null };

/** Spec decision: an expense with no job but a part counts toward that part's job. */
export function effectiveJobId(
  e: AttributableExpense,
  parts: Map<string, PartRef>,
): string | null {
  return (
    e.job_id ?? (e.part_id ? (parts.get(e.part_id)?.job_id ?? null) : null)
  );
}

/** Rule 10: the effective phase is the (effective) job's phase, else the expense's own phase. */
export function effectivePhaseId(
  e: AttributableExpense,
  job: JobRef | undefined,
): string | null {
  return job?.phase_id ?? e.phase_id;
}

/** Rule 11: reporting bucket. Must match v_expense_attribution. */
export function expenseBucket(
  e: AttributableExpense,
  job: JobRef | undefined,
): Bucket {
  if (e.category === "tool") return "tools";
  if (e.amount_cents < 0) return "recovered";
  if (job) return job.type === "modification" ? "build" : "ownership";
  if (e.phase_id) return "build";
  return "unassigned";
}

export type VehicleTotals = Record<Bucket, number> & {
  committed: number;
  paid: number;
  totalInvested: number;
};

/** What acquiring the vehicle cost: price + sales tax + licensing and registration at purchase. */
export function purchaseCost(v: {
  purchase_price_cents: number | null;
  purchase_tax_cents: number | null;
  purchase_fees_cents: number | null;
}): number {
  return (
    (v.purchase_price_cents ?? 0) +
    (v.purchase_tax_cents ?? 0) +
    (v.purchase_fees_cents ?? 0)
  );
}

/** Rule 11: buckets of paid money, plus committed, and total invested = purchase cost + all paid. */
export function vehicleTotals(
  purchaseCostCents: number | null,
  expenses: (AttributableExpense & { state: ExpenseState })[],
  jobs: Map<string, JobRef>,
  parts: Map<string, PartRef>,
): VehicleTotals {
  const totals: VehicleTotals = {
    tools: 0,
    recovered: 0,
    build: 0,
    ownership: 0,
    unassigned: 0,
    committed: 0,
    paid: 0,
    totalInvested: 0,
  };
  for (const e of expenses) {
    if (e.state === "committed") {
      totals.committed += e.amount_cents;
      continue;
    }
    const jobId = effectiveJobId(e, parts);
    totals[expenseBucket(e, jobId ? jobs.get(jobId) : undefined)] +=
      e.amount_cents;
    totals.paid += e.amount_cents;
  }
  totals.totalInvested = (purchaseCostCents ?? 0) + totals.paid;
  return totals;
}

/** Rule 13: DIY hours are summed and shown as hours, never converted to money. */
export function totalDiyHours(jobs: { diy_hours: number | null }[]): number {
  return (
    Math.round(jobs.reduce((sum, j) => sum + (j.diy_hours ?? 0), 0) * 100) / 100
  );
}

export function formatHours(hours: number): string {
  return `${hours.toLocaleString("en-US", { maximumFractionDigits: 2 })} h`;
}
