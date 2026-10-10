/** The owner's time zone. Spec: dates are interpreted in Pacific time. */
export const OWNER_TIME_ZONE = "America/Los_Angeles";

/** Today's calendar date (YYYY-MM-DD) in the owner's time zone. */
export function todayIso(
  now: Date = new Date(),
  timeZone: string = OWNER_TIME_ZONE,
): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
