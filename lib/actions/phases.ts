"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { phaseSchema } from "@/lib/schemas/phase";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

export async function createPhase(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = phaseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("phases")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("phases")
    .insert({
      ...parsed.data,
      vehicle_id: vehicle.id,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) return fail("Couldn't create the phase.");
  refreshApp();
  return ok({ id: data.id });
}

export async function updatePhase(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const phaseId = z.uuid().safeParse(id);
  const parsed = phaseSchema.safeParse(input);
  if (!phaseId.success) return fail("Phase not found.");
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .update(parsed.data)
    .eq("id", phaseId.data)
    .select("id");
  if (error) return fail("Couldn't save the phase.");
  if (!data.length) return fail("Phase not found.");
  refreshApp();
  return ok();
}

/** Rule 22: jobs stay in place with phase_id = null (FK on delete set null). The UI confirms first. */
export async function deletePhase(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const phaseId = z.uuid().safeParse(id);
  if (!phaseId.success) return fail("Phase not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("phases")
    .delete()
    .eq("id", phaseId.data)
    .select("id");
  if (error) return fail("Couldn't delete the phase.");
  if (!data.length) return fail("Phase not found.");
  refreshApp();
  return ok();
}

export async function reorderPhases(ids: unknown): Promise<ActionResult> {
  await requireVehicle();
  const parsed = z.array(z.uuid()).min(1).safeParse(ids);
  if (!parsed.success) return fail("Invalid order.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_phases", {
    p_phase_ids: parsed.data,
  });
  if (error) return fail("Couldn't save the new order.");
  refreshApp();
  return ok();
}
