-- M6: promote an inspiration card to a part or a job in one transaction (rule 19).
-- Field mapping comes from lib/domain/inspiration.ts; this function writes it and enforces the
-- overwrite confirmation (an existing link is replaced only when p_overwrite is true).

create function public.promote_inspiration_to_part(
  p_inspiration_id uuid,
  p_name text,
  p_product_url text default null,
  p_notes text default null,
  p_overwrite boolean default false
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_insp public.inspirations;
  v_part_id uuid;
begin
  select * into v_insp from public.inspirations where id = p_inspiration_id for update;
  if not found then
    raise exception 'Inspiration not found' using errcode = 'P0002';
  end if;
  if v_insp.promoted_part_id is not null and not p_overwrite then
    raise exception 'Already promoted to a part; confirm to overwrite' using errcode = '22023';
  end if;
  insert into public.parts (vehicle_id, name, status, product_url, notes)
  values (v_insp.vehicle_id, p_name, 'wishlist', p_product_url, p_notes)
  returning id into v_part_id;
  update public.inspirations set promoted_part_id = v_part_id where id = p_inspiration_id;
  return v_part_id;
end;
$$;

create function public.promote_inspiration_to_job(
  p_inspiration_id uuid,
  p_title text,
  p_type job_type,
  p_phase_id uuid default null,
  p_description text default null,
  p_links text[] default '{}',
  p_overwrite boolean default false
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_insp public.inspirations;
  v_job_id uuid;
begin
  select * into v_insp from public.inspirations where id = p_inspiration_id for update;
  if not found then
    raise exception 'Inspiration not found' using errcode = 'P0002';
  end if;
  if v_insp.promoted_job_id is not null and not p_overwrite then
    raise exception 'Already promoted to a job; confirm to overwrite' using errcode = '22023';
  end if;
  insert into public.jobs (vehicle_id, phase_id, title, type, status, description, links)
  values (v_insp.vehicle_id, p_phase_id, p_title, p_type, 'not_started', p_description, coalesce(p_links, '{}'))
  returning id into v_job_id;
  update public.inspirations set promoted_job_id = v_job_id where id = p_inspiration_id;
  return v_job_id;
end;
$$;

revoke execute on function public.promote_inspiration_to_part, public.promote_inspiration_to_job from public, anon;
grant execute on function public.promote_inspiration_to_part, public.promote_inspiration_to_job to authenticated;

create index inspirations_tags on inspirations using gin (tags);
