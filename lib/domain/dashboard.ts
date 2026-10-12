import type { CostSummary } from "./costs";
import type { PhaseStatus } from "./types";

/** The phase the dashboard features: the first Active phase in plan order, else none. */
export function activePhase<T extends { status: PhaseStatus }>(
  phasesInOrder: T[],
): T | null {
  return phasesInOrder.find((p) => p.status === "active") ?? null;
}

export type BudgetBar = {
  /** Segment widths in percent of the bar (they sum to at most 100). */
  paidPct: number;
  committedPct: number;
  /** Share of the bar that is spending beyond the budget. */
  overPct: number;
  /** Spent (committed + paid) as a percent of budget, rounded; null without a budget. */
  usedPct: number | null;
};

/**
 * Budget bar for a phase: paid and committed against the budget. When over budget the bar
 * scales to total spend and the overage segment shows how far past budget it went (rule 12).
 */
export function budgetBar(c: CostSummary): BudgetBar {
  const paid = Math.max(c.paid, 0);
  const committed = Math.max(c.committed, 0);
  const spent = paid + committed;
  if (c.budget === null || c.budget <= 0) {
    return {
      paidPct: spent ? (paid / spent) * 100 : 0,
      committedPct: spent ? (committed / spent) * 100 : 0,
      overPct: 0,
      usedPct: null,
    };
  }
  const scale = Math.max(c.budget, spent);
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    paidPct: round((paid / scale) * 100),
    committedPct: round((committed / scale) * 100),
    overPct: round((Math.max(spent - c.budget, 0) / scale) * 100),
    usedPct: Math.round((spent / c.budget) * 100),
  };
}
