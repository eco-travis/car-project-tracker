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

// Parts across the lifecycle. Parts with expenses are already past Wishlist, so the
// rule 6 trigger leaves their statuses as seeded.
type PartSeed = { key: string; job?: string } & Record<string, unknown>;
const partSeeds: PartSeed[] = [
  {
    key: "atf",
    job: "tcase",
    name: "Transfer case fluid 1L",
    brand: "Porsche",
    category: "fluids",
    status: "installed",
    oem_part_number: "000 043 300 56",
    vendor: "Sunset Porsche",
    quantity: 1,
  },
  {
    key: "pipes",
    job: "coolant",
    name: "Coolant pipe kit",
    brand: "URO",
    category: "other",
    status: "received",
    oem_part_number: "948-106-052-00",
    superseded_numbers: ["948-106-052-01"],
    vendor: "FCP Euro",
    return_by: "2026-11-15",
  },
  {
    key: "plugs",
    job: "plugs",
    name: "Spark plugs",
    brand: "Bosch",
    category: "other",
    status: "ordered",
    oem_part_number: "999-170-232-90",
    vendor: "Pelican Parts",
    quantity: 8,
  },
  {
    key: "tires",
    job: "tires",
    name: "KO2 275/55R19",
    brand: "BFGoodrich",
    category: "tires_wheels",
    status: "ordered",
    vendor: "Tire Rack",
    quantity: 5,
  },
  {
    key: "spacers",
    job: "lift",
    name: "2in lift spacers",
    brand: "Rennen",
    category: "suspension",
    status: "wishlist",
    fitment_notes: "955/957 air suspension; Touareg cross-fit",
    vendor: "Rennen",
  },
  {
    key: "skid",
    job: "skids",
    name: "Front skid plate",
    brand: "Rival",
    category: "armor",
    status: "idea",
  },
  {
    key: "battery",
    job: "battery",
    name: "Dual battery kit",
    brand: "Redarc",
    category: "electrical",
    status: "researching",
  },
  {
    key: "wheels",
    name: "Stock 18in wheels",
    brand: "Porsche",
    category: "tires_wheels",
    status: "removed",
    notes: "Came off for the KO2s.",
  },
];
const parts = await must(
  admin
    .from("parts")
    .insert(
      partSeeds.map(({ key: _k, job: j, ...p }) => ({
        // Bulk inserts send the union of keys; fill not-null columns explicitly.
        superseded_numbers: [],
        quantity: 1,
        ...p,
        owner_id,
        vehicle_id,
        job_id: j ? job(j) : null,
      })) as never,
    )
    .select("id, name"),
);
const part = (key: string) =>
  parts.find((p) => p.name === partSeeds.find((s) => s.key === key)!.name)!.id;

const tools = await must(
  admin
    .from("tools")
    .insert([
      {
        owner_id,
        vehicle_id,
        name: "27mm triple-square socket",
        status: "owned",
        storage_location: "Drawer 2",
      },
      {
        owner_id,
        vehicle_id,
        name: "Coolant pressure tester",
        status: "borrowed",
        storage_location: "Shelf A",
      },
      { owner_id, vehicle_id, name: "Ball joint press", status: "need_to_buy" },
    ])
    .select("id, name"),
);
const tool = (name: string) => tools.find((t) => t.name === name)!.id;
await must(
  admin.from("job_tools").insert([
    {
      owner_id,
      job_id: job("tcase"),
      tool_id: tool("27mm triple-square socket"),
    },
    {
      owner_id,
      job_id: job("coolant"),
      tool_id: tool("Coolant pressure tester"),
    },
    { owner_id, job_id: job("lift"), tool_id: tool("Ball joint press") },
  ]),
);

const expense = (o: Record<string, unknown>) =>
  ({ owner_id, vehicle_id, state: "paid", ...o }) as never;
