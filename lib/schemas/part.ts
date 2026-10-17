import { z } from "zod";
import { partCostError } from "@/lib/domain/parts";
import {
  optionalDate,
  optionalId,
  optionalInt,
  optionalMoney,
  optionalText,
  optionalUrl,
  textList,
} from "./fields";

export const PART_STATUSES = [
  "idea",
  "researching",
  "wishlist",
  "ordered",
  "received",
  "installed",
  "removed",
  "sold",
  "returned",
] as const;
export const PART_CATEGORIES = [
  "suspension",
  "armor",
  "lighting",
  "recovery",
  "electrical",
  "tires_wheels",
  "interior",
  "fluids",
  "other",
] as const;

export const partSchema = z.object({
  name: z.string().trim().min(1, "Give the part a name."),
  brand: optionalText,
  category: z.enum(PART_CATEGORIES),
  status: z.enum(PART_STATUSES),
  oem_part_number: optionalText,
  superseded_numbers: textList,
  aftermarket_part_number: optionalText,
  fitment_notes: optionalText,
  job_id: optionalId,
  replaces_part_id: optionalId,
  vendor: optionalText,
  product_url: optionalUrl,
  order_number: optionalText,
  return_by: optionalDate,
  warranty_notes: optionalText,
  quantity: optionalInt("Quantity", 1, 9999).transform((n) => n ?? 1),
  installed_on: optionalDate,
  notes: optionalText,
});

/**
 * Add and Edit part, with the part's cost (its purchase expense). Required once the part is bought
 * (`partCostError`); the server also requires it when a cost is already recorded.
 */
export const newPartSchema = partSchema
  .extend({ cost_cents: optionalMoney("Cost") })
  .superRefine((p, ctx) => {
    const message = partCostError(p.status, p.cost_cents);
    if (message)
      ctx.addIssue({ code: "custom", path: ["cost_cents"], message });
  });

export type PartFormValues = z.input<typeof newPartSchema>;
export type PartInput = z.output<typeof newPartSchema>;

/** Rule 8: any status can be set by hand. */
export const partStatusSchema = z.object({ status: z.enum(PART_STATUSES) });

/** Change just the install date (part page). Required: clearing it isn't offered there. */
export const partInstalledOnSchema = z.object({
  installed_on: z.iso.date("Pick a date."),
});
