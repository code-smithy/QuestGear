begin;

select plan(10);
select has_table('public', 'reviews', 'reviews table exists');
select has_table('public', 'reliability_events', 'reliability_events table exists');
select has_table('public', 'reliability_scores', 'reliability_scores table exists');
select has_function('public', 'submit_review', 'submit review function exists');
select has_function('public', 'recalculate_reliability', 'recalculate reliability function exists');
select has_function('public', 'reveal_reviews_for_due_loans', 'review reveal function exists');
select policies_are('public', 'reviews', array['Users can read own or revealed reviews']);
select policies_are('public', 'reliability_scores', array['Authenticated users can read reliability scores']);
select policies_are('public', 'reliability_events', array[]::text[]);
select has_index('public', 'reviews', 'reviews_loan_id_reviewer_id_key', 'one review per reviewer and loan');
select * from finish();

rollback;
