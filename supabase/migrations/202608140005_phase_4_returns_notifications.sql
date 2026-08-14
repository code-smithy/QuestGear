alter table public.loans
  add column if not exists return_submitted_at timestamptz,
  add column if not exists return_accepted_at timestamptz,
  add column if not exists disputed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists version integer not null default 1;

drop trigger if exists loans_increment_version on public.loans;
create or replace function public.increment_loan_version()
returns trigger
language plpgsql
as $$
begin
  new.version = old.version + 1;
  return new;
end;
$$;

create trigger loans_increment_version
before update on public.loans
for each row
execute function public.increment_loan_version();

alter table public.loan_events drop constraint if exists loan_events_event_type_check;
alter table public.loan_events
  add constraint loan_events_event_type_check check (
    event_type in (
      'requested',
      'approved',
      'rejected',
      'countered',
      'cancelled',
      'lender_handover_confirmed',
      'borrower_receipt_confirmed',
      'handover_completed',
      'extension_requested',
      'extension_approved',
      'extension_rejected',
      'return_submitted',
      'return_accepted',
      'return_disputed',
      'due_reminder',
      'due_reached',
      'overdue'
    )
  );

create table if not exists public.loan_extension_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_due_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'superseded')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists loan_extension_requests_one_pending_idx
on public.loan_extension_requests(loan_id)
where status = 'pending';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null check (char_length(title) <= 160),
  body text not null check (char_length(body) <= 500),
  target_path text not null check (char_length(target_path) <= 300),
  deduplication_key text not null check (char_length(deduplication_key) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, deduplication_key)
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id) where read_at is null;

create table if not exists public.loan_evidence_files (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  report_id uuid not null references public.loan_condition_reports(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  storage_bucket text not null default 'loan-evidence',
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

insert into storage.buckets (id, name, public)
values ('loan-evidence', 'loan-evidence', false)
on conflict (id) do update set public = false;

alter table public.loan_extension_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.loan_evidence_files enable row level security;

drop policy if exists "Loan parties can read extension requests" on public.loan_extension_requests;
create policy "Loan parties can read extension requests"
on public.loan_extension_requests
for select
to authenticated
using (public.is_loan_party(loan_id));

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Loan parties can read evidence files" on public.loan_evidence_files;
create policy "Loan parties can read evidence files"
on public.loan_evidence_files
for select
to authenticated
using (public.is_loan_party(loan_id));

revoke all on public.loan_extension_requests from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.loan_evidence_files from anon, authenticated;

grant select on public.loan_extension_requests to authenticated;
grant select, update(read_at) on public.notifications to authenticated;
grant select on public.loan_evidence_files to authenticated;

create or replace function public.create_loan_notification(
  p_loan_id uuid,
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_deduplication_suffix text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, target_path, deduplication_key)
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    '/loans/' || p_loan_id::text,
    'loan:' || p_loan_id::text || ':' || p_deduplication_suffix
  )
  on conflict (user_id, deduplication_key) do nothing;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
  and user_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
  and read_at is null;
$$;

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

  select owner_id into v_owner_id
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

  for v_item in select * from public.items where id = any(p_item_ids) loop
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

  perform public.create_loan_notification(
    v_loan_id,
    v_owner_id,
    'loan_requested',
    'Neue Ausleihanfrage',
    'Eine neue Ausleihanfrage wartet auf deine Antwort.',
    'requested'
  );

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
  select * into v_loan from public.loans where id = p_loan_id for update;

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

  update public.loans set status = 'approved' where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'approved', auth.uid());

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.borrower_id,
    'loan_approved',
    'Ausleihe genehmigt',
    'Deine Ausleihanfrage wurde genehmigt.',
    'approved'
  );
end;
$$;

