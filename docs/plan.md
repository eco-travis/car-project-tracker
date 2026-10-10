# Cayenne Project Tracker — Technical Plan

Oct 9, 2026 · @Travis Roberson

Implementation plan for the MVP defined in Doc. Written for a Claude agent working in Claude Code; the spec is the source of truth for behavior, this plan for structure and order.

## Agent instructions

Build milestones M0 through M9 in order. A milestone is done only when every acceptance criterion passes and the definition of done is met; do not start the next one before that.

**Ground rules**

- The spec defines behavior. If this plan and the spec disagree, follow the spec and log the conflict in `DECISIONS.md`.
- Build only MVP scope. Anything in the spec's Post-MVP column is out of scope, even if it looks easy.
- Put business rules in pure functions under `lib/domain/` with unit tests. UI and server actions call them; they never re-implement them.
- Money is integer cents everywhere (`bigint` in Postgres, `number` in TypeScript). Format only at display time. Currency is USD, distance is miles.
- Every schema change is a new migration file. Never edit a migration that has already been applied.
- Never commit secrets. Read configuration only from environment variables listed in Human setup.
- Commit at least once per milestone with a message starting `M<n>:`.

**Copy this section into `CLAUDE.md`** at the repo root in M0, along with the commands from Testing, so every session starts with the same rules.

**Stop and ask the human when:**

1. A step needs an account, a dashboard setting, or a secret (see Human setup).
2. The spec is silent or ambiguous on user-visible behavior. Make a reasonable choice only for internal details, and record it in `DECISIONS.md`.
3. A dependency needs a paid tier, or a library choice in this plan doesn't work and a replacement is needed.
4. A milestone's acceptance criteria can't be met as written.

## Stack

Use the current stable release of each at implementation time and pin exact versions in `package.json`.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (App Router), TypeScript strict | Server components for reads, server actions for writes, route handlers for exports |
| Hosting | Vercel | Zero-config Next.js deploys, preview per branch |
| Database | Supabase Postgres | Relational model, views for rollups, RLS |
| Auth | Supabase Auth, email magic link | Single user, no passwords to manage |
| File storage | Supabase Storage, private bucket | Same auth and RLS model as the data |
| Supabase client | `@supabase/ssr` | Cookie-based sessions in server components and actions |
| UI | Tailwind CSS + shadcn/ui | Accessible primitives, no design system to build |
| Forms and validation | react-hook-form + zod | One zod schema per entity shared by form and server action |
| Carousel / lightbox | yet-another-react-lightbox (zoom and video plugins) | Full-screen swipe, pinch zoom, video playback |
| Photo metadata | exifr | Reads taken date in the browser before upload |
| Image compression | browser-image-compression | Shrinks phone photos and builds thumbnails client-side |
| PDF | @react-pdf/renderer | PDFs from React components in a route handler |
| Excel | exceljs | Multi-sheet .xlsx export |
| Unit tests | Vitest | Domain functions and DB views |
| End-to-end tests | Playwright | Spec flows 1–11, desktop and mobile viewport |
| Local dev | Supabase CLI (Docker) | Local Postgres, Auth, Storage, migrations, type generation |

## Architecture

A standard three-tier setup with one deliberate exception: photo and video bytes bypass Vercel and go straight from the browser to Supabase Storage.

&#91;embedded content: system architecture · 3 tiers\]

Next.js talks to Supabase as the signed-in user for sessions, queries, and signed read URLs, so RLS governs every read and write. The browser asks a server action for a signed upload URL, then sends the file directly to Storage.

## Repo layout

One Next.js app, one Supabase project directory. Routes map one-to-one to the spec's screens.

