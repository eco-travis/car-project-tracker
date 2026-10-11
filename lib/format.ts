/** "2026-10-10" -> "Oct 10, 2026". Date-only strings are calendar dates, so format them in UTC. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function formatMiles(miles: number | null | undefined): string {
  if (miles === null || miles === undefined) return "";
  return `${miles.toLocaleString("en-US")} mi`;
}

/** Cents -> the dollar string a money input expects ("1234.5" style, no symbol). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

/** "Oct 10, 2026, 9:05 PM" in the owner's time zone. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  }).format(new Date(iso));
}

/** ISO instant -> "YYYY-MM-DDTHH:MM" Pacific wall time, for <input type="datetime-local">. */
export function toPacificLocalInput(iso: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
