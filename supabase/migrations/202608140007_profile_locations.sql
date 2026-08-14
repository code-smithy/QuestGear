create table if not exists public.profile_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  private_address text check (private_address is null or char_length(private_address) <= 500),
  map_url text check (map_url is null or char_length(map_url) <= 1000),
  public_region text not null check (char_length(public_region) between 1 and 100),
  region_center_lat numeric(9, 6) check (region_center_lat is null or region_center_lat between -90 and 90),
  region_center_lng numeric(9, 6) check (region_center_lng is null or region_center_lng between -180 and 180),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_locations_user_sort_idx on public.profile_locations(user_id, sort_order);
create unique index if not exists profile_locations_one_default_idx on public.profile_locations(user_id)
where is_default;

drop trigger if exists profile_locations_set_updated_at on public.profile_locations;
create trigger profile_locations_set_updated_at
before update on public.profile_locations
for each row
execute function public.set_updated_at();

create table if not exists public.item_location_assignments (
  item_id uuid primary key references public.items(id) on delete cascade,
  profile_location_id uuid not null references public.profile_locations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists item_location_assignments_location_idx
on public.item_location_assignments(profile_location_id);

alter table public.profile_locations enable row level security;
alter table public.item_location_assignments enable row level security;

drop policy if exists "Users manage own profile locations" on public.profile_locations;
create policy "Users manage own profile locations"
on public.profile_locations
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Owners manage own item location assignments" on public.item_location_assignments;
create policy "Owners manage own item location assignments"
on public.item_location_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = item_location_assignments.item_id
    and items.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.items
    where items.id = item_location_assignments.item_id
    and items.owner_id = auth.uid()
  )
);

revoke all on public.profile_locations from anon, authenticated;
revoke all on public.item_location_assignments from anon, authenticated;

grant select on public.profile_locations to authenticated;
grant select on public.item_location_assignments to authenticated;

create or replace function public.save_own_profile(
  p_display_name text,
  p_bio text,
  p_country_code text,
  p_public_region text,
  p_time_zone text,
  p_reminder_lead_days integer,
  p_browser_push_enabled boolean,
  p_preferred_locale text,
  p_preferred_currency text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.profiles (
    id,
    display_name,
    bio,
    country_code,
    public_region,
    time_zone,
    reminder_lead_days,
    browser_push_enabled,
    preferred_locale,
    preferred_currency
  )
  values (
    v_user_id,
    trim(p_display_name),
    nullif(trim(p_bio), ''),
    nullif(upper(trim(p_country_code)), ''),
    nullif(trim(p_public_region), ''),
    trim(p_time_zone),
    p_reminder_lead_days,
    p_browser_push_enabled,
    p_preferred_locale,
    p_preferred_currency
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    bio = excluded.bio,
    country_code = excluded.country_code,
    public_region = excluded.public_region,
    time_zone = excluded.time_zone,
    reminder_lead_days = excluded.reminder_lead_days,
    browser_push_enabled = excluded.browser_push_enabled,
    preferred_locale = excluded.preferred_locale,
    preferred_currency = excluded.preferred_currency
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.replace_profile_locations(p_locations jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_first_default integer;
  v_count integer;
  v_location_ids uuid[] := '{}';
  v_location_id uuid;
  v_location record;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(coalesce(p_locations, '[]'::jsonb));

  if v_count > 10 then
    raise exception 'too_many_locations';
  end if;

  select min(ord)::integer into v_first_default
  from jsonb_array_elements(coalesce(p_locations, '[]'::jsonb)) with ordinality location(value, ord)
  where coalesce((value ->> 'isDefault')::boolean, false);

  update public.profile_locations
  set is_default = false
  where user_id = v_user_id;

  for v_location in
    select value, ord
    from jsonb_array_elements(coalesce(p_locations, '[]'::jsonb)) with ordinality location(value, ord)
    where trim(coalesce(value ->> 'label', '')) <> ''
    and trim(coalesce(value ->> 'publicRegion', '')) <> ''
  loop
    if coalesce(v_location.value ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and exists (
        select 1
        from public.profile_locations
        where id = (v_location.value ->> 'id')::uuid
        and user_id = v_user_id
      )
    then
      v_location_id := (v_location.value ->> 'id')::uuid;
    else
      v_location_id := gen_random_uuid();
    end if;

    insert into public.profile_locations (
      id,
      user_id,
      label,
      private_address,
      map_url,
      public_region,
      region_center_lat,
      region_center_lng,
      is_default,
      sort_order
    )
    values (
      v_location_id,
      v_user_id,
      left(trim(v_location.value ->> 'label'), 80),
      nullif(left(trim(coalesce(v_location.value ->> 'privateAddress', '')), 500), ''),
      nullif(left(trim(coalesce(v_location.value ->> 'mapUrl', '')), 1000), ''),
      left(trim(v_location.value ->> 'publicRegion'), 100),
      nullif(v_location.value ->> 'regionCenterLat', '')::numeric,
      nullif(v_location.value ->> 'regionCenterLng', '')::numeric,
      case
        when v_first_default is null then v_location.ord = 1
        else v_location.ord = v_first_default
      end,
      v_location.ord - 1
    )
    on conflict (id) do update set
      label = excluded.label,
      private_address = excluded.private_address,
      map_url = excluded.map_url,
      public_region = excluded.public_region,
      region_center_lat = excluded.region_center_lat,
      region_center_lng = excluded.region_center_lng,
      is_default = excluded.is_default,
      sort_order = excluded.sort_order
    where profile_locations.user_id = v_user_id;

    v_location_ids := array_append(v_location_ids, v_location_id);
  end loop;

  delete from public.profile_locations
  where user_id = v_user_id
  and not (id = any(v_location_ids));
end;
$$;

create or replace function public.save_item_location_assignment(
  p_item_id uuid,
  p_profile_location_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_location public.profile_locations%rowtype;
begin
  select owner_id into v_owner_id
  from public.items
  where id = p_item_id
  for update;

  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'item_not_found';
  end if;

  delete from public.item_location_assignments
  where item_id = p_item_id;

  if p_profile_location_id is null then
    return;
  end if;

  select * into v_location
  from public.profile_locations
  where id = p_profile_location_id
  and user_id = auth.uid();

  if not found then
    raise exception 'location_not_found';
  end if;

  insert into public.item_location_assignments (item_id, profile_location_id)
  values (p_item_id, p_profile_location_id);

  update public.items
  set public_region = v_location.public_region
  where id = p_item_id;
end;
$$;

grant execute on function public.save_own_profile(text, text, text, text, text, integer, boolean, text, text) to authenticated;
grant execute on function public.replace_profile_locations(jsonb) to authenticated;
grant execute on function public.save_item_location_assignment(uuid, uuid) to authenticated;
