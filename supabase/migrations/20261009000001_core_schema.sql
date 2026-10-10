-- M1: core schema. Target schema from docs/plan.md "Database schema".
-- Views arrive with M3 (costs) and M5 (watch due), alongside their tests.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type job_type         as enum ('maintenance','repair','modification','diagnosis');
create type job_status       as enum ('not_started','waiting_on_parts','ready','in_progress','done','cancelled');
create type performed_by     as enum ('diy','rented_bay','shop');
create type phase_status     as enum ('planned','active','done');
create type part_status      as enum ('idea','researching','wishlist','ordered','received','installed','removed','sold','returned');
create type part_category    as enum ('suspension','armor','lighting','recovery','electrical','tires_wheels','interior','fluids','other');
create type tool_status      as enum ('owned','borrowed','rented','need_to_buy');
create type expense_category as enum ('part','tool','shop_labor_bay','shipping_tax_fees','fluids_consumables','other','sale');
create type expense_state    as enum ('committed','paid');
create type watch_system     as enum ('engine','drivetrain','suspension','steering','brakes','electrical','body','other');
create type watch_severity   as enum ('monitor','concerning','act_soon');
create type watch_status     as enum ('watching','promoted','resolved','dismissed');
create type task_status      as enum ('open','done','dropped');
create type attachment_kind  as enum ('photo','clip','receipt','document');
create type attachment_tag   as enum ('before','during','after');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables. Every table carries owner_id, created_at, updated_at.
-- ---------------------------------------------------------------------------
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null, year int, model text, generation text, vin text,
  current_odometer int not null default 0 check (current_odometer >= 0),
  purchase_date date, purchase_price_cents bigint,
  notes text
);
-- MVP is single-vehicle; also guards onboarding against double submits.
create unique index vehicles_one_per_owner on vehicles (owner_id);

create table phases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vehicle_id uuid not null references vehicles on delete cascade,
  name text not null, description text,
  sort_order int not null,
  status phase_status not null default 'planned',
  budget_cents bigint,
  target_start date, target_end date
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  job_id uuid not null references jobs on delete cascade,
  blocked_by_job_id uuid not null references jobs on delete cascade,
  primary key (job_id, blocked_by_job_id),
  check (job_id <> blocked_by_job_id)
);

create table parts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vehicle_id uuid references vehicles on delete set null,
  name text not null, brand text, description text,
  status tool_status not null default 'owned',
  storage_location text, notes text
);

create table job_tools (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  job_id uuid not null references jobs on delete cascade,
  tool_id uuid not null references tools on delete cascade,
  primary key (job_id, tool_id)
);

create table inspirations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vehicle_id uuid not null references vehicles on delete cascade,
  title text not null, source_url text,
  tags text[] not null default '{}', notes text,
  promoted_part_id uuid references parts on delete set null,
  promoted_job_id uuid references jobs on delete set null
);

create table watch_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  watch_item_id uuid not null references watch_items on delete cascade,
  checked_on date not null, odometer int, observation text
);

create table watch_item_parts (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  watch_item_id uuid not null references watch_items on delete cascade,
  part_id uuid not null references parts on delete cascade,
  primary key (watch_item_id, part_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vehicle_id uuid not null references vehicles on delete cascade,
  title text not null, notes text,
  due_on date,
  status task_status not null default 'open',
  completed_on date
);

create table task_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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

-- ---------------------------------------------------------------------------
-- Indexes: every foreign key, plus the two query paths named in the plan.
-- (Composite primary keys already index their leading column.)
-- ---------------------------------------------------------------------------
create index on phases (vehicle_id);
create index on jobs (phase_id);
create index on jobs (vehicle_id, status);
create index on job_dependencies (blocked_by_job_id);
create index on parts (vehicle_id);
create index on parts (job_id);
create index on parts (replaces_part_id);
create index on tools (vehicle_id);
create index on job_tools (tool_id);
create index on inspirations (vehicle_id);
create index on inspirations (promoted_part_id);
create index on inspirations (promoted_job_id);
create index on watch_items (vehicle_id);
create index on watch_items (promoted_job_id);
create index on watch_checkins (watch_item_id);
create index on watch_item_parts (part_id);
create index on tasks (vehicle_id);
create index on task_links (task_id);
create index on task_links (job_id);
create index on task_links (part_id);
create index on task_links (phase_id);
create index on task_links (watch_item_id);
create index on expenses (vehicle_id);
create index on expenses (part_id);
create index on expenses (tool_id);
create index on expenses (job_id);
create index on expenses (phase_id);
create index on attachments (vehicle_id, taken_at);
create index on attachments (phase_id);
create index on attachments (job_id);
create index on attachments (part_id);
create index on attachments (tool_id);
create index on attachments (inspiration_id);
create index on attachments (watch_item_id);
create index on attachments (watch_checkin_id);
create index on attachments (task_id);
create index on attachments (expense_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers and owner-only RLS on every table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'vehicles','phases','jobs','job_dependencies','parts','tools','job_tools',
    'inspirations','watch_items','watch_checkins','watch_item_parts','tasks',
    'task_links','expenses','attachments'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated
         using (owner_id = (select auth.uid()))
         with check (owner_id = (select auth.uid()))', t);
  end loop;
end;
$$;
