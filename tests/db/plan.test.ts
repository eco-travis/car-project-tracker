import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openBlockers } from "@/lib/domain/jobs";
import { seedPhaseNames } from "@/lib/domain/phases";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/local-supabase";

let user: TestUser;
let vehicleId: string;

async function job(title: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await user.client
    .from("jobs")
    .insert({ vehicle_id: vehicleId, title, type: "modification", ...extra })
    .select("id, title, status")
    .single();
  if (error) throw error;
  return data;
}

async function odometer() {
  const { data } = await user.client
    .from("vehicles")
    .select("current_odometer")
    .single();
  return data!.current_odometer;
}

beforeAll(async () => {
  user = await createTestUser("plan");
  const { data, error } = await user.client.rpc("create_vehicle_with_phases", {
    p_name: "Plan test",
    p_phase_names: seedPhaseNames(),
    p_current_odometer: 100000,
  });
  if (error) throw error;
  vehicleId = data;
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

describe("v_job_open_blockers / v_job_blockers (rule 1)", () => {
  it("lists open blocking jobs and blocking open tasks, matching the domain rule", async () => {
    const target = await job("Install armor");
    const statuses = [
      "not_started",
      "in_progress",
      "done",
      "cancelled",
    ] as const;
    const blockers = [];
    for (const status of statuses) {
      const extra =
        status === "done"
          ? { status, completed_on: "2026-10-01", completed_odometer: 1 }
          : { status };
      const b = await job(`Blocker ${status}`, extra);
      blockers.push(b);
      await user.client
        .from("job_dependencies")
        .insert({ job_id: target.id, blocked_by_job_id: b.id });
    }

    const { data: tasks } = await user.client
      .from("tasks")
      .insert([
        // Bulk inserts send the union of keys, so give every row a status.
        { vehicle_id: vehicleId, title: "Open blocking task", status: "open" },
        { vehicle_id: vehicleId, title: "Done blocking task", status: "done" },
        {
          vehicle_id: vehicleId,
          title: "Open non-blocking task",
          status: "open",
        },
      ])
      .select("id, title, status");
    await user.client.from("task_links").insert([
      { task_id: tasks![0].id, job_id: target.id, blocks_job: true },
      { task_id: tasks![1].id, job_id: target.id, blocks_job: true },
      { task_id: tasks![2].id, job_id: target.id, blocks_job: false },
    ]);

    const { data: rows } = await user.client
      .from("v_job_open_blockers")
      .select("kind, blocker_id, title")
      .eq("job_id", target.id);

    const expected = openBlockers(
      blockers,
      tasks!.map((t, i) => ({ ...t, blocks_job: i < 2 })),
    );
    const asSet = (
      xs: {
        kind: string | null;
        id?: string;
        blocker_id?: string | null;
        title: string | null;
      }[],
    ) => xs.map((x) => `${x.kind}:${x.title}`).sort();
    expect(asSet(rows!)).toEqual(asSet(expected));
    expect(asSet(rows!)).toEqual([
      "job:Blocker in_progress",
      "job:Blocker not_started",
      "task:Open blocking task",
    ]);

    const { data: count } = await user.client
      .from("v_job_blockers")
      .select("open_blockers")
      .eq("job_id", target.id)
      .single();
    expect(count!.open_blockers).toBe(3);
  });

  it("reports zero for a job with no blockers", async () => {
    const free = await job("Unblocked");
    const { data } = await user.client
      .from("v_job_blockers")
      .select("open_blockers")
      .eq("job_id", free.id)
      .single();
    expect(data!.open_blockers).toBe(0);
  });
});

describe("odometer trigger (rule 14)", () => {
  it("raises the vehicle odometer when a job is marked done with a higher reading", async () => {
    const j = await job("Oil change", { type: "maintenance" });
    await user.client
      .from("jobs")
      .update({
        status: "done",
        completed_on: "2026-10-05",
        completed_odometer: 100500,
      })
      .eq("id", j.id);
    expect(await odometer()).toBe(100500);
  });

  it("never lowers it", async () => {
    await job("Old record", {
      status: "done",
      completed_on: "2020-01-01",
      completed_odometer: 50000,
    });
    expect(await odometer()).toBe(100500);
  });

  it("raises it when a done job's reading is corrected upward", async () => {
    const j = await job("Brakes", {
      status: "done",
      completed_on: "2026-10-06",
      completed_odometer: 100600,
    });
    expect(await odometer()).toBe(100600);
    await user.client
      .from("jobs")
      .update({ completed_odometer: 100700 })
      .eq("id", j.id);
    expect(await odometer()).toBe(100700);
  });

  it("ignores readings on jobs that aren't done", async () => {
    await job("Planned", { completed_odometer: 999999 });
    expect(await odometer()).toBe(100700);
  });
});

describe("reorder_phases", () => {
  it("rewrites sort_order to match the given order", async () => {
    const { data: before } = await user.client
      .from("phases")
      .select("id, name")
      .order("sort_order");
    const reversed = [...before!].reverse();
    const { error } = await user.client.rpc("reorder_phases", {
      p_phase_ids: reversed.map((p) => p.id),
    });
    expect(error).toBeNull();
    const { data: after } = await user.client
      .from("phases")
      .select("name, sort_order")
      .order("sort_order");
    expect(after!.map((p) => p.name)).toEqual(reversed.map((p) => p.name));
    expect(after!.map((p) => p.sort_order)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("deleting a phase (rule 22)", () => {
  it("keeps its jobs, now unphased", async () => {
    const { data: phase } = await user.client
      .from("phases")
      .insert({ vehicle_id: vehicleId, name: "Temporary", sort_order: 99 })
      .select("id")
      .single();
    const j = await job("Phased job", { phase_id: phase!.id });
    await user.client.from("phases").delete().eq("id", phase!.id);
    const { data } = await user.client
      .from("jobs")
      .select("phase_id")
      .eq("id", j.id)
      .single();
    expect(data).toEqual({ phase_id: null });
  });
});
