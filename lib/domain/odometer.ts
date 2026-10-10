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

/** Rule 14: a manual update may set any value at or above the current reading. */
export function manualOdometerError(
  current: number,
  next: number,
): string | null {
  if (!Number.isInteger(next) || next < 0)
    return "Enter a whole number of miles.";
  if (next < current) {
    return `The odometer can't go down. It's at ${current.toLocaleString("en-US")} miles.`;
  }
  return null;
}
