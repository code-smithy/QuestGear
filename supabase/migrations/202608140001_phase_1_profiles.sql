create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  public_region text check (public_region is null or char_length(public_region) <= 100),
  time_zone text not null default 'Europe/Zurich' check (char_length(time_zone) > 0),
  reminder_lead_days integer not null default 2 check (reminder_lead_days between 0 and 30),
  browser_push_enabled boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active', 'suspended', 'deleted')),
  preferred_locale text not null default 'de' check (preferred_locale in ('de', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_account_status_idx on public.profiles(account_status);
create index if not exists profiles_public_region_idx on public.profiles(public_region)
where public_region is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_name text;
  safe_name text;
begin
  metadata_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1),
    'QuestGear user'
  );
  safe_name := left(nullif(trim(metadata_name), ''), 50);

  if safe_name is null or char_length(safe_name) < 2 then
    safe_name := 'QuestGear user';
  end if;

  insert into public.profiles (
    id,
    display_name,
    avatar_url,
    preferred_locale
  )
  values (
    new.id,
    safe_name,
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    'de'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Active profiles are visible to authenticated users" on public.profiles;
create policy "Active profiles are visible to authenticated users"
on public.profiles
for select
to authenticated
using (account_status = 'active');

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own active profile" on public.profiles;
create policy "Users can update their own active profile"
on public.profiles
for update
to authenticated
using (id = auth.uid() and account_status = 'active')
with check (id = auth.uid() and account_status = 'active');

revoke all on public.profiles from anon, authenticated;

grant select (
  id,
  display_name,
  avatar_url,
  bio,
  public_region,
  account_status,
  created_at
) on public.profiles to authenticated;

grant select (
  country_code,
  time_zone,
  reminder_lead_days,
  browser_push_enabled,
  preferred_locale,
  updated_at
) on public.profiles to authenticated;

grant insert (
  id,
  display_name,
  bio,
  country_code,
  public_region,
  time_zone,
  reminder_lead_days,
  browser_push_enabled,
  preferred_locale
) on public.profiles to authenticated;

grant update (
  display_name,
  bio,
  country_code,
  public_region,
  time_zone,
  reminder_lead_days,
  browser_push_enabled,
  preferred_locale
) on public.profiles to authenticated;
