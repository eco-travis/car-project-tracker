"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { todayIso } from "@/lib/domain/dates";
import {
  closeWatchItem as closeFields,
  resolveFollowup,
} from "@/lib/domain/watch";
import {
  checkinSchema,
  followupSchema,
  promoteSchema,
  toFollowupInput,
  watchItemSchema,
} from "@/lib/schemas/watch";
import { linksBelongToVehicle } from "./ownership";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

const NOT_FOUND = "Watch item not found.";

/** Flow 7: create a watch item, with an optional first check-in (today, current odometer). */
export async function createWatchItem(
  input: unknown,
): Promise<ActionResult<{ id: string; checkinId: string | null }>> {
  const vehicle = await requireVehicle();
  const parsed = watchItemSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { title, description, system, severity, first_observation } =
    parsed.data;
  const today = todayIso();
  const followup = resolveFollowup(
    toFollowupInput(parsed.data),
    today,
    vehicle.current_odometer,
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_items")
    .insert({
      vehicle_id: vehicle.id,
      title,
      description,
      system,
      severity,
      ...followup,
    })
    .select("id")
    .single();
  if (error) return fail("Couldn't create the watch item.");

  let checkinId: string | null = null;
  if (first_observation) {
    const { data: checkin, error: checkinError } = await supabase
      .from("watch_checkins")
      .insert({
        watch_item_id: data.id,
        checked_on: today,
        odometer: vehicle.current_odometer,
        observation: first_observation,
      })
      .select("id")
      .single();
    if (checkinError) {
      await supabase.from("watch_items").delete().eq("id", data.id);
      return fail("Couldn't save the first check-in.");
    }
    checkinId = checkin.id;
  }
  refreshApp();
  return ok({ id: data.id, checkinId });
}

export async function updateWatchItem(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const itemId = z.uuid().safeParse(id);
  const parsed = watchItemSchema.safeParse(input);
  if (!itemId.success) return fail(NOT_FOUND);
  if (!parsed.success) return invalid(parsed.error);
  const { title, description, system, severity } = parsed.data;
  const followup = resolveFollowup(
    toFollowupInput(parsed.data),
    todayIso(),
    vehicle.current_odometer,
  );
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_items")
    .update({ title, description, system, severity, ...followup })
    .eq("id", itemId.data)
    .select("id");
  if (error) return fail("Couldn't save the watch item.");
  if (!data.length) return fail(NOT_FOUND);
  refreshApp();
  return ok();
}

export async function deleteWatchItem(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const itemId = z.uuid().safeParse(id);
  if (!itemId.success) return fail(NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_items")
    .delete()
    .eq("id", itemId.data)
    .select("id");
  if (error) return fail("Couldn't delete the watch item.");
  if (!data.length) return fail(NOT_FOUND);
  refreshApp();
  return ok();
}

/** Flow 8 step 1. A higher odometer raises the vehicle's (rule 14, trigger). */
export async function createCheckin(
  itemId: unknown,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireVehicle();
  const id = z.uuid().safeParse(itemId);
  const parsed = checkinSchema.safeParse(input);
  if (!id.success) return fail(NOT_FOUND);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("watch_items")
    .select("id")
    .eq("id", id.data)
    .maybeSingle();
  if (!item) return fail(NOT_FOUND);
  const { data, error } = await supabase
    .from("watch_checkins")
    .insert({ watch_item_id: id.data, ...parsed.data })
    .select("id")
    .single();
  if (error) return fail("Couldn't save the check-in.");
  refreshApp();
  return ok({ id: data.id });
}

export async function deleteCheckin(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const checkinId = z.uuid().safeParse(id);
  if (!checkinId.success) return fail("Check-in not found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("watch_checkins")
    .delete()
    .eq("id", checkinId.data);
  if (error) return fail("Couldn't delete the check-in.");
  refreshApp();
  return ok();
}

/** Flow 8 option: set the next follow-up (rule 16). */
export async function setFollowup(
  itemId: unknown,
  input: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const id = z.uuid().safeParse(itemId);
  const parsed = followupSchema.safeParse(input);
  if (!id.success) return fail(NOT_FOUND);
  if (!parsed.success) return invalid(parsed.error);
  const followup = resolveFollowup(
    toFollowupInput(parsed.data),
    todayIso(),
    vehicle.current_odometer,
  );
  if (
    followup.next_followup_on === null &&
    followup.next_followup_odometer === null
  ) {
    return fail("Set a date, a mileage, or both.", {
      followup_in_amount: ["Set a date, a mileage, or both."],
    });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_items")
    .update(followup)
    .eq("id", id.data)
    .select("id");
  if (error) return fail("Couldn't set the follow-up.");
  if (!data.length) return fail(NOT_FOUND);
  refreshApp();
  return ok();
}

/** Rule 17 via the promote_watch_item RPC (one transaction). */
export async function promoteWatchItem(
  itemId: unknown,
  input: unknown,
): Promise<ActionResult<{ jobId: string }>> {
  const vehicle = await requireVehicle();
  const id = z.uuid().safeParse(itemId);
  const parsed = promoteSchema.safeParse(input);
  if (!id.success) return fail(NOT_FOUND);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (
    await linksBelongToVehicle(supabase, vehicle.id, {
      phases: parsed.data.phase_id,
    })
  ) {
    return fail("Please fix the highlighted fields.", {
      phase_id: ["Pick one of your phases."],
    });
  }
  const { data, error } = await supabase.rpc("promote_watch_item", {
    p_item_id: id.data,
    p_type: parsed.data.type,
    p_phase_id: parsed.data.phase_id ?? undefined,
    p_title: parsed.data.title ?? undefined,
  });
  if (error)
    return fail(
      error.message.includes("watching")
        ? "Only a watching item can be promoted."
        : "Couldn't promote the watch item.",
    );
  refreshApp();
  return ok({ jobId: data });
}

/** Rule 18: resolve or dismiss; check-ins are kept. */
export async function closeWatchItem(
  itemId: unknown,
  status: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const id = z.uuid().safeParse(itemId);
  const s = z.enum(["resolved", "dismissed"]).safeParse(status);
  if (!id.success || !s.success) return fail(NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_items")
    .update(closeFields(s.data, todayIso()))
    .eq("id", id.data)
    .eq("status", "watching")
    .select("id");
  if (error) return fail("Couldn't update the watch item.");
  if (!data.length)
    return fail("Only a watching item can be resolved or dismissed.");
  refreshApp();
  return ok();
}

/** Undo a resolve or dismiss. */
export async function reopenWatchItem(itemId: unknown): Promise<ActionResult> {
  await requireVehicle();
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return fail(NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watch_items")
    .update({ status: "watching", closed_on: null })
    .eq("id", id.data)
    .in("status", ["resolved", "dismissed"])
    .select("id");
  if (error || !data.length) return fail("Couldn't reopen the watch item.");
  refreshApp();
  return ok();
}

export async function linkSuspectedPart(
  itemId: unknown,
  partId: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const item = z.uuid().safeParse(itemId);
  const part = z.uuid().safeParse(partId);
  if (!item.success || !part.success) return fail("Pick a part.");
  const supabase = await createClient();
  if (
    await linksBelongToVehicle(supabase, vehicle.id, {
      watch_items: item.data,
      parts: part.data,
    })
  )
    return fail("Part not found.");
  const { error } = await supabase
    .from("watch_item_parts")
    .insert({ watch_item_id: item.data, part_id: part.data });
  if (error?.code === "23505") return fail("That part is already linked.");
  if (error) return fail("Couldn't link the part.");
  refreshApp();
  return ok();
}

export async function unlinkSuspectedPart(
  itemId: unknown,
  partId: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const item = z.uuid().safeParse(itemId);
  const part = z.uuid().safeParse(partId);
  if (!item.success || !part.success) return fail("Part not found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("watch_item_parts")
    .delete()
    .match({ watch_item_id: item.data, part_id: part.data });
  if (error) return fail("Couldn't unlink the part.");
  refreshApp();
  return ok();
}
