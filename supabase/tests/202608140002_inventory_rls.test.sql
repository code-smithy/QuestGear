begin;

select plan(11);
select has_table('public', 'items', 'items table exists');
select has_table('public', 'item_photos', 'item_photos table exists');
select has_table('public', 'item_contents', 'item_contents table exists');
select has_table('public', 'item_damage', 'item_damage table exists');
select has_table('public', 'item_unavailable_periods', 'item_unavailable_periods table exists');
select col_has_check('public', 'items', 'title', 'item title length is constrained');
select col_has_check('public', 'items', 'state', 'item state is constrained');
select policies_are(
  'public',
  'items',
  array[
    'Owners can read all own items and authenticated users can read published items',
    'Owners can insert own items',
    'Owners can update own items',
    'Owners can delete unused draft items'
  ]
);
select policies_are(
  'public',
  'item_contents',
  array[
    'Visible item contents are readable',
    'Owners manage item contents'
  ]
);
select policies_are(
  'public',
  'item_damage',
  array[
    'Visible item damage is readable',
    'Owners manage item damage'
  ]
);
select policies_are(
  'public',
  'item_unavailable_periods',
  array['Owners manage unavailable periods']
);
select * from finish();

rollback;
