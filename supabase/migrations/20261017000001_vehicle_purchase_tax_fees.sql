-- Vehicle acquisition costs beyond the price (Travis, 2026-10-17): sales tax, and licensing and
-- registration paid at purchase. Total invested = purchase price + tax + fees + all paid.
-- Must match lib/domain/costs.ts purchaseCost() / vehicleTotals().
alter table vehicles
  add column purchase_tax_cents bigint,
  add column purchase_fees_cents bigint;

create or replace view v_vehicle_totals with (security_invoker = true) as
select v.id as vehicle_id,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'build'), 0)::bigint as build_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'ownership'), 0)::bigint as ownership_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'tools'), 0)::bigint as tools_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'recovered'), 0)::bigint as recovered_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid' and a.bucket = 'unassigned'), 0)::bigint as unassigned_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'committed'), 0)::bigint as committed_cents,
  coalesce(sum(a.amount_cents) filter (where a.state = 'paid'), 0)::bigint as paid_cents,
  (coalesce(v.purchase_price_cents, 0)
    + coalesce(v.purchase_tax_cents, 0)
    + coalesce(v.purchase_fees_cents, 0)
    + coalesce(sum(a.amount_cents) filter (where a.state = 'paid'), 0))::bigint as total_invested_cents,
  (select coalesce(sum(j.diy_hours), 0) from jobs j where j.vehicle_id = v.id)::numeric(10,2) as diy_hours
from vehicles v
left join v_expense_attribution a on a.vehicle_id = v.id
group by v.id;
