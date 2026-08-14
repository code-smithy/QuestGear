create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  borrower_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'requested' check (
    status in (
      'requested',
      'countered',
      'approved',
      'active',
      'rejected',
      'cancelled',
      'return_pending',
      'completed',
      'disputed'
    )
  ),
  starts_at timestamptz not null,
  due_at timestamptz not null,
  note text check (note is null or char_length(note) <= 2000),
  lender_handover_confirmed_at timestamptz,
  borrower_receipt_confirmed_at timestamptz,
  activated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_id <> borrower_id),
  check (starts_at < due_at)
);

create index if not exists loans_owner_status_idx on public.loans(owner_id, status);
create index if not exists loans_borrower_status_idx on public.loans(borrower_id, status);
create index if not exists loans_period_idx on public.loans(starts_at, due_at);

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
before update on public.loans
for each row
execute function public.set_updated_at();

create table if not exists public.loan_items (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  item_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (loan_id, item_id)
);

create index if not exists loan_items_item_idx on public.loan_items(item_id);

create table if not exists public.loan_date_proposals (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  due_at timestamptz not null,
  note text check (note is null or char_length(note) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'superseded')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (starts_at < due_at)
);

create unique index if not exists loan_date_proposals_one_pending_idx on public.loan_date_proposals(loan_id)
where status = 'pending';

create table if not exists public.loan_condition_reports (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  report_type text not null check (report_type in ('handover', 'return')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  condition_note text check (condition_note is null or char_length(condition_note) <= 2000),
  damage_note text check (damage_note is null or char_length(damage_note) <= 2000),
  missing_content_note text check (missing_content_note is null or char_length(missing_content_note) <= 2000),
  claimed_event_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'requested',
      'approved',
      'rejected',
      'countered',
      'cancelled',
      'lender_handover_confirmed',
      'borrower_receipt_confirmed'
    )
  ),
  actor_id uuid references public.profiles(id) on delete restrict,
  event_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists loan_events_loan_created_idx on public.loan_events(loan_id, created_at);

alter table public.loans enable row level security;
alter table public.loan_items enable row level security;
alter table public.loan_date_proposals enable row level security;
alter table public.loan_condition_reports enable row level security;
alter table public.loan_events enable row level security;

create or replace function public.is_loan_party(p_loan_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.loans
    where id = p_loan_id
    and auth.uid() in (owner_id, borrower_id)
  );
$$;

drop policy if exists "Loan parties can read loans" on public.loans;
create policy "Loan parties can read loans"
on public.loans
for select
to authenticated
using (auth.uid() in (owner_id, borrower_id));

drop policy if exists "Loan parties can read loan items" on public.loan_items;
create policy "Loan parties can read loan items"
on public.loan_items
for select
to authenticated
using (public.is_loan_party(loan_id));

drop policy if exists "Loan parties can read date proposals" on public.loan_date_proposals;
create policy "Loan parties can read date proposals"
on public.loan_date_proposals
for select
to authenticated
using (public.is_loan_party(loan_id));

drop policy if exists "Loan parties can read condition reports" on public.loan_condition_reports;
create policy "Loan parties can read condition reports"
on public.loan_condition_reports
for select
to authenticated
using (public.is_loan_party(loan_id));

drop policy if exists "Loan parties can read events" on public.loan_events;
create policy "Loan parties can read events"
on public.loan_events
for select
to authenticated
using (public.is_loan_party(loan_id));

revoke all on public.loans from anon, authenticated;
revoke all on public.loan_items from anon, authenticated;
revoke all on public.loan_date_proposals from anon, authenticated;
revoke all on public.loan_condition_reports from anon, authenticated;
revoke all on public.loan_events from anon, authenticated;

grant select on public.loans to authenticated;
grant select on public.loan_items to authenticated;
grant select on public.loan_date_proposals to authenticated;
grant select on public.loan_condition_reports to authenticated;
grant select on public.loan_events to authenticated;

