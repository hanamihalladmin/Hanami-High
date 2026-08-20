begin;

create table if not exists public.portal_ui_preferences (
  user_id uuid primary key default auth.uid(),
  text_color text not null default '#2d3b45' check (text_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#17375f' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at timestamptz not null default now()
);

alter table public.portal_ui_preferences enable row level security;
grant select, insert, update on public.portal_ui_preferences to authenticated;
revoke delete on public.portal_ui_preferences from authenticated;

create policy "members read own portal ui preferences"
on public.portal_ui_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy "members create own portal ui preferences"
on public.portal_ui_preferences for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "members update own portal ui preferences"
on public.portal_ui_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create table if not exists public.character_portal_preferences (
  character_id uuid primary key references public.characters(id) on delete cascade,
  profile_image_path text,
  class_banner_colors jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (profile_image_path is null or profile_image_path like character_id::text || '/%')
);

alter table public.character_portal_preferences enable row level security;
grant select, insert, update on public.character_portal_preferences to authenticated;
revoke delete on public.character_portal_preferences from authenticated;

create policy "members read own character portal preferences"
on public.character_portal_preferences for select to authenticated
using (exists (
  select 1 from public.characters c
  where c.id = character_portal_preferences.character_id
    and c.owner_user_id = (select auth.uid())
));

create policy "members create own character portal preferences"
on public.character_portal_preferences for insert to authenticated
with check (exists (
  select 1 from public.characters c
  where c.id = character_portal_preferences.character_id
    and c.owner_user_id = (select auth.uid())
));

create policy "members update own character portal preferences"
on public.character_portal_preferences for update to authenticated
using (exists (
  select 1 from public.characters c
  where c.id = character_portal_preferences.character_id
    and c.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.characters c
  where c.id = character_portal_preferences.character_id
    and c.owner_user_id = (select auth.uid())
));

create or replace function public.lookup_visible_profile_identity(viewer_character_id uuid,target_handle text)
returns table(character_id uuid,profile_image_path text)
language sql
stable
security definer
set search_path=''
as $$
  select target.id,prefs.profile_image_path
  from public.characters target
  left join public.character_portal_preferences prefs on prefs.character_id=target.id
  where target.handle=lower(trim(leading '@' from target_handle))
    and private.can_view_character_profile_internal(viewer_character_id,target.id)
  limit 1;
$$;

revoke all on function public.lookup_visible_profile_identity(uuid,text) from public,anon;
grant execute on function public.lookup_visible_profile_identity(uuid,text) to authenticated;

commit;