```
app/
  login/                      magic-link sign in
  auth/callback/route.ts      session exchange
  (app)/                      authenticated shell: sidebar on desktop, bottom nav on phone
    onboarding/               create vehicle, seed phases (shown when no vehicle exists)
    dashboard/
    plan/
    jobs/[id]/
    log/                      Work Log
    gallery/
    watch/  watch/[id]/
    tasks/
    parts/  parts/[id]/
    tools/
    inspiration/
    vehicle/                  vehicle record and notes
  api/exports/
    service-history/route.ts  PDF
    build-sheet/route.ts      PDF
    xlsx/route.ts
    csv/[entity]/route.ts
components/
  ui/                         shadcn/ui primitives
  quick-add/                  global quick-add sheet
  media/                      uploader, thumbnail grid, lightbox
  money.tsx                   cents -> "$1,234.56"
lib/
  domain/                     pure business rules + unit tests (no I/O)
  actions/                    server actions, one file per entity
  db/                         supabase server/browser clients, generated types
  schemas/                    zod schemas, one per entity
  exports/                    PDF components, xlsx/csv builders
supabase/
  migrations/                 numbered SQL migrations
  seed.sql                    local dev data: one vehicle, phases, a few jobs/parts
tests/
  unit/                       Vitest
  e2e/                        Playwright, one file per spec flow
CLAUDE.md
DECISIONS.md
```

## Database schema

This is the target schema; split it across migrations by milestone as you go. Every table carries `owner_id` for RLS and `created_at` / `updated_at`. Tools are the one owner-level table: `vehicle_id` is nullable because tools move between vehicles.

### Conventions

- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Shared columns on every table (omitted below): `owner_id uuid not null default auth.uid() references auth.users`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` with an `updated_at` trigger.
- Money columns end in `_cents` and are `bigint`. Odometer columns are `int` miles.
- Foreign keys to optional parents use `on delete set null`; join tables use `on delete cascade`.

### Enums

```sql
create type job_type        as enum ('maintenance','repair','modification','diagnosis');
create type job_status      as enum ('not_started','waiting_on_parts','ready','in_progress','done','cancelled');
create type performed_by    as enum ('diy','rented_bay','shop');
create type phase_status    as enum ('planned','active','done');
create type part_status     as enum ('idea','researching','wishlist','ordered','received','installed','removed','sold','returned');
create type part_category   as enum ('suspension','armor','lighting','recovery','electrical','tires_wheels','interior','fluids','other');
create type tool_status     as enum ('owned','borrowed','rented','need_to_buy');
create type expense_category as enum ('part','tool','shop_labor_bay','shipping_tax_fees','fluids_consumables','other','sale');
create type expense_state   as enum ('committed','paid');
create type watch_system    as enum ('engine','drivetrain','suspension','steering','brakes','electrical','body','other');
create type watch_severity  as enum ('monitor','concerning','act_soon');
create type watch_status    as enum ('watching','promoted','resolved','dismissed');
create type task_status     as enum ('open','done','dropped');
create type attachment_kind as enum ('photo','clip','receipt','document');
create type attachment_tag  as enum ('before','during','after');
```

### Tables

```sql
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null, year int, model text, generation text, vin text,
  current_odometer int not null default 0 check (current_odometer >= 0),
  purchase_date date, purchase_price_cents bigint,
  notes text
);

create table phases (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  name text not null, description text,
  sort_order int not null,
  status phase_status not null default 'planned',
  budget_cents bigint,
  target_start date, target_end date
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  phase_id uuid references phases on delete set null,
  title text not null, description text,
  type job_type not null,
  status job_status not null default 'not_started',
  sort_order int not null default 0,
  budget_cents bigint,
  completed_on date, completed_odometer int,
  performed_by performed_by, performer_name text,
  diy_hours numeric(6,2) check (diy_hours >= 0),
  notes text, links text[] not null default '{}',
  check (status <> 'done' or (completed_on is not null and completed_odometer is not null))
);

create table job_dependencies (
  job_id uuid not null references jobs on delete cascade,
  blocked_by_job_id uuid not null references jobs on delete cascade,
  primary key (job_id, blocked_by_job_id),
  check (job_id <> blocked_by_job_id)
);

