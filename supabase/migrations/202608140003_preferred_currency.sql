alter table public.profiles
add column if not exists preferred_currency text not null default 'EUR'
check (preferred_currency in ('USD', 'EUR', 'CHF'));

grant select (preferred_currency) on public.profiles to authenticated;
grant insert (preferred_currency) on public.profiles to authenticated;
grant update (preferred_currency) on public.profiles to authenticated;

alter table public.items
drop constraint if exists items_replacement_value_currency_allowed;

alter table public.items
add constraint items_replacement_value_currency_allowed
check (replacement_value_currency is null or replacement_value_currency in ('USD', 'EUR', 'CHF'));
