create or replace function private.current_account_status_internal()
returns table(account_status text,suspension_reason text)
language sql stable security definer
set search_path=public,private,auth
as $$
  select coalesce(ap.account_status,'active'),ap.suspension_reason
  from public.account_profiles ap
  where ap.user_id=auth.uid()
  limit 1;
$$;

create or replace function public.current_account_status()
returns table(account_status text,suspension_reason text)
language sql stable security invoker
set search_path=public,private
as $$ select * from private.current_account_status_internal(); $$;

grant execute on function private.current_account_status_internal() to authenticated;
grant execute on function public.current_account_status() to authenticated;
revoke all on function public.current_account_status() from anon;
