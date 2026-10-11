-- M3: parts, tools, money.

-- Rule 6: creating an expense linked to a part still in planning marks the part Ordered,
-- in the same transaction. Must match lib/domain/parts.ts partStatusAfterExpense().
create function public.mark_part_ordered_from_expense() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.part_id is not null then
    update public.parts
       set status = 'ordered'
     where id = new.part_id
       and status in ('idea', 'researching', 'wishlist');
  end if;
  return null;
end;
$$;

create trigger expenses_mark_part_ordered
after insert on expenses
for each row execute function public.mark_part_ordered_from_expense();

-- Rule 7: Record sale on a Removed part, atomically: negative paid 'sale' expense + part Sold.
-- Returns the new expense id.
create function public.record_part_sale(
  p_part_id uuid,
  p_price_cents bigint,
  p_spent_on date,
  p_vendor text default null,
  p_notes text default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_part public.parts;
  v_expense_id uuid;
begin
  if p_price_cents is null or p_price_cents <= 0 then
    raise exception 'Sale price must be positive' using errcode = '22023';
  end if;

  select * into v_part from public.parts where id = p_part_id for update;
  if not found then
    raise exception 'Part not found' using errcode = 'P0002';
  end if;
  if v_part.status <> 'removed' then
    raise exception 'Only a Removed part can be sold' using errcode = '22023';
  end if;

  insert into public.expenses (vehicle_id, spent_on, amount_cents, category, state, vendor, notes, part_id)
  values (v_part.vehicle_id, p_spent_on, -p_price_cents, 'sale', 'paid', p_vendor, p_notes, p_part_id)
  returning id into v_expense_id;

  update public.parts set status = 'sold' where id = p_part_id;
  return v_expense_id;
end;
$$;

revoke execute on function public.record_part_sale from public, anon;
grant execute on function public.record_part_sale to authenticated;

-- Rules 10 and 11: effective job (the expense's job, else its part's job), effective phase
-- (that job's phase, else the expense's own phase), and reporting bucket for every expense.
-- Must match lib/domain/costs.ts effectiveJobId / effectivePhaseId / expenseBucket.
create view v_expense_attribution with (security_invoker = true) as
select e.*,
  j.id as effective_job_id,
  coalesce(j.phase_id, e.phase_id) as effective_phase_id,
  case
    when e.category = 'tool'                          then 'tools'
    when e.amount_cents < 0                           then 'recovered'
    when j.id is not null and j.type = 'modification' then 'build'
    when j.id is not null                             then 'ownership'
    when e.phase_id is not null                       then 'build'
    else 'unassigned'
  end as bucket
from expenses e
left join parts p on p.id = e.part_id
left join jobs j on j.id = coalesce(e.job_id, p.job_id);

-- Rule 9: budget, committed, paid, remaining per job (remaining null without a budget).
create view v_job_costs with (security_invoker = true) as
select j.id as job_id,
  j.budget_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'committed'), 0)::bigint as committed_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid'), 0)::bigint as paid_cents,
  (j.budget_cents
    - coalesce(sum(a.amount_cents) filter (where a.state = 'committed'), 0)
    - coalesce(sum(a.amount_cents) filter (where a.state = 'paid'), 0))::bigint as remaining_cents
from jobs j
left join v_expense_attribution a on a.effective_job_id = j.id
group by j.id;

-- Rule 9 and 10 per phase, plus summed DIY hours of its jobs (rule 13).
create view v_phase_costs with (security_invoker = true) as
select ph.id as phase_id,
  ph.budget_cents,
  coalesce(c.committed, 0)::bigint as committed_cents,
  coalesce(c.paid, 0)::bigint as paid_cents,
  (ph.budget_cents - coalesce(c.committed, 0) - coalesce(c.paid, 0))::bigint as remaining_cents,
  coalesce(h.diy_hours, 0)::numeric(10,2) as diy_hours
from phases ph
left join (
  select effective_phase_id,
    sum(amount_cents) filter (where state = 'committed') as committed,
    sum(amount_cents) filter (where state = 'paid') as paid
  from v_expense_attribution
  group by effective_phase_id
) c on c.effective_phase_id = ph.id
left join (
  select phase_id, sum(diy_hours) as diy_hours from jobs group by phase_id
) h on h.phase_id = ph.id;

-- Rule 11: vehicle buckets of paid money, committed total, total invested, DIY hours.
create view v_vehicle_totals with (security_invoker = true) as
select v.id as vehicle_id,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'build'), 0)::bigint as build_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'ownership'), 0)::bigint as ownership_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'tools'), 0)::bigint as tools_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'recovered'), 0)::bigint as recovered_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'unassigned'), 0)::bigint as unassigned_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'committed'), 0)::bigint as committed_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid'), 0)::bigint as paid_cents,
  (coalesce(v.purchase_price_cents, 0)
    + coalesce(sum(a.amount_cents) filter (where a.state = 'paid'), 0))::bigint as total_invested_cents,
  (select coalesce(sum(j.diy_hours), 0) from jobs j where j.vehicle_id = v.id)::numeric(10,2) as diy_hours
from vehicles v
left join v_expense_attribution a on a.vehicle_id = v.id
group by v.id;

-- Per-part money for the Parts table: spent (positive amounts, committed or paid) and sold for.
create view v_part_costs with (security_invoker = true) as
select p.id as part_id,
  coalesce(sum(e.amount_cents) filter (where e.amount_cents > 0), 0)::bigint as spent_cents,
  coalesce(-sum(e.amount_cents) filter (where e.category = 'sale'), 0)::bigint as sold_cents
from parts p
left join expenses e on e.part_id = p.id
group by p.id;

-- Per-tool spend for the Tools table.
create view v_tool_costs with (security_invoker = true) as
select t.id as tool_id,
  coalesce(sum(e.amount_cents), 0)::bigint as spent_cents
from tools t
left join expenses e on e.tool_id = t.id
group by t.id;
