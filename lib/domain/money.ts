const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Formats integer cents as USD for display, e.g. 123456 -> "$1,234.56". */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents))
    throw new RangeError(`Cents must be a safe integer, got ${cents}`);
  return usd.format(cents / 100);
}

/**
 * Parses a user-typed dollar amount ("1,234.5", "$80", "-20") into integer cents.
 * Returns null for blank input and NaN for anything unparseable or with more than 2 decimals.
 */
export function parseDollarsToCents(input: string): number | null {
  const s = input.trim().replace(/[$,\s]/g, "");
  if (s === "") return null;
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$|^(-)?\.(\d{1,2})$/.exec(s);
  if (!match) return NaN;
  const negative = Boolean(match[1] ?? match[4]);
  const whole = match[2] ?? "0";
  const frac = (match[3] ?? match[5] ?? "").padEnd(2, "0");
  const cents = Number(whole) * 100 + Number(frac);
  if (!Number.isSafeInteger(cents)) return NaN;
  return negative && cents !== 0 ? -cents : cents;
}
