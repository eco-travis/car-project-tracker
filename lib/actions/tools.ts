"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { todayIso } from "@/lib/domain/dates";
import { jobToolSchema, newToolSchema, toolSchema } from "@/lib/schemas/tool";
import { linksBelongToVehicle } from "./ownership";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

export async function createTool(
  input: unknown,
  jobId?: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = newToolSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const job = jobId === undefined ? null : z.uuid().safeParse(jobId);
  if (
    job &&
    (!job.success ||
      (await linksBelongToVehicle(supabase, vehicle.id, { jobs: job.data })))
  ) {
    return fail("Job not found.");
  }

  const { cost_cents, ...fields } = parsed.data;
  const { data, error } = await supabase
    .from("tools")
    .insert({ ...fields, vehicle_id: vehicle.id })
    .select("id")
    .single();
  if (error) return fail("Couldn't create the tool.");
  if (cost_cents !== null) {
    // Money lives in the ledger (a tool's cost is the sum of its expenses; rule 4 category).
    const { error: expenseError } = await supabase.from("expenses").insert({
      vehicle_id: vehicle.id,
      tool_id: data.id,
      spent_on: todayIso(),
      amount_cents: cost_cents,
      category: "tool",
      state: "paid",
    });
    if (expenseError) {
      await supabase.from("tools").delete().eq("id", data.id);
      return fail("Couldn't save the cost, so the tool wasn't added.");
    }
  }
  if (job?.success)
    await supabase
      .from("job_tools")
      .insert({ job_id: job.data, tool_id: data.id });
  refreshApp();
  return ok({ id: data.id });
}

export async function updateTool(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const toolId = z.uuid().safeParse(id);
  const parsed = toolSchema.safeParse(input);
  if (!toolId.success) return fail("Tool not found.");
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .update(parsed.data)
    .eq("id", toolId.data)
    .select("id");
  if (error) return fail("Couldn't save the tool.");
  if (!data.length) return fail("Tool not found.");
  refreshApp();
  return ok();
}

export async function deleteTool(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const toolId = z.uuid().safeParse(id);
  if (!toolId.success) return fail("Tool not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .delete()
    .eq("id", toolId.data)
    .select("id");
  if (error) return fail("Couldn't delete the tool.");
  if (!data.length) return fail("Tool not found.");
  refreshApp();
  return ok();
}

export async function linkTool(input: unknown): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const parsed = jobToolSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (
    await linksBelongToVehicle(supabase, vehicle.id, {
      jobs: parsed.data.job_id,
      tools: parsed.data.tool_id,
    })
  ) {
    return fail("Tool not found.");
  }
  const { error } = await supabase.from("job_tools").insert(parsed.data);
  if (error?.code === "23505") return fail("That tool is already on this job.");
  if (error) return fail("Couldn't add the tool.");
  refreshApp();
  return ok();
}

export async function unlinkTool(input: unknown): Promise<ActionResult> {
  await requireVehicle();
  const parsed = jobToolSchema.safeParse(input);
  if (!parsed.success) return fail("Tool not found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("job_tools")
    .delete()
    .match(parsed.data);
  if (error) return fail("Couldn't remove the tool.");
  refreshApp();
  return ok();
}
