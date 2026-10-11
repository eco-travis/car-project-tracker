"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { todayIso } from "@/lib/domain/dates";
import { recordSaleError, saleExpense } from "@/lib/domain/parts";
import { partSchema, partStatusSchema } from "@/lib/schemas/part";
import { saleSchema } from "@/lib/schemas/expense";
import { linksBelongToVehicle } from "./ownership";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

const BAD_LINK = "Please fix the highlighted fields.";

export async function createPart(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = partSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const badLink = await linksBelongToVehicle(supabase, vehicle.id, {
    jobs: parsed.data.job_id,
    parts: parsed.data.replaces_part_id,
  });
  if (badLink)
    return fail(BAD_LINK, {
      [badLink === "part_id" ? "replaces_part_id" : badLink]: [
        "Pick one of your records.",
      ],
    });

  const { data, error } = await supabase
    .from("parts")
    .insert({ ...parsed.data, vehicle_id: vehicle.id })
    .select("id")
    .single();
  if (error) return fail("Couldn't create the part.");
  refreshApp();
  return ok({ id: data.id });
}

export async function updatePart(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const partId = z.uuid().safeParse(id);
  const parsed = partSchema.safeParse(input);
  if (!partId.success) return fail("Part not found.");
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.replaces_part_id === partId.data) {
    return fail(BAD_LINK, {
      replaces_part_id: ["A part can't replace itself."],
    });
  }
  const supabase = await createClient();
  const badLink = await linksBelongToVehicle(supabase, vehicle.id, {
    jobs: parsed.data.job_id,
    parts: parsed.data.replaces_part_id,
  });
  if (badLink)
    return fail(BAD_LINK, {
      [badLink === "part_id" ? "replaces_part_id" : badLink]: [
        "Pick one of your records.",
      ],
    });

  const { data, error } = await supabase
    .from("parts")
    .update(parsed.data)
    .eq("id", partId.data)
    .select("id");
  if (error) return fail("Couldn't save the part.");
  if (!data.length) return fail("Part not found.");
  refreshApp();
  return ok();
}

export async function deletePart(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const partId = z.uuid().safeParse(id);
  if (!partId.success) return fail("Part not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .delete()
    .eq("id", partId.data)
    .select("id");
  if (error) return fail("Couldn't delete the part.");
  if (!data.length) return fail("Part not found.");
  refreshApp();
  return ok();
}

/** Rule 8: any status can be set by hand. */
export async function setPartStatus(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const partId = z.uuid().safeParse(id);
  const parsed = partStatusSchema.safeParse(input);
  if (!partId.success || !parsed.success) return fail("Pick a valid status.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parts")
    .update(parsed.data)
    .eq("id", partId.data)
    .select("id");
  if (error) return fail("Couldn't change the status.");
  if (!data.length) return fail("Part not found.");
  refreshApp();
  return ok();
}

/** Link an existing part to a job (from the job page). */
export async function linkPartToJob(
  partIdInput: unknown,
  jobIdInput: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const partId = z.uuid().safeParse(partIdInput);
  const jobId = z.uuid().safeParse(jobIdInput);
  if (!partId.success || !jobId.success) return fail("Pick a part.");
  const supabase = await createClient();
  if (
    await linksBelongToVehicle(supabase, vehicle.id, {
      jobs: jobId.data,
      parts: partId.data,
    })
  )
    return fail("Part not found.");
  const { error } = await supabase
    .from("parts")
    .update({ job_id: jobId.data })
    .eq("id", partId.data);
  if (error) return fail("Couldn't link the part.");
  refreshApp();
  return ok();
}

/**
 * Rule 7: Record sale on a Removed part (atomic RPC). Returns open tasks linked to the part so
 * the UI can offer to mark them done.
 */
export async function recordSale(
  id: unknown,
  input: unknown,
): Promise<ActionResult<{ openTasks: { id: string; title: string }[] }>> {
  await requireVehicle();
  const partId = z.uuid().safeParse(id);
  const parsed = saleSchema.safeParse(input);
  if (!partId.success) return fail("Part not found.");
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: part } = await supabase
    .from("parts")
    .select("status")
    .eq("id", partId.data)
    .maybeSingle();
  if (!part) return fail("Part not found.");
  const notSellable = recordSaleError(part.status);
  if (notSellable) return fail(notSellable);

  const sale = saleExpense(parsed.data.price_cents);
  const { error } = await supabase.rpc("record_part_sale", {
    p_part_id: partId.data,
    p_price_cents: -sale.amount_cents,
    p_spent_on: parsed.data.spent_on,
    p_vendor: parsed.data.vendor ?? undefined,
    p_notes: parsed.data.notes ?? undefined,
  });
  if (error) return fail("Couldn't record the sale.");

  const { data: links } = await supabase
    .from("task_links")
    .select("task:tasks(id, title, status)")
    .eq("part_id", partId.data);
  const openTasks = (links ?? [])
    .map((l) => l.task)
    .filter(
      (
        t,
      ): t is {
        id: string;
        title: string;
        status: "open" | "done" | "dropped";
      } => t?.status === "open",
    )
    .map(({ id, title }) => ({ id, title }));
  refreshApp();
  return ok({ openTasks });
}

/** Rule 7 follow-up (and rule 20): marking tasks done changes nothing else. */
export async function completeTasks(ids: unknown): Promise<ActionResult> {
  await requireVehicle();
  const parsed = z.array(z.uuid()).min(1).safeParse(ids);
  if (!parsed.success) return fail("No tasks selected.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_on: todayIso() })
    .in("id", parsed.data)
    .eq("status", "open");
  if (error) return fail("Couldn't update the tasks.");
  refreshApp();
  return ok();
}