create or replace function public.reject_loan(p_loan_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or v_loan.owner_id <> auth.uid() or v_loan.status not in ('requested', 'countered') then
    raise exception 'loan_not_rejectable';
  end if;

  update public.loans set status = 'rejected' where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id, event_data)
  values (p_loan_id, 'rejected', auth.uid(), jsonb_build_object('reason', nullif(trim(p_reason), '')));

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.borrower_id,
    'loan_rejected',
    'Ausleihe abgelehnt',
    'Deine Ausleihanfrage wurde abgelehnt.',
    'rejected'
  );
end;
$$;

create or replace function public.cancel_loan(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_recipient uuid;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or auth.uid() not in (v_loan.owner_id, v_loan.borrower_id) or v_loan.status not in ('requested', 'countered', 'approved') then
    raise exception 'loan_not_cancellable';
  end if;

  update public.loans set status = 'cancelled', cancelled_at = now() where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'cancelled', auth.uid());

  v_recipient := case when auth.uid() = v_loan.owner_id then v_loan.borrower_id else v_loan.owner_id end;
  perform public.create_loan_notification(
    p_loan_id,
    v_recipient,
    'loan_cancelled',
    'Ausleihe storniert',
    'Eine Ausleihe wurde storniert.',
    'cancelled'
  );
end;
$$;

