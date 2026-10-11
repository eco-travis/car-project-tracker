import { z } from "zod";
import { parseDollarsToCents } from "@/lib/domain/money";

/** Upper bound for odometer inputs (miles). Well inside Postgres int range. */
export const MAX_ODOMETER = 9_999_999;

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

/** "" -> null, otherwise one of `values`. For optional native <select>s. */
export function optionalEnum<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z
    .string()
    .transform((s) => (s === "" ? null : s))
    .pipe(z.enum(values).nullable());
}

/** "" -> null, otherwise a UUID. For optional record pickers. */
export const optionalId = z
  .string()
  .transform((s) => (s === "" ? null : s))
  .pipe(z.uuid("Pick a valid option.").nullable());

/** Blank -> null, otherwise a non-negative number with at most 2 decimals (e.g. DIY hours). */
export function optionalDecimal(label: string, max = 9999.99) {
  return z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(s) || Number(s) > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be a number like 2.5.`,
        });
        return z.NEVER;
      }
      return Number(s);
    });
}

/** One URL per line -> string[] (blank lines dropped). */
export const urlLines = z.string().transform((s, ctx) => {
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (!z.url({ protocol: /^https?$/ }).safeParse(line).success) {
      ctx.addIssue({
        code: "custom",
        message: `"${line}" isn't a valid http(s) link.`,
      });
      return z.NEVER;
    }
  }
  return lines;
});

/** Required YYYY-MM-DD date. */
export const requiredDate = optionalDate
  .refine((d) => d !== null, "Enter a date.")
  .transform((d) => d!);

/** Required non-zero dollar amount -> cents. */
export function requiredMoney(label: string, { allowNegative = false } = {}) {
  return optionalMoney(label, { allowNegative })
    .refine((c) => c !== null, `Enter the ${label.toLowerCase()}.`)
    .refine((c) => c !== 0, `${label} can't be zero.`)
    .transform((c) => c!);
}

/** Comma- or newline-separated list -> trimmed, de-duplicated string[]. */
export const textList = z.string().transform((s) => [
  ...new Set(
    s
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
]);

/** Blank -> null, otherwise an http(s) URL. */
export const optionalUrl = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : s))
  .pipe(
    z
      .url({
        protocol: /^https?$/,
        message: "Enter a full link starting with https://",
      })
      .nullable(),
  );
