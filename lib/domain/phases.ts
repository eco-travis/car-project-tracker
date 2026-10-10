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
