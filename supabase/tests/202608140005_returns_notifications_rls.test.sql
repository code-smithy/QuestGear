begin;

select plan(12);
select has_table('public', 'loan_extension_requests', 'loan_extension_requests table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'loan_evidence_files', 'loan_evidence_files table exists');
select has_function('public', 'confirm_handover', 'confirm handover function exists');
select has_function('public', 'request_extension', 'request extension function exists');
select has_function('public', 'respond_to_extension', 'respond to extension function exists');
select has_function('public', 'submit_return', 'submit return function exists');
select has_function('public', 'accept_return', 'accept return function exists');
select has_function('public', 'dispute_return', 'dispute return function exists');
select has_function('public', 'process_due_notifications', 'process due notifications function exists');
select policies_are('public', 'notifications', array['Users can read own notifications', 'Users can mark own notifications read']);
select has_index('public', 'notifications', 'notifications_user_id_deduplication_key_key', 'notification deduplication is per recipient');
select * from finish();

rollback;
