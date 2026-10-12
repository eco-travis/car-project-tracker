import { z } from "zod";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined)
  .transform((v) => v ?? null);
const flag = (fallback: boolean) =>
  z
    .enum(["0", "1"])
    .optional()
    .catch(undefined)
    .transform((v) => (v === undefined ? fallback : v === "1"));

/** Query options shared by both PDFs (plan: from, to, phase, costs, receipts). */
export const pdfOptionsSchema = z.object({
  from: date,
  to: date,
  phase: z
    .uuid()
    .optional()
    .catch(undefined)
    .transform((v) => v ?? null),
  costs: flag(true),
  receipts: flag(false),
});

export function parsePdfOptions(url: URL) {
  return pdfOptionsSchema.parse(Object.fromEntries(url.searchParams));
}
