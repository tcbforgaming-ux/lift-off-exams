-- Trusted result writers can fire the trigger without direct access to private quota data.
alter function private.check_test_shared_weekly_allowance() security definer;
