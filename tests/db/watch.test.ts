import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { todayIso } from "@/lib/domain/dates";
import { seedPhaseNames } from "@/lib/domain/phases";
import { addInterval, watchDue } from "@/lib/domain/watch";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/local-supabase";

let user: TestUser;
let vehicleId: string;
const today = todayIso();

async function insert(table: string, values: Record<string, unknown>) {
  const { data, error } = await user.client
    .from(table as never)
    .insert(values as never)
    .select("id")
    .single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data as { id: string }).id;
}

async function odometer() {
  const { data } = await user.client
    .from("vehicles")
    .select("current_odometer")
    .single();
  return data!.current_odometer;
}

beforeAll(async () => {
  user = await createTestUser("watch");
  const { data } = await user.client.rpc("create_vehicle_with_phases", {
    p_name: "Watch",
    p_phase_names: seedPhaseNames(),
    p_current_odometer: 141250,
  });
  vehicleId = data!;
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

describe("v_watch_due (rule 15 + 500-mile decision)", () => {
  it("matches watchDue() for every combination", async () => {
    const cases = [
      { title: "none" },
      { title: "date future", next_followup_on: addInterval(today, 1, "days") },
      { title: "date today", next_followup_on: today },
      {
        title: "date 7 days",
        next_followup_on: addInterval(today, -7, "days"),
      },
      {
        title: "date 8 days",
        next_followup_on: addInterval(today, -8, "days"),
      },
      { title: "miles ahead", next_followup_odometer: 141251 },
      { title: "miles at", next_followup_odometer: 141250 },
      { title: "miles 500 past", next_followup_odometer: 140750 },
      { title: "miles 501 past", next_followup_odometer: 140749 },
      {
        title: "resolved overdue",
        status: "resolved",
        next_followup_on: "2020-01-01",
        closed_on: today,
      },
    ];
    const ids = new Map<string, (typeof cases)[number]>();
    for (const c of cases)
      ids.set(await insert("watch_items", { vehicle_id: vehicleId, ...c }), c);

    const { data: rows } = await user.client
      .from("v_watch_due")
      .select("watch_item_id, is_due, is_overdue");
    for (const row of rows!) {
      const c = ids.get(row.watch_item_id!);
      if (!c) continue;
      const expected = watchDue(
        {
          status: (c.status ?? "watching") as "watching",
          next_followup_on: c.next_followup_on ?? null,
          next_followup_odometer: c.next_followup_odometer ?? null,
        },
        today,
        141250,
      );
      expect({ due: row.is_due, overdue: row.is_overdue }, c.title).toEqual(
        expected,
      );
    }
  });
});

describe("check-in odometer trigger (rule 14)", () => {
  it("raises the vehicle odometer and never lowers it", async () => {
    const item = await insert("watch_items", {
      vehicle_id: vehicleId,
      title: "PS pump moan",
    });
    await insert("watch_checkins", {
      watch_item_id: item,
      checked_on: today,
      odometer: 141900,
    });
    expect(await odometer()).toBe(141900);
    await insert("watch_checkins", {
      watch_item_id: item,
      checked_on: today,
      odometer: 100000,
    });
    expect(await odometer()).toBe(141900);
    await insert("watch_checkins", {
      watch_item_id: item,
      checked_on: today,
      observation: "No reading",
    });
    expect(await odometer()).toBe(141900);
  });
});

describe("promote_watch_item (rule 17)", () => {
  it("creates the job, carries over unassigned suspected parts, and marks the item promoted", async () => {
    const { data: phases } = await user.client
      .from("phases")
      .select("id")
      .order("sort_order");
    const item = await insert("watch_items", {
      vehicle_id: vehicleId,
      title: "Clunk over bumps",
      description: "Front left",
    });
    const free = await insert("parts", {
      vehicle_id: vehicleId,
      name: "Motor mount",
      status: "idea",
    });
    const otherJob = await insert("jobs", {
      vehicle_id: vehicleId,
      title: "Other",
      type: "repair",
    });
    const taken = await insert("parts", {
      vehicle_id: vehicleId,
      job_id: otherJob,
      name: "Sway link",
    });
    await user.client.from("watch_item_parts").insert([
      { watch_item_id: item, part_id: free },
      { watch_item_id: item, part_id: taken },
    ]);

    const { data: jobId, error } = await user.client.rpc("promote_watch_item", {
      p_item_id: item,
      p_type: "diagnosis",
      p_phase_id: phases![0].id,
    });
    expect(error).toBeNull();

    const { data: job } = await user.client
      .from("jobs")
      .select("*")
      .eq("id", jobId!)
      .single();
    expect(job).toMatchObject({
      title: "Clunk over bumps",
      description: "Front left",
      type: "diagnosis",
      status: "not_started",
      phase_id: phases![0].id,
    });
    const { data: parts } = await user.client
      .from("parts")
      .select("id, job_id")
      .in("id", [free, taken]);
    expect(Object.fromEntries(parts!.map((p) => [p.id, p.job_id]))).toEqual({
      [free]: jobId,
      [taken]: otherJob,
    });
    const { data: w } = await user.client
      .from("watch_items")
      .select("status, promoted_job_id, closed_on")
      .eq("id", item)
      .single();
    expect(w).toEqual({
      status: "promoted",
      promoted_job_id: jobId,
      closed_on: null,
    });
  });

  it("refuses other job types and items that aren't watching, writing nothing", async () => {
    const item = await insert("watch_items", {
      vehicle_id: vehicleId,
      title: "Rattle",
    });
    const { count: before } = await user.client
      .from("jobs")
      .select("*", { count: "exact", head: true });
    const bad = await user.client.rpc("promote_watch_item", {
      p_item_id: item,
      p_type: "modification",
    });
    expect(bad.error?.message).toMatch(/Diagnosis or Repair/);
    await user.client
      .from("watch_items")
      .update({ status: "dismissed", closed_on: today })
      .eq("id", item);
    const closed = await user.client.rpc("promote_watch_item", {
      p_item_id: item,
      p_type: "repair",
    });
    expect(closed.error?.message).toMatch(/watching/);
    const { count: after } = await user.client
      .from("jobs")
      .select("*", { count: "exact", head: true });
    expect(after).toBe(before);
  });
});

describe("task links", () => {
  it("creates a task with links atomically, and a blocking link counts as an open blocker until done (rule 1)", async () => {
    const job = await insert("jobs", {
      vehicle_id: vehicleId,
      title: "Lift install",
      type: "modification",
    });
    const part = await insert("parts", {
      vehicle_id: vehicleId,
      name: "Spacers",
    });
    const { data: taskId, error } = await user.client.rpc(
      "create_task_with_links",
      {
        p_title: "Book bay",
        p_due_on: today,
        p_links: [{ job_id: job, blocks_job: true }, { part_id: part }],
      },
    );
    expect(error).toBeNull();
    const { data: links } = await user.client
      .from("task_links")
      .select("job_id, part_id, blocks_job")
      .eq("task_id", taskId!);
    expect(links).toHaveLength(2);

    const blockers = async () =>
      (
        await user.client
          .from("v_job_blockers")
          .select("open_blockers")
          .eq("job_id", job)
          .single()
      ).data!.open_blockers;
    expect(await blockers()).toBe(1);
    await user.client
      .from("tasks")
      .update({ status: "done", completed_on: today })
      .eq("id", taskId!);
    expect(await blockers()).toBe(0);
  });

  it("rejects an invalid link and leaves no task behind", async () => {
    const { count: before } = await user.client
      .from("tasks")
      .select("*", { count: "exact", head: true });
    const part = await insert("parts", { vehicle_id: vehicleId, name: "Bolt" });
    const { error } = await user.client.rpc("create_task_with_links", {
      p_title: "Bad",
      p_links: [{ part_id: part, blocks_job: true }],
    });
    expect(error).not.toBeNull();
    const { count: after } = await user.client
      .from("tasks")
      .select("*", { count: "exact", head: true });
    expect(after).toBe(before);
  });

  it("set_task_links replaces the whole set", async () => {
    const job = await insert("jobs", {
      vehicle_id: vehicleId,
      title: "J",
      type: "repair",
    });
    const { data: taskId } = await user.client.rpc("create_task_with_links", {
      p_title: "T",
      p_links: [{ job_id: job }],
    });
    await user.client.rpc("set_task_links", {
      p_task_id: taskId!,
      p_links: [],
    });
    const { count } = await user.client
      .from("task_links")
      .select("*", { count: "exact", head: true })
      .eq("task_id", taskId!);
    expect(count).toBe(0);
  });
});