await must(
  admin.from("expenses").insert([
    expense({
      spent_on: "2026-08-22",
      amount_cents: 8900,
      category: "fluids_consumables",
      vendor: "Pelican Parts",
      job_id: job("oil"),
    }),
    expense({
      spent_on: "2026-09-04",
      amount_cents: 4200,
      category: "part",
      vendor: "Sunset Porsche",
      part_id: part("atf"),
    }),
    expense({
      spent_on: "2026-09-12",
      amount_cents: 38900,
      category: "part",
      vendor: "FCP Euro",
      part_id: part("pipes"),
    }),
    expense({
      spent_on: "2026-09-20",
      amount_cents: 11200,
      category: "part",
      vendor: "Pelican Parts",
      part_id: part("plugs"),
      state: "committed",
    }),
    expense({
      spent_on: "2026-09-28",
      amount_cents: 46000,
      category: "shop_labor_bay",
      vendor: "Eastside Euro",
      job_id: job("brakes"),
    }),
    expense({
      spent_on: "2026-10-01",
      amount_cents: 162500,
      category: "part",
      vendor: "Tire Rack",
      part_id: part("tires"),
      state: "committed",
    }),
    expense({
      spent_on: "2026-09-02",
      amount_cents: 6400,
      category: "tool",
      vendor: "Amazon",
      tool_id: tool("27mm triple-square socket"),
    }),
    expense({
      spent_on: "2026-09-15",
      amount_cents: 2500,
      category: "shipping_tax_fees",
      vendor: "FCP Euro",
      phase_id: phases.find((p) => p.name === "Baseline maintenance")!.id,
    }),
  ]),
);

// Watch items: one due by mileage, one due by date with a check-in, one later.
const watchRows = [
  {
    title: "Power steering pump moan on cold start",
    system: "steering",
    severity: "concerning",
    next_followup_on: "2026-10-01",
    next_followup_odometer: null,
    description: "About 10 seconds below 40°F, then quiet.",
  },
  {
    title: "Clunk over speed bumps (front left)",
    system: "suspension",
    severity: "act_soon",
    next_followup_on: null,
    next_followup_odometer: 141000,
    description: null,
  },
  {
    title: "Small seep at oil pan gasket",
    system: "engine",
    severity: "monitor",
    next_followup_on: "2027-01-15",
    next_followup_odometer: 144000,
    description: null,
  },
];
const watch = await must(
  admin
    .from("watch_items")
    .insert(watchRows.map((w) => ({ ...w, owner_id, vehicle_id })) as never)
    .select("id, title"),
);
const watchId = (prefix: string) =>
  watch.find((w) => w.title.startsWith(prefix))!.id;
await must(
  admin.from("watch_checkins").insert({
    owner_id,
    watch_item_id: watchId("Power steering"),
    checked_on: "2026-09-10",
    odometer: 140700,
    observation: "Moan for ~10s at 38°F. Fluid level OK.",
  }),
);
const sway = await must(
  admin
    .from("parts")
    .insert({
      owner_id,
      vehicle_id,
      name: "Front sway bar end link",
      category: "suspension",
      status: "idea",
      superseded_numbers: [],
      quantity: 1,
    })
    .select("id")
    .single(),
);
await must(
  admin
    .from("watch_item_parts")
    .insert({ owner_id, watch_item_id: watchId("Clunk"), part_id: sway.id }),
);

// Tasks: one blocks the lift install, one is linked to the stock wheels, one undated.
const task = async (
  title: string,
  due_on: string | null,
  links: Record<string, unknown>[],
) => {
  const t = await must(
    admin
      .from("tasks")
      .insert({ owner_id, vehicle_id, title, due_on })
      .select("id")
      .single(),
  );
  if (links.length)
    await must(
      admin.from("task_links").insert(
        links.map((l) => ({
          owner_id,
          task_id: t.id,
          blocks_job: false,
          ...l,
        })) as never,
      ),
    );
};
await task("Book bay at DIY garage for lift install", "2026-10-15", [
  { job_id: job("lift"), blocks_job: true },
]);
await task("Sell stock wheels to clear storage", "2026-10-25", [
  { part_id: part("wheels") },
]);
await task("Ask forum about 957 sway links on 955", null, [
  { watch_item_id: watchId("Clunk") },
]);

// Inspiration: three ideas, one already promoted to the lift spacers part.
await must(
  admin.from("inspirations").insert([
    {
      owner_id,
      vehicle_id,
      title: "Rival skid plate set",
      source_url: "https://www.rival4x4.com/",
      tags: ["armor"],
      notes: "Aluminum, bolts to factory points.",
      promoted_part_id: null,
    },
    {
      owner_id,
      vehicle_id,
      title: "Roof-top tent build on a 955",
      source_url: "https://rennlist.com/forums/cayenne-955-957/",
      tags: ["sleep system", "roof"],
      notes: "Check roof load rating first.",
      promoted_part_id: null,
    },
    {
      owner_id,
      vehicle_id,
      title: "2in lift spacer write-up",
      source_url: "https://rennlist.com/forums/",
      tags: ["suspension"],
      notes: null,
      promoted_part_id: part("spacers"),
    },
  ] as never),
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
  `Seeded ${phases.length} phases, ${jobs.length} jobs, ${parts.length} parts, ${tools.length} tools, ${watch.length} watch items, 3 tasks, and 3 ideas for ${email}.`,
);
