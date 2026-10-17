-- Parts: when it was installed (Travis, 2026-10-16). Backfill installed parts from their done
-- job's completion date; otherwise unknown (null) until set.
alter table parts add column installed_on date;

update parts p
   set installed_on = j.completed_on
  from jobs j
 where p.job_id = j.id
   and p.status = 'installed'
   and j.status = 'done';
