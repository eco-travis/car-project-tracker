"use server";

import { z } from "zod";
import { requireVehicle } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import {
  jobFromInspiration,
  overwriteConfirmation,
  partFromInspiration,
} from "@/lib/domain/inspiration";
import {
  inspirationSchema,
  promoteInspirationSchema,
} from "@/lib/schemas/inspiration";
import { linksBelongToVehicle } from "./ownership";
import { refreshApp } from "./refresh";
import { fail, invalid, ok, type ActionResult } from "./result";

const NOT_FOUND = "Inspiration not found.";

export async function createInspiration(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const vehicle = await requireVehicle();
  const parsed = inspirationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspirations")
    .insert({ ...parsed.data, vehicle_id: vehicle.id })
    .select("id")
    .single();
  if (error) return fail("Couldn't save the idea.");
  refreshApp();
  return ok({ id: data.id });
}

export async function updateInspiration(
  id: unknown,
  input: unknown,
): Promise<ActionResult> {
  await requireVehicle();
  const inspId = z.uuid().safeParse(id);
  const parsed = inspirationSchema.safeParse(input);
  if (!inspId.success) return fail(NOT_FOUND);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspirations")
    .update(parsed.data)
    .eq("id", inspId.data)
    .select("id");
  if (error) return fail("Couldn't save the idea.");
  if (!data.length) return fail(NOT_FOUND);
  refreshApp();
  return ok();
}

/** Deletes the card and its images (rows cascade; storage objects removed here). */
export async function deleteInspiration(id: unknown): Promise<ActionResult> {
  await requireVehicle();
  const inspId = z.uuid().safeParse(id);
  if (!inspId.success) return fail(NOT_FOUND);
  const supabase = await createClient();
  const { data: files } = await supabase
    .from("attachments")
    .select("storage_path, thumb_path")
    .eq("inspiration_id", inspId.data);
  const paths = (files ?? []).flatMap((f) => [
    f.storage_path,
    ...(f.thumb_path ? [f.thumb_path] : []),
  ]);
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove(paths);
    if (storageError) return fail("Couldn't delete the images.");
  }
  const { data, error } = await supabase
    .from("inspirations")
    .delete()
    .eq("id", inspId.data)
    .select("id");
  if (error) return fail("Couldn't delete the idea.");
  if (!data.length) return fail(NOT_FOUND);
  refreshApp();
  return ok();
}

export type PromoteResult =
  | { status: "promoted"; href: string }
  /** Rule 19: an existing link needs confirmation before it's overwritten. */
  | { status: "confirm"; message: string };

/** Flow 4 / rule 19: create a Wishlist part or a Not started job; the card keeps the link. */
export async function promoteInspiration(
  id: unknown,
  input: unknown,
): Promise<ActionResult<PromoteResult>> {
  const vehicle = await requireVehicle();
  const inspId = z.uuid().safeParse(id);
  const parsed = promoteInspirationSchema.safeParse(input);
  if (!inspId.success) return fail(NOT_FOUND);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: insp } = await supabase
    .from("inspirations")
    .select("title, source_url, notes, promoted_part_id, promoted_job_id")
    .eq("id", inspId.data)
    .maybeSingle();
  if (!insp) return fail(NOT_FOUND);

  const promote = parsed.data;
  const confirm = overwriteConfirmation(insp, promote.target);
  if (confirm && !promote.overwrite)
    return ok({ status: "confirm", message: confirm });

  if (promote.target === "part") {
    const values = partFromInspiration(insp);
    const { data, error } = await supabase.rpc("promote_inspiration_to_part", {
      p_inspiration_id: inspId.data,
      p_name: values.name,
      p_product_url: values.product_url ?? undefined,
      p_notes: values.notes ?? undefined,
      p_overwrite: promote.overwrite,
    });
    if (error) return fail("Couldn't create the part.");
    refreshApp();
    return ok({ status: "promoted", href: `/parts/${data}` });
  }

  if (
    await linksBelongToVehicle(supabase, vehicle.id, {
      phases: promote.phase_id,
    })
  ) {
    return fail("Please fix the highlighted fields.", {
      phase_id: ["Pick one of your phases."],
    });
  }
  const values = jobFromInspiration(insp, {
    phase_id: promote.phase_id,
    type: promote.type,
  });
  const { data, error } = await supabase.rpc("promote_inspiration_to_job", {
    p_inspiration_id: inspId.data,
    p_title: values.title,
    p_type: values.type,
    p_phase_id: values.phase_id ?? undefined,
    p_description: values.description ?? undefined,
    p_links: values.links,
    p_overwrite: promote.overwrite,
  });
  if (error) return fail("Couldn't create the job.");
  refreshApp();
  return ok({ status: "promoted", href: `/jobs/${data}` });
}