create or replace function public.confirm_handover(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_now timestamptz := now();
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or auth.uid() not in (v_loan.owner_id, v_loan.borrower_id) then
    raise exception 'loan_not_found';
  end if;

  if v_loan.status <> 'approved' then
    raise exception 'invalid_status';
  end if;

  if auth.uid() = v_loan.owner_id then
    if v_loan.lender_handover_confirmed_at is null then
      update public.loans
      set lender_handover_confirmed_at = v_now
      where id = p_loan_id;

      insert into public.loan_events (loan_id, event_type, actor_id)
      values (p_loan_id, 'lender_handover_confirmed', auth.uid());
    end if;
  else
    if v_loan.borrower_receipt_confirmed_at is null then
      update public.loans
      set borrower_receipt_confirmed_at = v_now
      where id = p_loan_id;

      insert into public.loan_events (loan_id, event_type, actor_id)
      values (p_loan_id, 'borrower_receipt_confirmed', auth.uid());
    end if;
  end if;

  select * into v_loan from public.loans where id = p_loan_id for update;

  if v_loan.lender_handover_confirmed_at is not null and v_loan.borrower_receipt_confirmed_at is not null then
    update public.loans
    set status = 'active', activated_at = coalesce(activated_at, v_now)
    where id = p_loan_id;

    insert into public.loan_events (loan_id, event_type, actor_id)
    values (p_loan_id, 'handover_completed', auth.uid());

    perform public.create_loan_notification(
      p_loan_id,
      v_loan.owner_id,
      'handover_completed',
      'Ausleihe aktiv',
      'Die Übergabe wurde von beiden Seiten bestätigt.',
      'handover-completed-owner'
    );
    perform public.create_loan_notification(
      p_loan_id,
      v_loan.borrower_id,
      'handover_completed',
      'Ausleihe aktiv',
      'Die Übergabe wurde von beiden Seiten bestätigt.',
      'handover-completed-borrower'
    );
  end if;
end;
$$;

create or replace function public.request_extension(p_loan_id uuid, p_requested_due_at timestamptz, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_request_id uuid;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or v_loan.borrower_id <> auth.uid() or v_loan.status <> 'active' then
    raise exception 'extension_not_requestable';
  end if;

  if p_requested_due_at <= v_loan.due_at then
    raise exception 'extension_must_extend_due_date';
  end if;

  update public.loan_extension_requests
  set status = 'superseded', responded_at = now()
  where loan_id = p_loan_id
  and status = 'pending';

  insert into public.loan_extension_requests (loan_id, requested_by, requested_due_at, reason)
  values (p_loan_id, auth.uid(), p_requested_due_at, nullif(trim(p_reason), ''))
  returning id into v_request_id;

  insert into public.loan_events (loan_id, event_type, actor_id, event_data)
  values (p_loan_id, 'extension_requested', auth.uid(), jsonb_build_object('requested_due_at', p_requested_due_at));

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.owner_id,
    'extension_requested',
    'Verlängerung angefragt',
    'Eine Verlängerungsanfrage wartet auf deine Antwort.',
    'extension-requested-' || v_request_id::text
  );

  return v_request_id;
end;
$$;

create or replace function public.respond_to_extension(p_extension_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_extension_requests%rowtype;
  v_loan public.loans%rowtype;
begin
  select * into v_request
  from public.loan_extension_requests
  where id = p_extension_request_id
  for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'extension_not_pending';
  end if;

  select * into v_loan from public.loans where id = v_request.loan_id for update;

  if v_loan.owner_id <> auth.uid() or v_loan.status <> 'active' then
    raise exception 'extension_not_respondable';
  end if;

  if p_approve then
    perform 1
    from public.loan_items requested_item
    join public.loan_items reserved_item on reserved_item.item_id = requested_item.item_id
    join public.loans reserved_loan on reserved_loan.id = reserved_item.loan_id
    where requested_item.loan_id = v_loan.id
    and reserved_loan.id <> v_loan.id
    and reserved_loan.status in ('approved', 'active', 'return_pending')
    and tstzrange(reserved_loan.starts_at, reserved_loan.due_at, '[)') &&
        tstzrange(v_loan.starts_at, v_request.requested_due_at, '[)')
    for update of reserved_loan;

    if found then
      raise exception 'reservation_conflict';
    end if;

    update public.loan_extension_requests
    set status = 'approved', responded_at = now()
    where id = p_extension_request_id;

    update public.loans
    set due_at = v_request.requested_due_at
    where id = v_loan.id;

    insert into public.loan_events (loan_id, event_type, actor_id, event_data)
    values (v_loan.id, 'extension_approved', auth.uid(), jsonb_build_object('due_at', v_request.requested_due_at));

    perform public.create_loan_notification(
      v_loan.id,
      v_loan.borrower_id,
      'extension_approved',
      'Verlängerung genehmigt',
      'Die neue Rückgabefrist wurde übernommen.',
      'extension-approved-' || p_extension_request_id::text
    );
  else
    update public.loan_extension_requests
    set status = 'rejected', responded_at = now()
    where id = p_extension_request_id;

    insert into public.loan_events (loan_id, event_type, actor_id)
    values (v_loan.id, 'extension_rejected', auth.uid());

    perform public.create_loan_notification(
      v_loan.id,
      v_loan.borrower_id,
      'extension_rejected',
      'Verlängerung abgelehnt',
      'Die Verlängerungsanfrage wurde abgelehnt.',
      'extension-rejected-' || p_extension_request_id::text
    );
  end if;
end;
$$;

create or replace function public.submit_return(
  p_loan_id uuid,
  p_claimed_event_at timestamptz,
  p_condition_note text,
  p_damage_note text default null,
  p_missing_content_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_report_id uuid;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or v_loan.borrower_id <> auth.uid() or v_loan.status <> 'active' then
    raise exception 'return_not_submittable';
  end if;

  insert into public.loan_condition_reports (
    loan_id,
    report_type,
    created_by,
    condition_note,
    damage_note,
    missing_content_note,
    claimed_event_at
  )
  values (
    p_loan_id,
    'return',
    auth.uid(),
    nullif(trim(p_condition_note), ''),
    nullif(trim(p_damage_note), ''),
    nullif(trim(p_missing_content_note), ''),
    p_claimed_event_at
  )
  returning id into v_report_id;

  update public.loans
  set status = 'return_pending', return_submitted_at = p_claimed_event_at
  where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id, event_data)
  values (p_loan_id, 'return_submitted', auth.uid(), jsonb_build_object('claimed_event_at', p_claimed_event_at));

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.owner_id,
    'return_submitted',
    'Rückgabe zu prüfen',
    'Der Ausleiher hat die Rückgabe eingereicht.',
    'return-submitted'
  );

  return v_report_id;
end;
$$;

create or replace function public.accept_return(p_loan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or v_loan.owner_id <> auth.uid() or v_loan.status <> 'return_pending' or v_loan.return_submitted_at is null then
    raise exception 'return_not_acceptable';
  end if;

  update public.loans
  set status = 'completed',
      return_accepted_at = now(),
      completed_at = now()
  where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'return_accepted', auth.uid());

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.borrower_id,
    'loan_completed',
    'Ausleihe abgeschlossen',
    'Die Rückgabe wurde akzeptiert.',
    'return-accepted'
  );
