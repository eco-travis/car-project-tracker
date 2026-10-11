import { z } from "zod";
import {
  optionalDate,
  optionalId,
  optionalInt,
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
  notes: optionalText,
});

export type PartFormValues = z.input<typeof partSchema>;
export type PartInput = z.output<typeof partSchema>;

/** Rule 8: any status can be set by hand. */
export const partStatusSchema = z.object({ status: z.enum(PART_STATUSES) });
