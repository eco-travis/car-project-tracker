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
