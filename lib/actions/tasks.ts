"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import {
  getTaskLinkOptions,
  type TaskLinkOptions,
} from "@/lib/db/queries/tasks";
import { todayIso } from "@/lib/domain/dates";
import { reopenTask, taskStatusUpdate } from "@/lib/domain/tasks";
import { taskSchema, type TaskLinkInput } from "@/lib/schemas/task";
import { linksBelongToVehicle } from "./ownership";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function linksValid(
  supabase: Supabase,
  vehicleId: string,
  links: TaskLinkInput[],
) {
  for (const l of links) {
    const bad = await linksBelongToVehicle(supabase, vehicleId, {
      jobs: l.job_id,
      parts: l.part_id,
      phases: l.phase_id,
      watch_items: l.watch_item_id,
    });
    if (bad) return false;
  }
  return true;
}

export async function createTask(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (!(await linksValid(supabase, vehicle.id, parsed.data.links)))
    return fail("A linked record wasn't found.");
  const { data, error } = await supabase.rpc("create_task_with_links", {
    p_title: parsed.data.title,
    p_notes: parsed.data.notes ?? undefined,
    p_due_on: parsed.data.due_on ?? undefined,
    p_links: parsed.data.links,
  });
  if (error) return fail("Couldn't create the task.");
  refreshApp();
  return ok({ id: data });
}

export async function updateTask(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  const vehicle = await requireVehicle();
  const taskId = z.uuid().safeParse(id);
  const parsed = taskSchema.safeParse(input);
  if (!taskId.success) return fail("Task not found.");
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  if (!(await linksValid(supabase, vehicle.id, parsed.data.links)))
    return fail("A linked record wasn't found.");
  const { title, notes, due_on, links } = parsed.data;
  const { data, error } = await supabase
    .from("tasks")
    .update({ title, notes, due_on })
    .eq("id", taskId.data)
    .select("id");
  if (error) return fail("Couldn't save the task.");
  if (!data.length) return fail("Task not found.");
  const { error: linkError } = await supabase.rpc("set_task_links", {
    p_task_id: taskId.data,
    p_links: links,
  });
  if (linkError) return fail("Saved the task, but couldn't update its links.");
  refreshApp();
  return ok();
}

/** Rule 20: completing, dropping, or reopening a task changes only the task. */
export async function setTaskStatus(
  id: unknown,
  status: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const taskId = z.uuid().safeParse(id);
  const s = z.enum(["open", "done", "dropped"]).safeParse(status);
  if (!taskId.success || !s.success) return fail("Task not found.");
  const update =
    s.data === "open" ? reopenTask() : taskStatusUpdate(s.data, todayIso());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId.data)
    .select("id");
  if (error) return fail("Couldn't update the task.");
  if (!data.length) return fail("Task not found.");
  refreshApp();
  return ok();
}

export async function deleteTask(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const taskId = z.uuid().safeParse(id);
  if (!taskId.success) return fail("Task not found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId.data)
    .select("id");
  if (error) return fail("Couldn't delete the task.");
  if (!data.length) return fail("Task not found.");
  refreshApp();
  return ok();
}

/** Lazy-loaded link pickers for the task dialog (used by quick-add). */
export async function loadTaskLinkOptions(): Promise<TaskLinkOptions> {
  await requireVehicle();
  return getTaskLinkOptions();
}