create or replace function public.create_loan_request(
  p_item_ids uuid[],
  p_starts_at timestamptz,
  p_due_at timestamptz,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borrower_id uuid := auth.uid();
  v_owner_id uuid;
  v_loan_id uuid;
  v_item record;
begin
  if v_borrower_id is null then
    raise exception 'not_authenticated';
  end if;

  if array_length(p_item_ids, 1) is null then
    raise exception 'no_items';
  end if;

  if p_starts_at >= p_due_at then
    raise exception 'invalid_period';
  end if;

  select owner_id
  into v_owner_id
  from public.items
  where id = p_item_ids[1]
  and state = 'published';

  if v_owner_id is null then
    raise exception 'item_not_requestable';
  end if;

  if v_owner_id = v_borrower_id then
    raise exception 'cannot_request_own_item';
  end if;

  if exists (
    select 1
    from public.items
    where id = any(p_item_ids)
    and (owner_id <> v_owner_id or state <> 'published')
  ) then
    raise exception 'items_must_share_owner_and_be_published';
  end if;

  insert into public.loans (owner_id, borrower_id, starts_at, due_at, note)
  values (v_owner_id, v_borrower_id, p_starts_at, p_due_at, nullif(trim(p_note), ''))
  returning id into v_loan_id;

  for v_item in
    select *
    from public.items
    where id = any(p_item_ids)
  loop
    insert into public.loan_items (loan_id, item_id, item_snapshot)
    values (
      v_loan_id,
      v_item.id,
      jsonb_build_object(
        'title', v_item.title,
        'category', v_item.category,
        'condition', v_item.overall_condition,
        'public_region', v_item.public_region
      )
    );
  end loop;

  insert into public.loan_date_proposals (loan_id, proposed_by, starts_at, due_at, note, status, responded_at)
  values (v_loan_id, v_borrower_id, p_starts_at, p_due_at, nullif(trim(p_note), ''), 'accepted', now());

  insert into public.loan_events (loan_id, event_type, actor_id, event_data)
  values (v_loan_id, 'requested', v_borrower_id, jsonb_build_object('starts_at', p_starts_at, 'due_at', p_due_at));

  return v_loan_id;
end;
$$;

create or replace function public.approve_loan(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
begin
  select *
  into v_loan
  from public.loans
  where id = p_loan_id
  for update;

  if not found then
    raise exception 'loan_not_found';
  end if;

  if v_loan.owner_id <> auth.uid() then
    raise exception 'not_lender';
  end if;

  if v_loan.status not in ('requested', 'countered') then
    raise exception 'invalid_status';
  end if;

  perform 1
  from public.loan_items requested_item
  join public.loan_items reserved_item on reserved_item.item_id = requested_item.item_id
  join public.loans reserved_loan on reserved_loan.id = reserved_item.loan_id
  where requested_item.loan_id = p_loan_id
  and reserved_loan.id <> p_loan_id
  and reserved_loan.status in ('approved', 'active', 'return_pending')
  and tstzrange(reserved_loan.starts_at, reserved_loan.due_at, '[)') &&
      tstzrange(v_loan.starts_at, v_loan.due_at, '[)')
  for update of reserved_loan;

  if found then
    raise exception 'reservation_conflict';
  end if;

  update public.loans
  set status = 'approved'
  where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'approved', auth.uid());
end;
$$;

create or replace function public.reject_loan(p_loan_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loans
  set status = 'rejected'
  where id = p_loan_id
  and owner_id = auth.uid()
  and status in ('requested', 'countered');

  if not found then
    raise exception 'loan_not_rejectable';
  end if;

  insert into public.loan_events (loan_id, event_type, actor_id, event_data)
  values (p_loan_id, 'rejected', auth.uid(), jsonb_build_object('reason', nullif(trim(p_reason), '')));
end;
$$;

create or replace function public.cancel_loan(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.loans
  set status = 'cancelled'
  where id = p_loan_id
  and auth.uid() in (owner_id, borrower_id)
  and status in ('requested', 'countered', 'approved');

  if not found then
    raise exception 'loan_not_cancellable';
  end if;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'cancelled', auth.uid());
end;
$$;

grant execute on function public.create_loan_request(uuid[], timestamptz, timestamptz, text) to authenticated;
grant execute on function public.approve_loan(uuid) to authenticated;
grant execute on function public.reject_loan(uuid, text) to authenticated;
grant execute on function public.cancel_loan(uuid) to authenticated;