end;
$$;

create or replace function public.dispute_return(
  p_loan_id uuid,
  p_condition_note text default null,
  p_damage_note text default null,
  p_missing_content_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_report_id uuid;
begin
  select * into v_loan from public.loans where id = p_loan_id for update;

  if not found or v_loan.owner_id <> auth.uid() or v_loan.status <> 'return_pending' then
    raise exception 'return_not_disputable';
  end if;

  insert into public.loan_condition_reports (
    loan_id,
    report_type,
    created_by,
    condition_note,
    damage_note,
    missing_content_note,
    claimed_event_at
  )
  values (
    p_loan_id,
    'return',
    auth.uid(),
    nullif(trim(p_condition_note), ''),
    nullif(trim(p_damage_note), ''),
    nullif(trim(p_missing_content_note), ''),
    now()
  )
  returning id into v_report_id;

  update public.loans
  set status = 'disputed', disputed_at = now()
  where id = p_loan_id;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'return_disputed', auth.uid());

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.borrower_id,
    'return_disputed',
    'Rückgabe beanstandet',
    'Der Verleiher hat ein Problem zur Rückgabe gemeldet.',
    'return-disputed'
  );

  return v_report_id;
end;
$$;

create or replace function public.process_due_notifications(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
  v_profile record;
begin
  for v_row in
    select *
    from public.loans
    where status in ('active', 'return_pending')
  loop
    for v_profile in
      select id, reminder_lead_days
      from public.profiles
      where id in (v_row.owner_id, v_row.borrower_id)
    loop
      if v_row.status = 'active' and v_profile.reminder_lead_days > 0 and
        (v_row.due_at - make_interval(days => v_profile.reminder_lead_days)) <= p_now then
        perform public.create_loan_notification(
          v_row.id,
          v_profile.id,
          'due_reminder',
          'Rückgabe rückt näher',
          'Eine aktive Ausleihe erreicht bald die Rückgabefrist.',
          'due-reminder-' || v_profile.reminder_lead_days::text
        );
        v_count := v_count + 1;
      end if;

      if v_row.due_at <= p_now then
        perform public.create_loan_notification(
          v_row.id,
          v_profile.id,
          'due_reached',
          'Rückgabe fällig',
          'Eine Ausleihe hat die Rückgabefrist erreicht.',
          'due-reached'
        );
        v_count := v_count + 1;
      end if;

      if v_row.status = 'active' and v_row.return_submitted_at is null and v_row.due_at < p_now then
        perform public.create_loan_notification(
          v_row.id,
          v_profile.id,
          'loan_overdue',
          'Ausleihe überfällig',
          'Eine aktive Ausleihe ist überfällig.',
          'overdue'
        );
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.create_loan_request(uuid[], timestamptz, timestamptz, text) to authenticated;
grant execute on function public.approve_loan(uuid) to authenticated;
grant execute on function public.reject_loan(uuid, text) to authenticated;
grant execute on function public.cancel_loan(uuid) to authenticated;
grant execute on function public.confirm_handover(uuid) to authenticated;
grant execute on function public.request_extension(uuid, timestamptz, text) to authenticated;
grant execute on function public.respond_to_extension(uuid, boolean) to authenticated;
grant execute on function public.submit_return(uuid, timestamptz, text, text, text) to authenticated;
grant execute on function public.accept_return(uuid) to authenticated;
grant execute on function public.dispute_return(uuid, text, text, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.process_due_notifications(timestamptz) to authenticated;
