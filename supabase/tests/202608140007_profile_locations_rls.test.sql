begin;

select plan(9);
select has_table('public', 'profile_locations', 'profile locations table exists');
select has_table('public', 'item_location_assignments', 'item location assignments table exists');
select has_function('public', 'save_own_profile', 'trusted profile save function exists');
select has_function('public', 'replace_profile_locations', 'trusted location replacement function exists');
select has_function('public', 'save_item_location_assignment', 'trusted item location assignment function exists');
select policies_are('public', 'profile_locations', array['Users manage own profile locations']);
select policies_are('public', 'item_location_assignments', array['Owners manage own item location assignments']);
select has_index('public', 'profile_locations', 'profile_locations_one_default_idx', 'one default profile location per user');
select has_index('public', 'item_location_assignments', 'item_location_assignments_pkey', 'one private location assignment per item');
select * from finish();

rollback;
