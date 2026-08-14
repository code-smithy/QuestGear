begin;

-- Phase 1 RLS smoke coverage for Supabase CLI database tests.
-- These assertions are intentionally small until the project adds a full DB test harness.

select plan(5);
select has_table('public', 'profiles', 'profiles table exists');
select policies_are(
  'public',
  'profiles',
  array[
    'Active profiles are visible to authenticated users',
    'Users can insert their own profile',
    'Users can update their own active profile'
  ]
);
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select col_has_check('public', 'profiles', 'display_name', 'display_name has length constraints');
select col_has_check('public', 'profiles', 'reminder_lead_days', 'reminder lead days are bounded');
select * from finish();

rollback;
