begin;

create table public.character_animation_settings (
  character_id uuid primary key references public.characters(id) on delete cascade,
  active_preset_key text not null default 'soft-petals',
  page_entrance text not null default 'soft-fade' check (page_entrance in ('none','soft-fade','rise','slide','paper-open','pixel-load','petal-reveal')),
  widget_reveal text not null default 'stagger-fade' check (widget_reveal in ('none','stagger-fade','rise','pop','slide','card-deal','pixel-load')),
  scene_item_motion text not null default 'gentle-float' check (scene_item_motion in ('none','gentle-float','soft-bob','drift','sparkle-pulse','paper-wiggle','pixel-blink')),
  ambient_effect text not null default 'petals' check (ambient_effect in ('none','petals','sparkles','stars','dust','bubbles','pixel-stars')),
  route_transition text not null default 'crossfade' check (route_transition in ('none','crossfade','soft-slide','paper-turn','iris','pixel-wipe')),
  hover_motion text not null default 'soft-lift' check (hover_motion in ('none','soft-lift','tilt','pop','glow-pulse','wiggle')),
  click_motion text not null default 'press' check (click_motion in ('none','press','bounce','spark','ripple','stamp')),
  intensity smallint not null default 2 check (intensity between 1 and 3),
  duration_ms integer not null default 480 check (duration_ms between 120 and 1600),
  stagger_ms integer not null default 55 check (stagger_ms between 0 and 250),
  ambient_density smallint not null default 2 check (ambient_density between 1 and 3),
  profile_enabled boolean not null default true,
  scenes_enabled boolean not null default true,
  respect_reduced_motion boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.character_animation_presets (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  preset_name text not null check (length(preset_name) between 1 and 40),
  preset_key text not null,
  settings jsonb not null default '{}'::jsonb,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,preset_key)
);

create index character_animation_presets_character_idx on public.character_animation_presets(character_id,sort_order,created_at);
create trigger character_animation_settings_touch_updated_at before update on public.character_animation_settings for each row execute function private.touch_updated_at();
create trigger character_animation_presets_touch_updated_at before update on public.character_animation_presets for each row execute function private.touch_updated_at();

alter table public.character_animation_settings enable row level security;
alter table public.character_animation_presets enable row level security;

create policy character_animation_settings_read on public.character_animation_settings
for select to authenticated using (
  exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid()))
  or private.can_view_character_interactive_profile(character_id)
);
create policy character_animation_settings_plus_insert on public.character_animation_settings
for insert to authenticated with check (private.can_edit_character_plus_profile(character_id));
create policy character_animation_settings_plus_update on public.character_animation_settings
for update to authenticated using (private.can_edit_character_plus_profile(character_id)) with check (private.can_edit_character_plus_profile(character_id));

create policy character_animation_presets_self_read on public.character_animation_presets
for select to authenticated using (exists(select 1 from public.characters c where c.id=character_id and c.account_id=(select auth.uid())));
create policy character_animation_presets_plus_insert on public.character_animation_presets
for insert to authenticated with check (private.can_edit_character_plus_profile(character_id));
create policy character_animation_presets_plus_update on public.character_animation_presets
for update to authenticated using (private.can_edit_character_plus_profile(character_id)) with check (private.can_edit_character_plus_profile(character_id));
create policy character_animation_presets_plus_delete on public.character_animation_presets
for delete to authenticated using (private.can_edit_character_plus_profile(character_id));

revoke all on public.character_animation_settings,public.character_animation_presets from anon;
grant select,insert,update on public.character_animation_settings to authenticated;
grant select,insert,update,delete on public.character_animation_presets to authenticated;

create or replace function public.ensure_my_animation_settings(p_character_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.can_edit_character_plus_profile(p_character_id) then raise exception 'Active Hanami+ and character ownership required' using errcode='42501'; end if;
  insert into public.character_animation_settings(character_id) values(p_character_id) on conflict(character_id) do nothing;
  return true;
end;
$$;
revoke all on function public.ensure_my_animation_settings(uuid) from public,anon;
grant execute on function public.ensure_my_animation_settings(uuid) to authenticated;

commit;
