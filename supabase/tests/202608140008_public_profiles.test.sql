begin;

select plan(2);
select has_function('public', 'get_public_profile', 'public profile read function exists');
select function_lang_is('public', 'get_public_profile', array['uuid'], 'sql', 'public profile read function is sql');
select * from finish();

rollback;
