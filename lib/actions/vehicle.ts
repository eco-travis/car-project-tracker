"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { seedPhaseNames } from "@/lib/domain/phases";
import { vehicleSchema } from "@/lib/schemas/vehicle";
import { fail, invalid, type ActionResult } from "./result";

/** Onboarding: creates the vehicle and its seeded phases in one transaction (rule 21). */
export async function createVehicle(input: unknown): Promise<ActionResult> {
  await requireUserId();
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_vehicle_with_phases", {
    p_name: v.name,
    p_phase_names: seedPhaseNames(),
    p_year: v.year ?? undefined,
    p_model: v.model ?? undefined,
    p_generation: v.generation ?? undefined,
    p_vin: v.vin ?? undefined,
    p_current_odometer: v.current_odometer,
    p_purchase_date: v.purchase_date ?? undefined,
    p_purchase_price_cents: v.purchase_price_cents ?? undefined,
  });

  if (error?.code === "23505") redirect("/dashboard"); // already onboarded (double submit)
  if (error) {
    console.error("create_vehicle_with_phases failed", error);
    return fail("Couldn't create the vehicle. Try again.");
  }
  redirect("/dashboard");
}
