import { z } from "zod";
import {
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
  current_odometer: optionalInt("Odometer").transform((n) => n ?? 0),
  purchase_date: optionalDate,
  purchase_price_cents: optionalMoney("Purchase price"),
});

/** Form values: every input is a string. */
export type VehicleFormValues = z.input<typeof vehicleSchema>;
export type VehicleInput = z.output<typeof vehicleSchema>;
