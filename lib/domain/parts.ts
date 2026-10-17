import type { PartStatus } from "./types";

/** Statuses an expense advances to Ordered (rule 6). */
export const PRE_ORDER_STATUSES: readonly PartStatus[] = [
  "idea",
  "researching",
  "wishlist",
];

/** Rule 6: creating an expense linked to a part still in planning marks it Ordered. */
export function partStatusAfterExpense(status: PartStatus): PartStatus {
  return PRE_ORDER_STATUSES.includes(status) ? "ordered" : status;
}

/** Rule 7: only a Removed part can be sold. */
export function recordSaleError(status: PartStatus): string | null {
  return status === "removed"
    ? null
    : "Only a part marked Removed can be sold. Set its status to Removed first.";
}

/** Rule 7: the ledger entry for a sale. The user enters the price as a positive amount. */
export function saleExpense(priceCents: number): {
  category: "sale";
  state: "paid";
  amount_cents: number;
} {
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0)
    throw new RangeError("Sale price must be a positive amount.");
  return { category: "sale", state: "paid", amount_cents: -priceCents };
}

/** Parts in planning (not yet ordered) on a job or phase: the "what's missing" list (flow 5). */
export function partsNotOrdered<T extends { status: PartStatus }>(
  parts: T[],
): T[] {
  return parts.filter((p) => PRE_ORDER_STATUSES.includes(p.status));
}

/**
 * Install date (Travis, 2026-10-16): an Installed part gets a date. Keep one the user entered;
 * otherwise use the fallback (today, or the job's completion date when Mark done installs it).
 */
export function installedOnFor(
  status: PartStatus,
  installedOn: string | null,
  fallback: string,
): string | null {
  if (installedOn) return installedOn;
  return status === "installed" ? fallback : null;
}

/** Statuses that mean the part was bought, so Add/Edit part require its cost (Travis, 2026-10-16). */
export const COST_REQUIRED_STATUSES: readonly PartStatus[] = [
  "ordered",
  "received",
  "installed",
];

/**
 * A part's cost is required once it's bought, or once it already has a recorded cost (which Edit
 * part changes). Planning-stage parts (and removed stock parts) don't need one.
 */
export function partCostError(
  status: PartStatus,
  costCents: number | null,
  hasRecordedCost = false,
): string | null {
  const required = COST_REQUIRED_STATUSES.includes(status) || hasRecordedCost;
  if (!required) return null;
  if (costCents === null || costCents <= 0) return "Enter what it cost.";
  return null;
}