create table parts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  job_id uuid references jobs on delete set null,
  replaces_part_id uuid references parts on delete set null,
  name text not null, brand text,
  category part_category not null default 'other',
  oem_part_number text, superseded_numbers text[] not null default '{}',
  aftermarket_part_number text, fitment_notes text,
  status part_status not null default 'idea',
  vendor text, product_url text, order_number text,
  return_by date, warranty_notes text,
  quantity int not null default 1 check (quantity > 0),
  notes text
);

create table tools (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles on delete set null,
  name text not null, brand text, description text,
  status tool_status not null default 'owned',
  storage_location text, notes text
);

create table job_tools (
  job_id uuid not null references jobs on delete cascade,
  tool_id uuid not null references tools on delete cascade,
  primary key (job_id, tool_id)
);

create table inspirations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  title text not null, source_url text,
  tags text[] not null default '{}', notes text,
  promoted_part_id uuid references parts on delete set null,
  promoted_job_id uuid references jobs on delete set null
);

create table watch_items (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  title text not null, description text,
  system watch_system not null default 'other',
  severity watch_severity not null default 'monitor',
  status watch_status not null default 'watching',
  next_followup_on date,
  next_followup_odometer int,        -- absolute reading, not an interval
  promoted_job_id uuid references jobs on delete set null,
  closed_on date
);

create table watch_checkins (
  id uuid primary key default gen_random_uuid(),
  watch_item_id uuid not null references watch_items on delete cascade,
  checked_on date not null, odometer int, observation text
);

create table watch_item_parts (
  watch_item_id uuid not null references watch_items on delete cascade,
  part_id uuid not null references parts on delete cascade,
  primary key (watch_item_id, part_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  title text not null, notes text,
  due_on date,
  status task_status not null default 'open',
  completed_on date
);

create table task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  job_id uuid references jobs on delete cascade,
  part_id uuid references parts on delete cascade,
  phase_id uuid references phases on delete cascade,
  watch_item_id uuid references watch_items on delete cascade,
  blocks_job boolean not null default false,
  check (num_nonnulls(job_id, part_id, phase_id, watch_item_id) = 1),
  check (not blocks_job or job_id is not null)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  spent_on date not null,
  amount_cents bigint not null,       -- negative = income (sale, refund)
  category expense_category not null,
  state expense_state not null default 'paid',
  vendor text, notes text,
  part_id uuid references parts on delete set null,
  tool_id uuid references tools on delete set null,
  job_id uuid references jobs on delete set null,
  phase_id uuid references phases on delete set null,
  check (category <> 'sale' or amount_cents < 0)
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  storage_path text not null unique,
  thumb_path text,
  mime_type text not null, size_bytes bigint not null,
  kind attachment_kind not null,
  tag attachment_tag,
  taken_at timestamptz not null,
  highlight boolean not null default false,
  caption text,
  -- at most one parent; none = vehicle-level
  phase_id uuid references phases on delete cascade,
  job_id uuid references jobs on delete cascade,
  part_id uuid references parts on delete cascade,
  tool_id uuid references tools on delete cascade,
  inspiration_id uuid references inspirations on delete cascade,
  watch_item_id uuid references watch_items on delete cascade,
  watch_checkin_id uuid references watch_checkins on delete cascade,
  task_id uuid references tasks on delete cascade,
  expense_id uuid references expenses on delete cascade,
  check (num_nonnulls(phase_id, job_id, part_id, tool_id, inspiration_id,
         watch_item_id, watch_checkin_id, task_id, expense_id) <= 1)
);
```

Add indexes on every foreign key column, on `attachments (vehicle_id, taken_at)`, and on `jobs (vehicle_id, status)`. Deleting an attachment row must also delete its storage objects (do it in the server action, not a trigger).

### Row-level security

Enable RLS on every table and apply the same owner policy:

```sql
alter table <t> enable row level security;
create policy owner_all on <t>
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
```

Storage bucket `attachments` is private. Object paths are `<owner_id>/<attachment_id>/<filename>`; storage policies allow read and write only where the first path segment equals `auth.uid()::text`.

### Views

All views use `with (security_invoker = true)` so RLS applies. Logic must match the Domain rules section.

```sql
-- Effective phase and reporting bucket for every expense
create view v_expense_attribution with (security_invoker = true) as
select e.*,
  coalesce(j.phase_id, e.phase_id) as effective_phase_id,
  case
    when e.category = 'tool'                 then 'tools'
    when e.amount_cents < 0                  then 'recovered'
    when j.id is not null and j.type = 'modification' then 'build'
    when j.id is not null                    then 'ownership'
    when e.phase_id is not null              then 'build'
    else 'unassigned'
  end as bucket
