import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedPhaseNames } from "@/lib/domain/phases";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/local-supabase";

let user: TestUser;
let vehicleId: string;
let phaseId: string;
const ids: Record<string, string> = {};

async function insert(table: string, values: Record<string, unknown>) {
  const { data, error } = await user.client
    .from(table as never)
    .insert(values as never)
    .select("id")
    .single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data as { id: string }).id;
}

const attachment = (o: Record<string, unknown>) =>
  insert("attachments", {
    vehicle_id: vehicleId,
    storage_path: `${user.id}/${crypto.randomUUID()}/a.jpg`,
    mime_type: "image/jpeg",
    size_bytes: 1,
    kind: "photo",
    taken_at: "2026-03-14T17:30:00Z",
    ...o,
  });

beforeAll(async () => {
  user = await createTestUser("media");
  const { data } = await user.client.rpc("create_vehicle_with_phases", {
    p_name: "Media",
    p_phase_names: seedPhaseNames(),
  });
  vehicleId = data!;
  const { data: phases } = await user.client
    .from("phases")
    .select("id, name")
    .order("sort_order");
  phaseId = phases![1].id;
  ids.job = await insert("jobs", {
    vehicle_id: vehicleId,
    phase_id: phaseId,
    title: "Lift",
    type: "modification",
    status: "done",
    completed_on: "2026-03-14",
    completed_odometer: 141500,
  });
  ids.watch = await insert("watch_items", {
    vehicle_id: vehicleId,
    title: "PS pump moan",
  });
  ids.checkin = await insert("watch_checkins", {
    watch_item_id: ids.watch,
    checked_on: "2026-03-20",
    odometer: 141900,
  });
  ids.inspiration = await insert("inspirations", {
    vehicle_id: vehicleId,
    title: "Roof rack idea",
  });

  ids.onJob = await attachment({ job_id: ids.job });
  ids.onPhase = await attachment({ phase_id: phaseId });
  ids.onCheckin = await attachment({
    watch_checkin_id: ids.checkin,
    kind: "clip",
    mime_type: "audio/mp4",
  });
  ids.onInspiration = await attachment({ inspiration_id: ids.inspiration });
  ids.vehicleLevel = await attachment({});
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

describe("v_attachment_details", () => {
  async function row(id: string) {
    const { data } = await user.client
      .from("v_attachment_details")
      .select("*")
      .eq("id", id)
      .single();
    return data!;
  }

  it("gives a job photo its job's phase, title, and completion odometer", async () => {
    expect(await row(ids.onJob)).toMatchObject({
      effective_phase_id: phaseId,
      phase_name: "Suspension and tires",
      job_title: "Lift",
      odometer: 141500,
      parent_kind: "job",
      parent_id: ids.job,
      parent_title: "Lift",
    });
  });

  it("puts phase-level media in that phase with no odometer", async () => {
    expect(await row(ids.onPhase)).toMatchObject({
      effective_phase_id: phaseId,
      job_title: null,
      odometer: null,
      parent_kind: "phase",
    });
  });

  it("reads a check-in clip's odometer and resolves its watch item for scoping and links", async () => {
    expect(await row(ids.onCheckin)).toMatchObject({
      odometer: 141900,
      parent_kind: "watch_checkin",
      parent_title: "PS pump moan",
      effective_watch_item_id: ids.watch,
    });
  });

  it("labels inspiration and vehicle-level media", async () => {
    expect(await row(ids.onInspiration)).toMatchObject({
      parent_kind: "inspiration",
      parent_title: "Roof rack idea",
    });
    expect(await row(ids.vehicleLevel)).toMatchObject({
      parent_kind: "vehicle",
      parent_id: null,
    });
  });

  it("rejects an attachment with two parents", async () => {
    const { error } = await user.client.from("attachments").insert({
      vehicle_id: vehicleId,
      storage_path: `${user.id}/x/two.jpg`,
      mime_type: "image/jpeg",
      size_bytes: 1,
      kind: "photo",
      taken_at: "2026-03-14T17:30:00Z",
      job_id: ids.job,
      phase_id: phaseId,
    });
    expect(error?.code).toBe("23514");
  });
});
