begin;

select plan(10);
select has_table('public', 'loans', 'loans table exists');
select has_table('public', 'loan_items', 'loan_items table exists');
select has_table('public', 'loan_date_proposals', 'loan_date_proposals table exists');
select has_table('public', 'loan_condition_reports', 'loan_condition_reports table exists');
select has_table('public', 'loan_events', 'loan_events table exists');
select has_function('public', 'create_loan_request', 'create loan request function exists');
select has_function('public', 'approve_loan', 'approve loan function exists');
select policies_are('public', 'loans', array['Loan parties can read loans']);
select policies_are('public', 'loan_items', array['Loan parties can read loan items']);
select policies_are('public', 'loan_events', array['Loan parties can read events']);
select * from finish();

rollback;
