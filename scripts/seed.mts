// Local demo data owned by ALLOWED_EMAIL. Run after `supabase db reset` (npm run db:reset does both).
// Uses the local service key via `supabase status`; never point this at production.
import { existsSync } from "node:fs";
import { adminClient, localSupabase } from "../tests/support/local-supabase.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const email = process.env.ALLOWED_EMAIL;
if (!email) throw new Error("Set ALLOWED_EMAIL in .env.local first.");
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(localSupabase().url))
  throw new Error("Refusing to seed a non-local Supabase.");

const admin = adminClient();

async function must<T>(
  p: PromiseLike<{ data: T; error: unknown }>,
): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw error;
  return data as NonNullable<T>;
}

// Find or create the owner.
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let owner = list.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);
if (!owner) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) throw error;
  owner = data.user;
}
const owner_id = owner.id;
await admin.from("vehicles").delete().eq("owner_id", owner_id); // cascades to everything

const vehicle = await must(
  admin
    .from("vehicles")
    .insert({
      owner_id,
      name: "2004 Cayenne Turbo",
      year: 2004,
      model: "Cayenne Turbo",
      generation: "955",
      current_odometer: 141250,
      purchase_date: "2026-08-15",
      purchase_price_cents: 1250000,
      notes:
        "ATF: Pentosin ATF 1\nTransfer case: Porsche 000 043 300 56\nTire pressure: 36 front / 41 rear (cold)",
    })
    .select("id")
    .single(),
);
const vehicle_id = vehicle.id;

const phaseRows = [
  { name: "Baseline maintenance", status: "active", budget_cents: 300000 },
  { name: "Suspension and tires", status: "planned", budget_cents: 450000 },
  { name: "Armor and recovery", status: "planned", budget_cents: 600000 },
  { name: "Electrical and lighting", status: "planned", budget_cents: 250000 },
  { name: "Sleep and storage", status: "planned", budget_cents: 200000 },
] as const;
const phases = await must(
  admin
    .from("phases")
    .insert(
      phaseRows.map((p, i) => ({
        ...p,
        owner_id,
        vehicle_id,
        sort_order: i + 1,
      })),
    )
    .select("id, name"),
);
const phase = (name: string) => phases.find((p) => p.name === name)!.id;

type JobSeed = { key: string } & Record<string, unknown>;
const jobSeeds: JobSeed[] = [
  {
    key: "oil",
    title: "Engine oil and filter",
    type: "maintenance",
    phase_id: phase("Baseline maintenance"),
    status: "done",
    completed_on: "2026-08-22",
    completed_odometer: 140120,
    performed_by: "diy",
    diy_hours: 1.5,
  },
  {
    key: "tcase",
    title: "Transfer case fluid",
    type: "maintenance",
    phase_id: phase("Baseline maintenance"),
    status: "done",
    completed_on: "2026-09-05",
    completed_odometer: 140610,
    performed_by: "diy",
    diy_hours: 1,
    notes: "Used Porsche 000 043 300 56.",
  },
  {
    key: "coolant",
    title: "Coolant pipes",
    type: "repair",
    phase_id: phase("Baseline maintenance"),
    status: "in_progress",
  },
  {
    key: "plugs",
    title: "Spark plugs and coils",
    type: "maintenance",
    phase_id: phase("Baseline maintenance"),
    status: "waiting_on_parts",
  },
  {
    key: "tires",
    title: "All-terrain tires",
    type: "modification",
    phase_id: phase("Suspension and tires"),
    status: "ready",
    budget_cents: 180000,
  },
  {
    key: "lift",
    title: "Install 2in lift spacers + alignment",
    type: "modification",
    phase_id: phase("Suspension and tires"),
    status: "not_started",
    budget_cents: 90000,
  },
  {
    key: "skids",
    title: "Skid plates",
    type: "modification",
    phase_id: phase("Armor and recovery"),
    status: "not_started",
  },
  {
    key: "sliders",
    title: "Rock sliders",
    type: "modification",
    phase_id: phase("Armor and recovery"),
    status: "not_started",
  },
  {
    key: "battery",
    title: "Dual battery system",
    type: "modification",
    phase_id: phase("Electrical and lighting"),
    status: "not_started",
  },
  {
    key: "brakes",
    title: "Front brake pads",
    type: "maintenance",
    status: "done",
    completed_on: "2026-09-28",
    completed_odometer: 141100,
    performed_by: "shop",
    performer_name: "Eastside Euro",
  },
];
const jobs = await must(
  admin
    .from("jobs")
    .insert(
      jobSeeds.map((seed, i) => ({
        ...Object.fromEntries(
          Object.entries(seed).filter(([k]) => k !== "key"),
        ),
        owner_id,
        vehicle_id,
        sort_order: i,
      })) as never,
    )
    .select("id, title"),
);
const job = (key: string) =>
  jobs.find((j) => j.title === jobSeeds.find((s) => s.key === key)!.title)!.id;

await must(
  admin.from("job_dependencies").insert([
    { owner_id, job_id: job("lift"), blocked_by_job_id: job("tires") },
    { owner_id, job_id: job("sliders"), blocked_by_job_id: job("lift") },
    { owner_id, job_id: job("skids"), blocked_by_job_id: job("lift") },
  ]),
);

// The trigger only fires on writes, so set the odometer explicitly after inserting history.
await must(
  admin
    .from("vehicles")
    .update({ current_odometer: 141250 })
    .eq("id", vehicle_id)
    .select("id"),
);

console.log(
  `Seeded ${phases.length} phases and ${jobs.length} jobs for ${email}.`,
);
