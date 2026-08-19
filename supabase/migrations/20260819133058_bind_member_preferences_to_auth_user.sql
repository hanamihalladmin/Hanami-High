alter table public.accessibility_preferences alter column user_id set default auth.uid();
alter table public.notification_preferences alter column user_id set default auth.uid();

alter table public.accessibility_preferences alter column updated_at set default now();
alter table public.notification_preferences alter column updated_at set default now();
