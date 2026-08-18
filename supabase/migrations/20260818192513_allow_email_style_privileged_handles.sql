alter table public.privileged_portal_credentials
  drop constraint if exists privileged_portal_credentials_handle_check;

alter table public.privileged_portal_credentials
  add constraint privileged_portal_credentials_handle_check
  check (handle ~ '^[a-z0-9._%+@-]{3,64}$');
