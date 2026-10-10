import { z } from "zod";
import {
  MAX_ODOMETER,
  optionalDate,
  optionalInt,
  optionalMoney,
  optionalText,
} from "./fields";

export const vehicleSchema = z.object({
  name: z.string().trim().min(1, "Give the vehicle a name."),
  year: optionalInt("Year", 1886, 2100),
  model: optionalText,
  generation: optionalText,
  vin: optionalText.transform((v) => v?.toUpperCase() ?? null),
  current_odometer: optionalInt("Odometer", 0, MAX_ODOMETER).transform(
    (n) => n ?? 0,
  ),
  purchase_date: optionalDate,
  purchase_price_cents: optionalMoney("Purchase price"),
});

/** Vehicle page edits. The odometer has its own form (it can only go up). */
export const vehicleUpdateSchema = vehicleSchema
  .omit({ current_odometer: true })
  .extend({ notes: optionalText });

export type VehicleUpdateFormValues = z.input<typeof vehicleUpdateSchema>;
export type VehicleUpdateInput = z.output<typeof vehicleUpdateSchema>;

export const odometerSchema = z.object({
  current_odometer: optionalInt("Odometer", 0, MAX_ODOMETER).refine(
    (n) => n !== null,
    "Enter the odometer reading.",
  ),
});

/** Form values: every input is a string. */
export type VehicleFormValues = z.input<typeof vehicleSchema>;
export type VehicleInput = z.output<typeof vehicleSchema>;
