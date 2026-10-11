-- M4: media. Every attachment with what the Gallery and carousel captions need.
-- effective_phase_id: the attachment's own phase, else its job's phase (phase filter includes
-- its jobs' media). odometer: the parent job's completion reading, else the check-in's reading.
create view v_attachment_details with (security_invoker = true) as
select a.*,
  coalesce(a.phase_id, j.phase_id) as effective_phase_id,
  ph.name as phase_name,
  j.title as job_title,
  coalesce(j.completed_odometer, wc.odometer) as odometer,
  case
    when a.job_id is not null then 'job'
    when a.phase_id is not null then 'phase'
    when a.part_id is not null then 'part'
    when a.tool_id is not null then 'tool'
    when a.inspiration_id is not null then 'inspiration'
    when a.watch_item_id is not null then 'watch_item'
    when a.watch_checkin_id is not null then 'watch_checkin'
    when a.task_id is not null then 'task'
    when a.expense_id is not null then 'expense'
    else 'vehicle'
  end as parent_kind,
  coalesce(a.job_id, a.phase_id, a.part_id, a.tool_id, a.inspiration_id, a.watch_item_id,
           a.watch_checkin_id, a.task_id, a.expense_id) as parent_id,
  coalesce(j.title, pt.name, tl.name, ins.title, wi.title, wci.title, tk.title, ph.name) as parent_title,
  coalesce(wc.watch_item_id, a.watch_item_id) as effective_watch_item_id
from attachments a
left join jobs j on j.id = a.job_id
left join phases ph on ph.id = coalesce(a.phase_id, j.phase_id)
left join parts pt on pt.id = a.part_id
left join tools tl on tl.id = a.tool_id
left join inspirations ins on ins.id = a.inspiration_id
left join watch_items wi on wi.id = a.watch_item_id
left join watch_checkins wc on wc.id = a.watch_checkin_id
left join watch_items wci on wci.id = wc.watch_item_id
left join tasks tk on tk.id = a.task_id;

-- Keyset pagination for the Gallery orders by (taken_at, id).
create index attachments_vehicle_taken_id on attachments (vehicle_id, taken_at, id);
