-- M5: watch list and tasks.

-- Rule 14: a check-in reading above the vehicle odometer raises it (never lowers it).
create function public.raise_vehicle_odometer_from_checkin() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.odometer is not null then
    update public.vehicles v
       set current_odometer = new.odometer
      from public.watch_items w
     where w.id = new.watch_item_id
       and v.id = w.vehicle_id
       and v.current_odometer < new.odometer;
  end if;
  return null;
end;
$$;

create trigger watch_checkins_raise_vehicle_odometer
after insert or update of odometer on watch_checkins
for each row execute function public.raise_vehicle_odometer_from_checkin();

-- Rule 15 (+ spec decision): watching items with due/overdue flags, today in Pacific time.
-- Must match lib/domain/watch.ts watchDue().
create view v_watch_due with (security_invoker = true) as
with t as (select (now() at time zone 'America/Los_Angeles')::date as today)
select w.id as watch_item_id,
  w.vehicle_id,
  (w.status = 'watching' and (
     (w.next_followup_on is not null and w.next_followup_on <= t.today)
     or (w.next_followup_odometer is not null and w.next_followup_odometer <= v.current_odometer)
  )) as is_due,
  (w.status = 'watching' and (
     (w.next_followup_on is not null and w.next_followup_on < t.today - 7)
     or (w.next_followup_odometer is not null and v.current_odometer - w.next_followup_odometer > 500)
  )) as is_overdue,
  (select max(c.checked_on) from watch_checkins c where c.watch_item_id = w.id) as last_checkin_on
from watch_items w
join vehicles v on v.id = w.vehicle_id
cross join t;

-- Rule 17: promote a watch item to a job in one transaction. Suspected parts without a job
-- move to the new job. Returns the job id.
create function public.promote_watch_item(
  p_item_id uuid,
  p_type job_type,
  p_phase_id uuid default null,
  p_title text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.watch_items;
  v_job_id uuid;
begin
  if p_type not in ('diagnosis', 'repair') then
    raise exception 'A watch item becomes a Diagnosis or Repair job' using errcode = '22023';
  end if;
  select * into v_item from public.watch_items where id = p_item_id for update;
  if not found then
    raise exception 'Watch item not found' using errcode = 'P0002';
  end if;
  if v_item.status <> 'watching' then
    raise exception 'Only a watching item can be promoted' using errcode = '22023';
  end if;

  insert into public.jobs (vehicle_id, phase_id, title, description, type)
  values (v_item.vehicle_id, p_phase_id, coalesce(nullif(trim(p_title), ''), v_item.title), v_item.description, p_type)
  returning id into v_job_id;

  update public.parts
     set job_id = v_job_id
   where job_id is null
     and id in (select part_id from public.watch_item_parts where watch_item_id = p_item_id);

  update public.watch_items
     set status = 'promoted', promoted_job_id = v_job_id
   where id = p_item_id;
  return v_job_id;
end;
$$;

-- Tasks: create with links, or replace a task's links, atomically.
-- p_links: [{"job_id":..., "part_id":..., "phase_id":..., "watch_item_id":..., "blocks_job": bool}]
create function public.set_task_links(p_task_id uuid, p_links jsonb) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.task_links where task_id = p_task_id;
  insert into public.task_links (task_id, job_id, part_id, phase_id, watch_item_id, blocks_job)
  select p_task_id,
    nullif(l->>'job_id', '')::uuid,
    nullif(l->>'part_id', '')::uuid,
    nullif(l->>'phase_id', '')::uuid,
    nullif(l->>'watch_item_id', '')::uuid,
    coalesce((l->>'blocks_job')::boolean, false)
  from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) as l;
end;
$$;

create function public.create_task_with_links(
  p_title text,
  p_links jsonb,
  p_notes text default null,
  p_due_on date default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_vehicle_id uuid;
  v_task_id uuid;
begin
  select id into v_vehicle_id from public.vehicles limit 1;
  if v_vehicle_id is null then
    raise exception 'No vehicle' using errcode = 'P0002';
  end if;
  insert into public.tasks (vehicle_id, title, notes, due_on)
  values (v_vehicle_id, p_title, p_notes, p_due_on)
  returning id into v_task_id;
  perform public.set_task_links(v_task_id, p_links);
  return v_task_id;
end;
$$;

revoke execute on function public.promote_watch_item, public.set_task_links, public.create_task_with_links from public, anon;
grant execute on function public.promote_watch_item, public.set_task_links, public.create_task_with_links to authenticated;
