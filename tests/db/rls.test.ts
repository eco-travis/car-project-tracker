import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import type { Database } from "@/lib/db/types";
import {
  createTestUser,
  deleteTestUser,
  localSupabase,
  type TestUser,
} from "../support/local-supabase";

type Table = keyof Database["public"]["Tables"];

/** Every public table, with the columns that identify one row. */
const TABLES: Record<Table, string[]> = {
  vehicles: ["id"],
  phases: ["id"],
  jobs: ["id"],
  job_dependencies: ["job_id", "blocked_by_job_id"],
  parts: ["id"],
  tools: ["id"],
  job_tools: ["job_id", "tool_id"],
  inspirations: ["id"],
  watch_items: ["id"],
  watch_checkins: ["id"],
  watch_item_parts: ["watch_item_id", "part_id"],
  tasks: ["id"],
  task_links: ["id"],
  expenses: ["id"],
  attachments: ["id"],
};

let a: TestUser;
let b: TestUser;
/** Primary-key filter for user A's row in each table. */
const rowOf = {} as Record<Table, Record<string, string>>;
const fileOfA = { path: "" };

async function insertOne<T extends Table>(
  user: TestUser,
  table: T,
  values: Record<string, unknown>,
) {
  const { data, error } = await user.client
    .from(table)
    .insert(values as never)
    .select()
    .single();
  if (error) throw new Error(`insert into ${table} failed: ${error.message}`);
  const row = data as unknown as Record<string, string>;
  rowOf[table] = Object.fromEntries(
    TABLES[table].map((col) => [col, row[col]]),
  );
  return row;
}

beforeAll(async () => {
  [a, b] = await Promise.all([
    createTestUser("rls-a"),
    createTestUser("rls-b"),
  ]);

  // User A builds one row in every table, relying on owner_id defaulting to auth.uid().
  const vehicle = await insertOne(a, "vehicles", { name: "A's Cayenne" });
  const v = vehicle.id;
  const phase = await insertOne(a, "phases", {
    vehicle_id: v,
    name: "Phase",
    sort_order: 1,
  });
  const job = await insertOne(a, "jobs", {
    vehicle_id: v,
    phase_id: phase.id,
    title: "Job",
    type: "repair",
  });
  const job2 = await a.client
    .from("jobs")
    .insert({ vehicle_id: v, title: "Blocker", type: "repair" })
    .select()
    .single();
  if (job2.error) throw job2.error;
  await insertOne(a, "job_dependencies", {
    job_id: job.id,
    blocked_by_job_id: job2.data.id,
  });
  const part = await insertOne(a, "parts", {
    vehicle_id: v,
    job_id: job.id,
    name: "Part",
  });
  const tool = await insertOne(a, "tools", { vehicle_id: v, name: "Tool" });
  await insertOne(a, "job_tools", { job_id: job.id, tool_id: tool.id });
  await insertOne(a, "inspirations", { vehicle_id: v, title: "Idea" });
  const watch = await insertOne(a, "watch_items", {
    vehicle_id: v,
    title: "Noise",
  });
  await insertOne(a, "watch_checkins", {
    watch_item_id: watch.id,
    checked_on: "2026-10-01",
  });
  await insertOne(a, "watch_item_parts", {
    watch_item_id: watch.id,
    part_id: part.id,
  });
  const task = await insertOne(a, "tasks", { vehicle_id: v, title: "Errand" });
  await insertOne(a, "task_links", {
    task_id: task.id,
    job_id: job.id,
    blocks_job: true,
  });
  await insertOne(a, "expenses", {
    vehicle_id: v,
    spent_on: "2026-10-01",
    amount_cents: 1000,
    category: "part",
    part_id: part.id,
  });

  fileOfA.path = `${a.id}/${crypto.randomUUID()}/note.txt`;
  const upload = await a.client.storage
    .from("attachments")
    .upload(fileOfA.path, new Blob(["private"], { type: "text/plain" }));
  if (upload.error) throw upload.error;
  await insertOne(a, "attachments", {
    vehicle_id: v,
    storage_path: fileOfA.path,
    mime_type: "text/plain",
    size_bytes: 7,
    kind: "document",
    taken_at: new Date().toISOString(),
    job_id: job.id,
  });
});

