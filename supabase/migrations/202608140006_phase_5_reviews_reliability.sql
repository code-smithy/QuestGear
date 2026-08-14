create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewee_id uuid not null references public.profiles(id) on delete restrict,
  reviewer_role text not null check (reviewer_role in ('borrower', 'lender')),
  rating_one integer not null check (rating_one between 1 and 5),
  rating_two integer not null check (rating_two between 1 and 5),
  rating_three integer not null check (rating_three between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  submitted_at timestamptz not null default now(),
  visible_at timestamptz,
  hidden_by_admin boolean not null default false,
  check (reviewer_id <> reviewee_id),
  unique (loan_id, reviewer_id)
);

create index if not exists reviews_reviewee_visible_idx on public.reviews(reviewee_id, visible_at)
where visible_at is not null and hidden_by_admin = false;

create table if not exists public.reliability_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete cascade,
  role text not null check (role in ('borrower', 'lender')),
  event_type text not null,
  points integer not null check (points <= 0),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null,
  voided_at timestamptz,
  unique (user_id, loan_id, event_type)
);

create index if not exists reliability_events_user_active_idx
on public.reliability_events(user_id, role, expires_at)
where voided_at is null;

create table if not exists public.reliability_scores (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  borrower_score integer not null default 80 check (borrower_score between 0 and 100),
  lender_score integer not null default 80 check (lender_score between 0 and 100),
  combined_score integer not null default 80 check (combined_score between 0 and 100),
  completed_as_borrower integer not null default 0 check (completed_as_borrower >= 0),
  completed_as_lender integer not null default 0 check (completed_as_lender >= 0),
  borrower_review_average numeric(3,2),
  lender_review_average numeric(3,2),
  borrower_review_count integer not null default 0 check (borrower_review_count >= 0),
  lender_review_count integer not null default 0 check (lender_review_count >= 0),
  confidence text not null default 'new' check (confidence in ('new', 'low', 'medium', 'high')),
  recent_penalty_summary jsonb not null default '[]',
  calculated_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
alter table public.reliability_events enable row level security;
alter table public.reliability_scores enable row level security;

drop policy if exists "Users can read own or revealed reviews" on public.reviews;
create policy "Users can read own or revealed reviews"
on public.reviews
for select
to authenticated
using (
  reviewer_id = auth.uid()
  or (visible_at is not null and hidden_by_admin = false)
);

drop policy if exists "Authenticated users can read reliability scores" on public.reliability_scores;
create policy "Authenticated users can read reliability scores"
on public.reliability_scores
for select
to authenticated
using (true);

revoke all on public.reviews from anon, authenticated;
revoke all on public.reliability_events from anon, authenticated;
revoke all on public.reliability_scores from anon, authenticated;

grant select on public.reviews to authenticated;
grant select on public.reliability_scores to authenticated;

create or replace function public.review_period_ends_at(p_completed_at timestamptz)
returns timestamptz
language sql
immutable
as $$
  select p_completed_at + interval '14 days';
$$;

create or replace function public.reveal_reviews_for_due_loans(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.reviews review
  set visible_at = coalesce(review.visible_at, p_now)
  from public.loans loan
  where loan.id = review.loan_id
  and loan.status = 'completed'
  and loan.completed_at is not null
  and public.review_period_ends_at(loan.completed_at) <= p_now
  and review.visible_at is null
  and review.hidden_by_admin = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.late_return_penalty_points(p_lateness interval)
returns integer
language sql
immutable
as $$
  select case
    when p_lateness <= interval '12 hours' then 0
    when p_lateness <= interval '2 days' then -5
    when p_lateness <= interval '4 days' then -10
    when p_lateness <= interval '7 days' then -20
    else -35
  end;
$$;

create or replace function public.recalculate_reliability(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_as_borrower integer;
  v_completed_as_lender integer;
  v_completed_total integer;
  v_borrower_rating_sum numeric;
  v_borrower_rating_count integer;
  v_lender_rating_sum numeric;
  v_lender_rating_count integer;
  v_borrower_review_component numeric;
  v_lender_review_component numeric;
  v_borrower_automatic_component numeric;
  v_lender_automatic_component numeric;
  v_borrower_score integer;
  v_lender_score integer;
  v_combined_score integer;
  v_confidence text;
  v_recent_penalties jsonb;
  v_loan record;
  v_penalty integer;
begin
  perform public.reveal_reviews_for_due_loans(now());

  select count(*) into v_completed_as_borrower
  from public.loans
  where borrower_id = p_user_id
  and status = 'completed';

  select count(*) into v_completed_as_lender
  from public.loans
  where owner_id = p_user_id
  and status = 'completed';

  for v_loan in
    select id, due_at, return_submitted_at
    from public.loans
    where borrower_id = p_user_id
    and status = 'completed'
    and return_submitted_at is not null
    and return_submitted_at > due_at
  loop
    v_penalty := public.late_return_penalty_points(v_loan.return_submitted_at - v_loan.due_at);

    if v_penalty < 0 then
      insert into public.reliability_events (user_id, loan_id, role, event_type, points, occurred_at, expires_at)
      values (
        p_user_id,
        v_loan.id,
        'borrower',
        'late_return_final',
        v_penalty,
        v_loan.return_submitted_at,
        v_loan.return_submitted_at + interval '365 days'
      )
      on conflict (user_id, loan_id, event_type)
      do update set points = excluded.points, occurred_at = excluded.occurred_at, expires_at = excluded.expires_at;
    end if;
  end loop;

  for v_loan in
    select id, return_submitted_at, return_accepted_at
    from public.loans
    where owner_id = p_user_id
    and status = 'completed'
    and return_submitted_at is not null
    and return_accepted_at is not null
    and return_accepted_at > return_submitted_at + interval '72 hours'
  loop
    insert into public.reliability_events (user_id, loan_id, role, event_type, points, occurred_at, expires_at)
    values (
      p_user_id,
      v_loan.id,
      'lender',
      'slow_return_response',
      -5,
      v_loan.return_accepted_at,
      v_loan.return_accepted_at + interval '365 days'
    )
    on conflict (user_id, loan_id, event_type)
    do update set points = excluded.points, occurred_at = excluded.occurred_at, expires_at = excluded.expires_at;
  end loop;

  select
    coalesce(sum(rating_one + rating_two + rating_three), 0),
    count(*) * 3
  into v_borrower_rating_sum, v_borrower_rating_count
  from public.reviews
  where reviewee_id = p_user_id
  and reviewer_role = 'lender'
  and visible_at is not null
  and hidden_by_admin = false;

  select
    coalesce(sum(rating_one + rating_two + rating_three), 0),
    count(*) * 3
  into v_lender_rating_sum, v_lender_rating_count
  from public.reviews
  where reviewee_id = p_user_id
  and reviewer_role = 'borrower'
  and visible_at is not null
  and hidden_by_admin = false;

  v_borrower_review_component := least(100, greatest(0, ((v_borrower_rating_sum + 4.0 * 5) / (v_borrower_rating_count + 5)) * 20));
  v_lender_review_component := least(100, greatest(0, ((v_lender_rating_sum + 4.0 * 5) / (v_lender_rating_count + 5)) * 20));

  select least(100, greatest(0, 100 + coalesce(sum(points), 0))) into v_borrower_automatic_component
  from public.reliability_events
  where user_id = p_user_id
  and role = 'borrower'
  and voided_at is null
  and expires_at > now();

  select least(100, greatest(0, 100 + coalesce(sum(points), 0))) into v_lender_automatic_component
  from public.reliability_events
  where user_id = p_user_id
  and role = 'lender'
  and voided_at is null
  and expires_at > now();

  v_borrower_score := round(0.80 * v_borrower_review_component + 0.20 * v_borrower_automatic_component);
  v_lender_score := round(0.80 * v_lender_review_component + 0.20 * v_lender_automatic_component);
  v_completed_total := v_completed_as_borrower + v_completed_as_lender;

  if v_completed_as_borrower = 0 and v_completed_as_lender = 0 then
    v_combined_score := round((v_borrower_score + v_lender_score) / 2.0);
  elsif v_completed_as_borrower = 0 then
    v_combined_score := v_lender_score;
  elsif v_completed_as_lender = 0 then
    v_combined_score := v_borrower_score;
  else
    v_combined_score := round(
      (v_borrower_score * v_completed_as_borrower + v_lender_score * v_completed_as_lender)::numeric /
      v_completed_total
    );
  end if;

  v_confidence := case
    when v_completed_total <= 2 then 'new'
    when v_completed_total <= 5 then 'low'
    when v_completed_total <= 14 then 'medium'
    else 'high'
  end;

  select coalesce(
    jsonb_agg(jsonb_build_object('role', role, 'event_type', event_type, 'points', points) order by occurred_at desc),
    '[]'::jsonb
  )
  into v_recent_penalties
  from (
    select role, event_type, points, occurred_at
    from public.reliability_events
    where user_id = p_user_id
    and voided_at is null
    and expires_at > now()
    order by occurred_at desc
    limit 5
  ) recent_event;

  insert into public.reliability_scores (
    user_id,
    borrower_score,
    lender_score,
    combined_score,
    completed_as_borrower,
    completed_as_lender,
    borrower_review_average,
    lender_review_average,
    borrower_review_count,
    lender_review_count,
    confidence,
    recent_penalty_summary,
    calculated_at
  )
  values (
    p_user_id,
    v_borrower_score,
    v_lender_score,
    v_combined_score,
    v_completed_as_borrower,
    v_completed_as_lender,
    case when v_borrower_rating_count > 0 then round(v_borrower_rating_sum / v_borrower_rating_count, 2) else null end,
    case when v_lender_rating_count > 0 then round(v_lender_rating_sum / v_lender_rating_count, 2) else null end,
    v_borrower_rating_count / 3,
    v_lender_rating_count / 3,
    v_confidence,
    v_recent_penalties,
    now()
  )
  on conflict (user_id)
  do update set
    borrower_score = excluded.borrower_score,
    lender_score = excluded.lender_score,
    combined_score = excluded.combined_score,
    completed_as_borrower = excluded.completed_as_borrower,
    completed_as_lender = excluded.completed_as_lender,
    borrower_review_average = excluded.borrower_review_average,
    lender_review_average = excluded.lender_review_average,
    borrower_review_count = excluded.borrower_review_count,
    lender_review_count = excluded.lender_review_count,
    confidence = excluded.confidence,
    recent_penalty_summary = excluded.recent_penalty_summary,
    calculated_at = excluded.calculated_at;
end;
$$;

create or replace function public.submit_review(
  p_loan_id uuid,
  p_rating_one integer,
  p_rating_two integer,
  p_rating_three integer,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan public.loans%rowtype;
  v_reviewer_id uuid := auth.uid();
  v_reviewee_id uuid;
  v_reviewer_role text;
  v_review_id uuid;
  v_review_count integer;
begin
  if v_reviewer_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_loan
  from public.loans
  where id = p_loan_id
  for update;

  if not found or v_reviewer_id not in (v_loan.owner_id, v_loan.borrower_id) then
    raise exception 'loan_not_found';
  end if;

  if v_loan.status <> 'completed' or v_loan.completed_at is null then
    raise exception 'loan_not_completed';
  end if;

  if public.review_period_ends_at(v_loan.completed_at) < now() then
    raise exception 'review_period_closed';
  end if;

  if p_rating_one not between 1 and 5 or p_rating_two not between 1 and 5 or p_rating_three not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;

  if v_reviewer_id = v_loan.owner_id then
    v_reviewee_id := v_loan.borrower_id;
    v_reviewer_role := 'lender';
  else
    v_reviewee_id := v_loan.owner_id;
    v_reviewer_role := 'borrower';
  end if;

  insert into public.reviews (
    loan_id,
    reviewer_id,
    reviewee_id,
    reviewer_role,
    rating_one,
    rating_two,
    rating_three,
    comment
  )
  values (
    p_loan_id,
    v_reviewer_id,
    v_reviewee_id,
    v_reviewer_role,
    p_rating_one,
    p_rating_two,
    p_rating_three,
    nullif(trim(p_comment), '')
  )
  returning id into v_review_id;

  select count(*) into v_review_count
  from public.reviews
  where loan_id = p_loan_id;

  if v_review_count >= 2 then
    update public.reviews
    set visible_at = coalesce(visible_at, now())
    where loan_id = p_loan_id
    and hidden_by_admin = false;
  end if;

  perform public.recalculate_reliability(v_loan.owner_id);
  perform public.recalculate_reliability(v_loan.borrower_id);

  perform public.create_loan_notification(
    p_loan_id,
    v_reviewee_id,
    'review_submitted',
    'Neue Bewertung',
    'Eine Bewertung wurde eingereicht und wird nach dem Review-Zeitraum sichtbar.',
    'review-submitted-' || v_review_id::text
  );

  return v_review_id;
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
  where id = p_loan_id
  returning * into v_loan;

  insert into public.loan_events (loan_id, event_type, actor_id)
  values (p_loan_id, 'return_accepted', auth.uid());

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.borrower_id,
    'loan_completed',
    'Ausleihe abgeschlossen',
    'Die Rückgabe wurde akzeptiert. Du kannst jetzt eine Bewertung abgeben.',
    'return-accepted'
  );

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.owner_id,
    'review_available',
    'Bewertung möglich',
    'Die Ausleihe ist abgeschlossen. Du kannst jetzt eine Bewertung abgeben.',
    'review-available-owner'
  );

  perform public.create_loan_notification(
    p_loan_id,
    v_loan.borrower_id,
    'review_available',
    'Bewertung möglich',
    'Die Ausleihe ist abgeschlossen. Du kannst jetzt eine Bewertung abgeben.',
    'review-available-borrower'
  );

  perform public.recalculate_reliability(v_loan.owner_id);
  perform public.recalculate_reliability(v_loan.borrower_id);
end;
$$;

grant execute on function public.submit_review(uuid, integer, integer, integer, text) to authenticated;
grant execute on function public.recalculate_reliability(uuid) to authenticated;
grant execute on function public.reveal_reviews_for_due_loans(timestamptz) to authenticated;
