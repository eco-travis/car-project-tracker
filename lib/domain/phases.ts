/** Rule 21: phases seeded for a new vehicle, in order. They are ordinary records afterwards. */
export const SEED_PHASE_NAMES = [
  "Baseline maintenance",
  "Suspension and tires",
  "Armor and recovery",
  "Electrical and lighting",
  "Sleep and storage",
] as const;

export function seedPhaseNames(): string[] {
  return [...SEED_PHASE_NAMES];
}

/** Rule 22: confirmation shown before deleting a phase; its jobs stay, unphased. */
export function phaseDeleteConfirmation(
  phaseName: string,
  jobCount: number,
): string {
  if (jobCount === 0) return `Delete "${phaseName}"? It has no jobs.`;
  const jobs = jobCount === 1 ? "1 job" : `${jobCount} jobs`;
  return `Delete "${phaseName}"? Its ${jobs} will stay in the plan as unphased.`;
}

/** Moves the item at `from` to `to` and returns the new id order (for drag-to-reorder). */
export function reorderIds(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return ids;
  next.splice(to, 0, moved);
  return next;
}
