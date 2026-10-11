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

/** Offset of `timeZone` from UTC at `instant`, in minutes (e.g. -420 for PDT). */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Converts a zone-less wall-clock time (as cameras record it) in `timeZone` to a UTC Date.
 * Spec decision: photo dates are interpreted in Pacific time.
 */
export function wallTimeToUtc(
  wall: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  },
  timeZone: string = OWNER_TIME_ZONE,
): Date {
  const guess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  // Two passes settle the offset across DST boundaries.
  let utc = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60000;
  utc = guess - zoneOffsetMinutes(new Date(utc), timeZone) * 60000;
  return new Date(utc);
}

/** "2026-03" month key for a timestamp, in the owner's time zone (Gallery grouping). */
export function monthKey(
  instant: Date | string,
  timeZone: string = OWNER_TIME_ZONE,
): string {
  return todayIso(new Date(instant), timeZone).slice(0, 7);
}

/** "March 2026" for a month key. */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
