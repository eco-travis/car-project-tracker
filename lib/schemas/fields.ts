import { z } from "zod";
import { parseDollarsToCents } from "@/lib/domain/money";

/** Blank -> null, otherwise the trimmed string. */
export const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s));

/** Blank -> null, otherwise a whole number within [min, max]. Commas allowed. */
export function optionalInt(
  label: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
) {
  return z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s.replace(/,/g, ""));
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be a whole number from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`,
        });
        return z.NEVER;
      }
      return n;
    });
}

/** Blank -> null, otherwise integer cents. */
export function optionalMoney(label: string, { allowNegative = false } = {}) {
  return z.string().transform((s, ctx) => {
    const cents = parseDollarsToCents(s);
    if (cents === null) return null;
    if (Number.isNaN(cents)) {
      ctx.addIssue({
        code: "custom",
        message: `${label} must be a dollar amount like 1,234.56.`,
      });
      return z.NEVER;
    }
    if (!allowNegative && cents < 0) {
      ctx.addIssue({ code: "custom", message: `${label} can't be negative.` });
      return z.NEVER;
    }
    return cents;
  });
}

/** Blank -> null, otherwise a YYYY-MM-DD date string (as produced by <input type="date">). */
export const optionalDate = z
  .string()
  .trim()
  .transform((s, ctx) => {
    if (s === "") return null;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
      Number.isNaN(Date.parse(`${s}T00:00:00Z`))
    ) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return s;
  });