afterAll(async () => {
  await Promise.all([a && deleteTestUser(a), b && deleteTestUser(b)]);
});

describe("RLS configuration", () => {
  it("enables RLS with an owner policy on every public table", async () => {
    const pg = new Client({ connectionString: localSupabase().dbUrl });
    await pg.connect();
    try {
      const { rows } = await pg.query<{
        table: string;
        rls: boolean;
        policies: number;
      }>(`
        select c.relname as table, c.relrowsecurity as rls,
               (select count(*)::int from pg_policies p
                 where p.schemaname = 'public' and p.tablename = c.relname) as policies
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by 1`);
      expect(rows.map((r) => r.table).sort()).toEqual(
        Object.keys(TABLES).sort(),
      );
      for (const row of rows) {
        expect(row, row.table).toMatchObject({ rls: true });
        expect(row.policies, row.table).toBeGreaterThan(0);
      }
    } finally {
      await pg.end();
    }
  });
});

describe("a second user", () => {
  const tables = Object.keys(TABLES) as Table[];

  it("has a row in every table as user A (sanity check)", async () => {
    for (const table of tables) {
      const { data, error } = await a.client
        .from(table)
        .select("*")
        .match(rowOf[table]);
      expect(error, table).toBeNull();
      expect(data, table).toHaveLength(1);
    }
  });

  it.each(tables)("cannot read %s rows belonging to user A", async (table) => {
    const { data, error } = await b.client.from(table).select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.each(tables)(
    "cannot update %s rows belonging to user A",
    async (table) => {
      const { data, error } = await b.client
        .from(table)
        .update({ updated_at: "2000-01-01T00:00:00Z" } as never)
        .match(rowOf[table])
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: still } = await a.client
        .from(table)
        .select("updated_at")
        .match(rowOf[table])
        .single();
      expect((still as { updated_at: string }).updated_at).not.toMatch(
        /^2000-/,
      );
    },
  );

  it.each(tables)(
    "cannot delete %s rows belonging to user A",
    async (table) => {
      const { data, error } = await b.client
        .from(table)
        .delete()
        .match(rowOf[table])
        .select();
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: still } = await a.client
        .from(table)
        .select("*")
        .match(rowOf[table]);
      expect(still).toHaveLength(1);
    },
  );

  it("cannot insert rows owned by user A", async () => {
    const { error } = await b.client
      .from("vehicles")
      .insert({ name: "Forged", owner_id: a.id });
    expect(error?.code).toBe("42501");
  });

  it("cannot read, list, overwrite, or delete user A's storage objects", async () => {
    const bucket = () => b.client.storage.from("attachments");

    const download = await bucket().download(fileOfA.path);
    expect(download.error).not.toBeNull();

    const list = await bucket().list(
      fileOfA.path.split("/").slice(0, 2).join("/"),
    );
    expect(list.data ?? []).toEqual([]);

    const signed = await bucket().createSignedUrl(fileOfA.path, 60);
    expect(signed.error).not.toBeNull();

    const overwrite = await bucket().upload(fileOfA.path, new Blob(["evil"]), {
      upsert: true,
    });
    expect(overwrite.error).not.toBeNull();

    const intoAFolder = await bucket().upload(
      `${a.id}/${crypto.randomUUID()}/evil.txt`,
      new Blob(["evil"]),
    );
    expect(intoAFolder.error).not.toBeNull();

    const removed = await bucket().remove([fileOfA.path]);
    expect(removed.data ?? []).toEqual([]);

    const stillThere = await a.client.storage
      .from("attachments")
      .download(fileOfA.path);
    expect(stillThere.error).toBeNull();
    expect(await stillThere.data!.text()).toBe("private");
  });
});
