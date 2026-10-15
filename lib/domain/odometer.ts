/**
 * Rule 14: a done job or watch check-in reading above the vehicle's current odometer raises it;
 * a lower reading never lowers it.
 */
export function odometerAfterReading(
  current: number,
  reading: number | null | undefined,
): number {
  return reading !== null && reading !== undefined && reading > current
    ? reading
    : current;
}

/**
 * A manual update may set any whole number of miles, lower included, so a mistyped reading can
 * be corrected (Travis's call, 2026-10-14). Automatic raises from jobs and check-ins still never
 * lower it (`odometerAfterReading`).
 */
export function manualOdometerError(next: number): string | null {
  if (!Number.isInteger(next) || next < 0)
    return "Enter a whole number of miles.";
  return null;
}
