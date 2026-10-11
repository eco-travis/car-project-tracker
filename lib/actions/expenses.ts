"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { expenseSchema, type ExpenseInput } from "@/lib/schemas/expense";
import { linksBelongToVehicle } from "./ownership";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

async function checkLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vehicleId: string,
  e: ExpenseInput,
) {
  const bad = await linksBelongToVehicle(supabase, vehicleId, {
    jobs: e.job_id,
    phases: e.phase_id,
    parts: e.part_id,
    tools: e.tool_id,
  });
  return bad
    ? fail("Please fix the highlighted fields.", {
        [bad]: ["Pick one of your records."],
      })
    : null;
}

/** Rule 6 (part moves to Ordered) runs in the expenses_mark_part_ordered trigger, same transaction. */
export async function createExpense(input: unknown): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const linkError = await checkLinks(supabase, vehicle.id, parsed.data);
  if (linkError) return linkError;

  const { error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, vehicle_id: vehicle.id });
  if (error) return fail("Couldn't add the expense.");
  refreshApp();
  return ok();
}

export async function updateExpense(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const expenseId = z.uuid().safeParse(id);
  const parsed = expenseSchema.safeParse(input);
  if (!expenseId.success) return fail("Expense not found.");
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("expenses")
    .select("category")
    .eq("id", expenseId.data)
    .maybeSingle();
  if (!current) return fail("Expense not found.");
  if (current.category === "sale")
    return fail(
      "Sale entries come from Record sale. Delete and record the sale again to change it.",
    );
  const linkError = await checkLinks(supabase, vehicle.id, parsed.data);
  if (linkError) return linkError;

  const { error } = await supabase
    .from("expenses")
    .update(parsed.data)
    .eq("id", expenseId.data);
  if (error) return fail("Couldn't save the expense.");
  refreshApp();
  return ok();
}

/** Flow 3: marking a committed expense Paid moves it from committed to paid. */
export async function markExpensePaid(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const expenseId = z.uuid().safeParse(id);
  if (!expenseId.success) return fail("Expense not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({ state: "paid" })
    .eq("id", expenseId.data)
    .select("id");
  if (error) return fail("Couldn't update the expense.");
  if (!data.length) return fail("Expense not found.");
  refreshApp();
  return ok();
}

export async function deleteExpense(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const expenseId = z.uuid().safeParse(id);
  if (!expenseId.success) return fail("Expense not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId.data)
    .select("id");
  if (error) return fail("Couldn't delete the expense.");
  if (!data.length) return fail("Expense not found.");
  refreshApp();
  return ok();
}
