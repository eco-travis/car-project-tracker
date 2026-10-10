-- M1: create the vehicle and its seeded phases in one transaction (rule 21).
-- Phase names come from lib/domain/phases.ts; this function only writes them.
create function public.create_vehicle_with_phases(
  p_name text,
  p_phase_names text[],
  p_year int default null,
  p_model text default null,
  p_generation text default null,
  p_vin text default null,
  p_current_odometer int default 0,
  p_purchase_date date default null,
  p_purchase_price_cents bigint default null
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.vehicles
    (name, year, model, generation, vin, current_odometer, purchase_date, purchase_price_cents)
  values
    (p_name, p_year, p_model, p_generation, p_vin, coalesce(p_current_odometer, 0),
     p_purchase_date, p_purchase_price_cents)
  returning id into v_id;

  insert into public.phases (vehicle_id, name, sort_order)
  select v_id, n.name, n.ord::int
  from unnest(p_phase_names) with ordinality as n(name, ord);

  return v_id;
end;
$$;

revoke execute on function public.create_vehicle_with_phases from public, anon;
grant execute on function public.create_vehicle_with_phases to authenticated;
