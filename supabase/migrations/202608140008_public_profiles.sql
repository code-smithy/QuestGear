create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  public_region text,
  account_status text,
  created_at timestamptz,
  locations jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.display_name,
    profiles.avatar_url,
    profiles.bio,
    profiles.public_region,
    profiles.account_status,
    profiles.created_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', profile_locations.id,
          'public_region', profile_locations.public_region,
          'region_center_lat', profile_locations.region_center_lat,
          'region_center_lng', profile_locations.region_center_lng,
          'is_default', profile_locations.is_default,
          'sort_order', profile_locations.sort_order
        )
        order by profile_locations.is_default desc, profile_locations.sort_order asc
      ) filter (where profile_locations.id is not null),
      '[]'::jsonb
    ) as locations
  from public.profiles
  left join public.profile_locations
    on profile_locations.user_id = profiles.id
  where profiles.id = p_user_id
  and profiles.account_status = 'active'
  group by profiles.id;
$$;

grant execute on function public.get_public_profile(uuid) to anon, authenticated;
