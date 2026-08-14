create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 5000),
  category text not null check (
    category in (
      'miniatures',
      'terrain',
      'maps',
      'dungeon_tiles',
      'books',
      'board_games',
      'rpg_accessories',
      'tokens',
      'hobby_tools',
      'other'
    )
  ),
  overall_condition text not null check (overall_condition in ('new', 'very_good', 'good', 'worn', 'damaged')),
  public_region text not null check (char_length(public_region) between 1 and 100),
  state text not null default 'draft' check (state in ('draft', 'published', 'unavailable', 'archived')),
  game_system text check (game_system is null or char_length(game_system) <= 120),
  manufacturer text check (manufacturer is null or char_length(manufacturer) <= 120),
  language text check (language is null or char_length(language) <= 40),
  tags text[] not null default '{}',
  fragile boolean not null default false,
  minimum_notice_days integer not null default 1 check (minimum_notice_days between 0 and 90),
  maximum_loan_days integer not null default 14 check (maximum_loan_days between 1 and 365),
  replacement_value numeric(12, 2) check (replacement_value is null or replacement_value >= 0),
  replacement_value_currency text check (replacement_value_currency is null or replacement_value_currency ~ '^[A-Z]{3}$'),
  cover_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_owner_state_idx on public.items(owner_id, state);
create index if not exists items_published_updated_idx on public.items(updated_at desc) where state = 'published';
create index if not exists items_category_idx on public.items(category);
create index if not exists items_tags_idx on public.items using gin(tags);

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

create table if not exists public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text check (alt_text is null or char_length(alt_text) <= 160),
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (item_id, storage_path)
);

create unique index if not exists item_photos_one_cover_idx on public.item_photos(item_id)
where is_cover;

create table if not exists public.item_contents (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity integer not null default 1 check (quantity between 1 and 999),
  condition text not null check (condition in ('new', 'very_good', 'good', 'worn', 'damaged')),
  note text check (note is null or char_length(note) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists item_contents_item_sort_idx on public.item_contents(item_id, sort_order);

create table if not exists public.item_damage (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  damage_type text not null check (char_length(damage_type) between 1 and 80),
  severity text not null check (severity in ('cosmetic', 'minor', 'major', 'unusable')),
  description text not null check (char_length(description) between 1 and 1000),
  discovered_on date,
  resolved_at timestamptz,
  repair_note text check (repair_note is null or char_length(repair_note) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists item_damage_item_idx on public.item_damage(item_id);

create table if not exists public.item_unavailable_periods (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index if not exists item_unavailable_periods_item_range_idx
on public.item_unavailable_periods(item_id, starts_at, ends_at);

alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.item_contents enable row level security;
alter table public.item_damage enable row level security;
alter table public.item_unavailable_periods enable row level security;

drop policy if exists "Owners can read all own items and authenticated users can read published items" on public.items;
create policy "Owners can read all own items and authenticated users can read published items"
on public.items
for select
to authenticated
using (
  owner_id = auth.uid()
  or (
    state = 'published'
    and exists (
      select 1
      from public.profiles owner_profile
      where owner_profile.id = items.owner_id
      and owner_profile.account_status = 'active'
    )
  )
);

drop policy if exists "Owners can insert own items" on public.items;
create policy "Owners can insert own items"
on public.items
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Owners can update own items" on public.items;
create policy "Owners can update own items"
on public.items
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners can delete unused draft items" on public.items;
create policy "Owners can delete unused draft items"
on public.items
for delete
to authenticated
using (owner_id = auth.uid() and state = 'draft');

drop policy if exists "Visible item photos are readable" on public.item_photos;
create policy "Visible item photos are readable"
on public.item_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = item_photos.item_id
    and (
      items.owner_id = auth.uid()
      or items.state = 'published'
    )
  )
);

drop policy if exists "Owners manage item photos" on public.item_photos;
create policy "Owners manage item photos"
on public.item_photos
for all
to authenticated
using (exists (select 1 from public.items where items.id = item_photos.item_id and items.owner_id = auth.uid()))
with check (exists (select 1 from public.items where items.id = item_photos.item_id and items.owner_id = auth.uid()));

drop policy if exists "Visible item contents are readable" on public.item_contents;
create policy "Visible item contents are readable"
on public.item_contents
for select
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = item_contents.item_id
    and (
      items.owner_id = auth.uid()
      or items.state = 'published'
    )
  )
);

drop policy if exists "Owners manage item contents" on public.item_contents;
create policy "Owners manage item contents"
on public.item_contents
for all
to authenticated
using (exists (select 1 from public.items where items.id = item_contents.item_id and items.owner_id = auth.uid()))
with check (exists (select 1 from public.items where items.id = item_contents.item_id and items.owner_id = auth.uid()));

drop policy if exists "Visible item damage is readable" on public.item_damage;
create policy "Visible item damage is readable"
on public.item_damage
for select
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = item_damage.item_id
    and (
      items.owner_id = auth.uid()
      or items.state = 'published'
    )
  )
);

drop policy if exists "Owners manage item damage" on public.item_damage;
create policy "Owners manage item damage"
on public.item_damage
for all
to authenticated
using (exists (select 1 from public.items where items.id = item_damage.item_id and items.owner_id = auth.uid()))
with check (exists (select 1 from public.items where items.id = item_damage.item_id and items.owner_id = auth.uid()));

drop policy if exists "Owners manage unavailable periods" on public.item_unavailable_periods;
create policy "Owners manage unavailable periods"
on public.item_unavailable_periods
for all
to authenticated
using (
  exists (
    select 1
    from public.items
    where items.id = item_unavailable_periods.item_id
    and items.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.items
    where items.id = item_unavailable_periods.item_id
    and items.owner_id = auth.uid()
  )
);

revoke all on public.items from anon, authenticated;
revoke all on public.item_photos from anon, authenticated;
revoke all on public.item_contents from anon, authenticated;
revoke all on public.item_damage from anon, authenticated;
revoke all on public.item_unavailable_periods from anon, authenticated;

grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.item_photos to authenticated;
grant select, insert, update, delete on public.item_contents to authenticated;
grant select, insert, update, delete on public.item_damage to authenticated;
grant select, insert, update, delete on public.item_unavailable_periods to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-photos',
  'item-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read item photos" on storage.objects;
create policy "Authenticated users can read item photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'item-photos');

drop policy if exists "Owners write item photos under their user path" on storage.objects;
create policy "Owners write item photos under their user path"
on storage.objects
for all
to authenticated
using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can read profile photos" on storage.objects;
create policy "Authenticated users can read profile photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-photos');

drop policy if exists "Owners write profile photos under their user path" on storage.objects;
create policy "Owners write profile photos under their user path"
on storage.objects
for all
to authenticated
using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