from expenses e left join jobs j on j.id = e.job_id;
```

Also create: `v_job_costs` (committed and paid cents per job), `v_phase_costs` (budget, committed, paid, remaining per phase via `effective_phase_id`), `v_vehicle_totals` (build, ownership, tools, recovered, unassigned, total invested), `v_job_blockers` (count of open blockers per job), and `v_watch_due` (watching items with `is_due` and `is_overdue`). Cover each with a Vitest test against local Supabase.

## Domain rules

Each rule lives in `lib/domain/` as a pure function with unit tests. Server actions call it and run the resulting writes in one transaction (a Postgres function via `rpc` where a rule touches several tables).

### Jobs

1. **Open blockers** of a job = blocking jobs whose status is not `done` or `cancelled`, plus tasks linked with `blocks_job = true` whose status is `open`.
2. A job with open blockers cannot move to `ready`, `in_progress`, or `done`. The action returns a validation error listing the blockers. Other statuses are unrestricted.
3. Moving to `done` requires `completed_on` and `completed_odometer`. The form pre-fills today and the vehicle's `current_odometer`.
4. After a job is marked `done`, the UI offers (does not force) two follow-ups: mark its `received` parts as `installed`, and add after photos.
5. Adding a dependency must not create a cycle; reject with an error.

### Parts

6. Creating an expense linked to a part whose status is `idea`, `researching`, or `wishlist` sets the part to `ordered`.
7. **Record sale** on a `removed` part creates an expense (`category = 'sale'`, negative amount, `state = 'paid'`), sets the part to `sold`, and offers to mark open tasks linked to that part as `done`.
8. All other status changes are manual; any status can be set by hand.

### Money

9. **Committed** = sum of expenses with `state = 'committed'`. **Paid** = sum with `state = 'paid'`, including negative amounts. **Remaining** = budget − committed − paid; null budget means no remaining value is shown.
10. Job totals use the job's expenses. Phase totals use every expense whose effective phase (job's phase, else the expense's own `phase_id`) is that phase.
11. Vehicle buckets follow `v_expense_attribution`: tools, recovered (negative amounts), build (modification jobs, or phase-only expenses), ownership (maintenance, repair, diagnosis jobs), unassigned. **Total invested** = purchase price + paid across all buckets.
12. An over-budget job or phase shows the overage in dollars.
13. DIY hours are summed and shown as hours. They are never converted to money.

### Odometer

14. Saving a done job or a watch check-in with an odometer above `vehicles.current_odometer` raises `current_odometer` to that value. A lower reading never lowers it. The dashboard's manual update may set any value at or above the current one.

### Watch items

15. A watching item is **due** when `next_followup_on <= today` or `next_followup_odometer <= current_odometer`, and **overdue** when the date is more than 7 days past. Items with neither field set are never due.
16. Relative inputs ("in 3 months," "in 3,000 miles") are converted to absolute values on save: date = today + interval, odometer = current + miles.
17. **Promote** creates a job (type `diagnosis` by default, user may change to `repair`; phase optional), copies suspected parts to the job's `job_id` when those parts have no job yet, sets the watch item to `promoted`, and stores `promoted_job_id`.
18. Resolve and dismiss set the status and `closed_on`; check-ins are kept.

### Inspiration

19. Promote to part creates a part with status `wishlist`; promote to job creates a job with status `not_started`. Both store the link on the inspiration. Promoting again is allowed and overwrites the stored link only after confirmation.

### Tasks

20. Completing or dropping a task never changes any other record, except that it may clear a job's open blockers (rule 1).

### Phases

21. Creating a vehicle seeds five phases in this order: Baseline maintenance, Suspension and tires, Armor and recovery, Electrical and lighting, Sleep and storage. They are ordinary records.
22. Deleting a phase leaves its jobs in place with `phase_id = null`, after a confirmation that names the job count.

## Media pipeline and exports

Uploads go straight from the browser to Storage, so large clips never pass through a Vercel function. All image work happens client-side.

### Upload flow

1. The file input accepts `image/*,video/*,application/pdf` with `capture` support on phones. iOS converts HEIC to JPEG on selection in most cases; if a HEIC file still arrives, store it and show a generic tile rather than failing.
2. Read `taken_at` with exifr (`DateTimeOriginal`, else `CreateDate`). For video and PDF, or when absent, use the file's `lastModified`, then now. The user can edit it later.
3. Photos: compress with browser-image-compression to a long edge of 2560 px, JPEG quality about 0.85, and make a 480 px thumbnail. Clips and PDFs upload as-is; their tiles use an icon.
4. Call a server action that generates the attachment id and storage paths and returns signed upload URLs for the file and thumbnail. No row is written yet.
5. Upload both with `uploadToSignedUrl`, then call a second action that inserts the `attachments` row. If that insert fails, the action deletes the uploaded objects. Orphaned objects from abandoned uploads are acceptable in MVP.
6. Cap any single file at the Storage bucket's configured limit; show a clear error above it. Do not transcode video.

### Reading media

- Pages fetch signed URLs in batches (`createSignedUrls`) with a 1-hour expiry; thumbnails in grids, full files in the lightbox.
- **Gallery query:** attachments for the vehicle where `kind in ('photo','clip')`, `inspiration_id is null`, ordered by `taken_at`, grouped by month. Filters: phase (attachments on that phase or its jobs), job, tag, kind, highlights only. Receipts and documents are excluded by default with a toggle to include them. Inspiration media is never included.
- **Lightbox slide caption:** taken date, odometer (from the parent job's `completed_odometer` or check-in's `odometer`, else blank), phase name, job title, link to the parent record, and a highlight star toggle.
- Paginate the gallery with keyset pagination on `(taken_at, id)`, 60 items per page.

### Exports

All exports are route handlers under `app/api/exports/`, authenticated with the user's session and subject to RLS. They stream a file download.

| Export | Route | Content | Options |
| --- | --- | --- | --- |
| Service history | `service-history` | Vehicle header; done jobs of type maintenance, repair, diagnosis, newest first: date, odometer, title, parts with OEM numbers, performed by | `from`, `to`, `phase`, `costs=0/1`, `receipts=0/1` (thumbnails) |
| Build sheet | `build-sheet` | Done modification jobs grouped by phase: installed parts with brand and part numbers, one highlight or after photo per job | `from`, `to`, `phase`, `costs=0/1` |
| Full data | `xlsx` | One sheet per table, ids included, money as dollars with 2 decimals | none |
| Per-table CSV | `csv/[entity]` | One table, same columns as its sheet | none |

PDFs embed images through signed URLs fetched server-side and must render within the function time limit; if a service history exceeds 200 entries, omit receipt thumbnails automatically and say so in the PDF footer.

## Auth and security

One user, enforced in three places: Supabase settings, the app, and RLS.

1. **Sign-in:** email magic link via Supabase Auth. Public sign-ups are disabled in the Supabase dashboard (human step). The login action also rejects any email that isn't `ALLOWED_EMAIL` before calling Supabase, so no link is sent.
2. **Session:** `@supabase/ssr` cookies, refreshed in `middleware.ts`. Every route under `(app)` and `api/exports` redirects or returns 401 without a session.
3. **Data access:** all reads and writes run as the signed-in user with the anon/publishable key, so RLS applies. The service-role key is not used by the app and must not be added to Vercel.
4. **Storage:** private bucket, path-prefix policies (see schema), signed URLs only, never public URLs.
5. **Validation:** every server action parses input with its zod schema and returns typed errors; never trust client-sent `owner_id` or `vehicle_id` without checking it belongs to the user (RLS will also block it).
6. **Headers:** set a strict `Content-Security-Policy` that allows the Supabase project origin for images, media, and connections, plus `Referrer-Policy: same-origin`.
7. **RLS test:** a Vitest test creates a second local user and asserts it can read and write no rows and no storage objects belonging to the first.

## Milestones

Ten milestones, each deployable. The app is usable for real logging from M3 onward; later milestones add capture, follow-ups, and reporting. Spec flow numbers refer to the spec's Key flows list.

### M0 — Scaffold and deploy

Next.js app with TypeScript strict, Tailwind, shadcn/ui, ESLint, Prettier, Vitest, Playwright, Supabase CLI, `CLAUDE.md`, `DECISIONS.md`, and a GitHub Actions workflow running typecheck, lint, and unit tests.

- [ ] `npm run dev` serves a placeholder page; `supabase start` runs locally.
- [ ] CI passes on the default branch.
- [ ] The placeholder deploys to Vercel production (needs Human setup steps 1–3).

### M1 — Schema, auth, shell

All migrations from the schema section, RLS and storage policies, generated types, magic-link login, middleware, the authenticated shell with navigation for every screen (empty pages are fine), and onboarding.

- [ ] Only `ALLOWED_EMAIL` can request a link; any other email gets an error and no email is sent.
- [ ] Onboarding creates the vehicle and the five seeded phases (rule 21); afterwards `/` redirects to the dashboard.
- [ ] The RLS test (Auth and security, item 7) passes.
- [ ] Navigation works at 390 px wide (bottom nav) and 1280 px (sidebar).

### M2 — Plan and Work Log

Phase CRUD with drag-to-reorder; job CRUD within phases and unphased; job dependencies; job detail page (without parts, tools, expenses, media yet); status changes with guards; Mark done; Work Log with type and phase filters and text search; vehicle page with notes and manual odometer update.

- [ ] Rules 1–5, 14, 21, 22 have unit tests and are enforced in actions.
- [ ] Plan screen shows blocked jobs with the names of their blockers.
- [ ] Spec flow 2 (Mark job done) and flow 5 (Plan a phase, minus parts and tools) pass in e2e.

### M3 — Parts, tools, money

Parts list and detail with every spec field and status filter; linking parts to jobs and replaced parts; tools list with job links; expenses ledger (add from part, tool, job, or phase); Record sale; budget rollups on job, phase, and vehicle; the cost views.

- [ ] Rules 6–13 have unit tests; every view has a Vitest test with known fixtures.
- [ ] Job detail and Plan show budget, committed, paid, remaining, and overage.
- [ ] Spec flows 3 (Order a part) and 6 (Sell a removed part) pass in e2e.

### M4 — Media, quick-add, Gallery

Upload pipeline; attachments panel on every record type; Before/During/After tagging and highlight star; global quick-add sheet (photo, job picker with recent first, note); Gallery with filters and month grouping; lightbox with slide captions; scoped "View photos" on job, phase, part, and watch item.

- [ ] A phone-sized e2e uploads a photo via quick-add in two taps after choosing the file, and it appears on the job and in the Gallery under its taken month.
- [ ] Inspiration media never appears in the Gallery; receipts appear only with the toggle on.
- [ ] Spec flows 1, 10, and 11 pass in e2e.

### M5 — Watch list and tasks

Watch item CRUD with relative follow-up inputs; check-ins with odometer and media; promote, resolve, dismiss; suspected parts. Tasks CRUD with links and the blocks-job toggle; Tasks screen; task checklist on job detail; Add task from any record.

- [ ] Rules 15–18 and 20 have unit tests.
- [ ] A task with `blocks_job` prevents its job from moving to ready until completed.
- [ ] Spec flows 7, 8, and 9 pass in e2e.

### M6 — Inspiration

Inspiration board with cards, tag filter, image upload, and promote to part or job.

- [ ] Rule 19 has unit tests.
- [ ] Spec flow 4 passes in e2e.

### M7 — Dashboard

The dashboard as specified: totals by bucket, active phase budget bar, ready and waiting jobs, parts in `ordered`, watch items due or overdue, open tasks due within 7 days, quick odometer update, latest highlight photo. Every card links to its screen.

- [ ] With the seed data, each card shows the expected values (asserted in e2e).
- [ ] Dashboard loads in under 1 second on a warm Vercel deployment with the seed data.

### M8 — Exports

The four exports from the Media pipeline and exports section, with a page on the vehicle screen to choose options and download.

- [ ] Each export downloads with the seed data and opens without errors (PDF parsed in a test; xlsx reopened with exceljs).
- [ ] Toggling `costs=0` removes every dollar amount from both PDFs.

### M9 — Hardening

PWA manifest and icons (installable, no offline), empty states for every screen, error and loading states, keyboard and screen-reader basics on forms and the lightbox, and a full e2e run.

- [ ] All 11 spec flows pass in e2e at phone and desktop viewports.
- [ ] Lighthouse accessibility score of at least 90 on dashboard, plan, and gallery.
- [ ] `README.md` explains local setup, deploy, and how to download a full backup via the xlsx export.

## Testing and definition of done

Three test layers, each with a clear job. Business rules are tested where they live, not through the UI.

| Layer | Tool | Covers | Runs against |
| --- | --- | --- | --- |
| Unit | Vitest | Every function in `lib/domain/`, each numbered rule at least once | Nothing (pure) |
| Database | Vitest | Views, constraints, RLS, storage policies | Local Supabase, reset per run |
| End-to-end | Playwright | Spec flows 1–11, phone (390×844) and desktop (1280×800) viewports | Local app + local Supabase with `seed.sql`; auth by a test-only magic-link helper that reads the Supabase CLI's local mail catcher |

**Commands** (define as npm scripts and list them in `CLAUDE.md`):

```
npm run typecheck   # tsc --noEmit
npm run lint
npm run test        # unit + database
npm run test:e2e
npm run db:reset    # supabase db reset (migrations + seed)
npm run db:types    # regenerate lib/db/types.ts
```

**Definition of done for each milestone**

- [ ] Every acceptance criterion for the milestone is checked.
- [ ] typecheck, lint, test, and test:e2e pass locally; CI is green.
- [ ] `db:types` was run after any migration and the result committed.
- [ ] No TODOs left in code for the milestone's scope; deferred items are logged in `DECISIONS.md`.
- [ ] Deployed to Vercel production and smoke-checked: sign in, open each screen touched by the milestone.
- [ ] A short milestone note appended to `DECISIONS.md`: what shipped, decisions made, anything the human should know.

## Human setup

The agent cannot do these. It should stop at the first milestone that needs one and ask, naming the step.

| Step | When | What to do |
| --- | --- | --- |
| 1 | Before M0 | Create a private GitHub repo and give the agent push access; install Docker locally for the Supabase CLI |
| 2 | Before M0 deploy | Create a Supabase project (US West region) and a Vercel project linked to the repo |
| 3 | Before M0 deploy | In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon or publishable key), and `ALLOWED_EMAIL`. Do not add the service-role key |
| 4 | Before M1 deploy | In Supabase Auth: disable public sign-ups, enable email magic link, set Site URL to the production URL, and add the production and preview callback URLs (`/auth/callback`) to redirect URLs |
| 5 | Before M1 deploy | Link the CLI (`supabase link`) and approve the first `supabase db push` of migrations to production |
| 6 | Before M4 | Confirm the Storage upload size limit on the `attachments` bucket fits phone video clips, within your plan's limits |
| 7 | Any time | Decide on the Supabase plan. Free-tier projects can pause after inactivity, which matters for a hobby app opened occasionally; check current terms |

Every later production migration goes through `supabase db push`; the agent runs it only after the human approves in chat.
