revoke all on table public.school_office_requests from anon;
revoke truncate, references, trigger on table public.school_office_requests from authenticated;
revoke delete on table public.school_office_requests from authenticated;
grant select, insert, update on table public.school_office_requests to authenticated;
