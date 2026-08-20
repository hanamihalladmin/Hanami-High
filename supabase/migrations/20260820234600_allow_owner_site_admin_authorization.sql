-- The Owner portal is the highest-privilege workspace. Treat a verified Owner session as site-admin authorization
-- when permission checks are performed for the current authenticated user.
create or replace function private.account_has_permission(target_user_id uuid, required_permission public.hanami_account_permission)
returns boolean
language sql
stable security definer
set search_path to 'public','private','auth'
as $function$
  select
    (
      target_user_id = auth.uid()
      and private.is_owner_discord_user()
      and private.has_privileged_portal_session_internal('owner')
    )
    or exists (
      select 1
      from public.account_permissions ap
      where ap.user_id = target_user_id
        and (ap.permission = required_permission or ap.permission = 'site_admin')
    );
$function$;
