-- M2: plan and work log.

-- Rule 1: open blockers of each job, one row per blocker (jobs not done/cancelled,
-- plus open tasks linked with blocks_job). Must match lib/domain/jobs.ts openBlockers().
create view v_job_open_blockers with (security_invoker = true) as
select d.job_id, 'job'::text as kind, b.id as blocker_id, b.title
from job_dependencies d
join jobs b on b.id = d.blocked_by_job_id
where b.status not in ('done', 'cancelled')
union all
select l.job_id, 'task'::text as kind, t.id as blocker_id, t.title
from task_links l
join tasks t on t.id = l.task_id
where l.blocks_job and t.status = 'open';

-- Count of open blockers for every job (zero included).
create view v_job_blockers with (security_invoker = true) as
select j.id as job_id, count(b.blocker_id)::int as open_blockers
from jobs j
left join v_job_open_blockers b on b.job_id = j.id
group by j.id;

-- Rule 14: a done job's odometer reading raises the vehicle's current odometer and never
-- lowers it. A trigger keeps the job write and the odometer raise in one transaction for
-- every path that saves a done job. Must match lib/domain/odometer.ts odometerAfterReading().
create function public.raise_vehicle_odometer_from_job() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'done' and new.completed_odometer is not null then
    update public.vehicles
       set current_odometer = new.completed_odometer
     where id = new.vehicle_id
       and current_odometer < new.completed_odometer;
  end if;
  return null;
end;
$$;

create trigger jobs_raise_vehicle_odometer
after insert or update of status, completed_odometer on jobs
for each row execute function public.raise_vehicle_odometer_from_job();

-- Drag-to-reorder: rewrite sort_order for the given phase ids in one statement.
create function public.reorder_phases(p_phase_ids uuid[]) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.phases p
     set sort_order = o.ord::int
    from unnest(p_phase_ids) with ordinality as o(id, ord)
   where p.id = o.id;
$$;

revoke execute on function public.reorder_phases from public, anon;
grant execute on function public.reorder_phases to authenticated;
