-- Hanami+ site theme builder: richer account-wide colors + saved palettes.

alter table public.account_preferences
  add column if not exists custom_theme_surface text,
  add column if not exists custom_theme_border text,
  add column if not exists custom_theme_text text,
  add column if not exists custom_theme_text_secondary text,
  add column if not exists custom_theme_link text;

alter table public.account_preferences
  drop constraint if exists account_preferences_custom_theme_surface_check,
  add constraint account_preferences_custom_theme_surface_check check (custom_theme_surface is null or custom_theme_surface ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_border_check,
  add constraint account_preferences_custom_theme_border_check check (custom_theme_border is null or custom_theme_border ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_text_check,
  add constraint account_preferences_custom_theme_text_check check (custom_theme_text is null or custom_theme_text ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_text_secondary_check,
  add constraint account_preferences_custom_theme_text_secondary_check check (custom_theme_text_secondary is null or custom_theme_text_secondary ~ '^#[0-9A-Fa-f]{6}$'),
  drop constraint if exists account_preferences_custom_theme_link_check,
  add constraint account_preferences_custom_theme_link_check check (custom_theme_link is null or custom_theme_link ~ '^#[0-9A-Fa-f]{6}$');

update public.account_preferences
set custom_theme_surface = coalesce(custom_theme_surface, custom_theme_paper),
    custom_theme_border = coalesce(custom_theme_border, custom_theme_soft),
    custom_theme_text = coalesce(custom_theme_text, custom_theme_ink),
    custom_theme_text_secondary = coalesce(custom_theme_text_secondary, custom_theme_soft),
    custom_theme_link = coalesce(custom_theme_link, custom_theme_accent)
where custom_theme_enabled = true;

create table if not exists public.account_site_theme_presets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  ink text not null check (ink ~ '^#[0-9A-Fa-f]{6}$'),
  soft text not null check (soft ~ '^#[0-9A-Fa-f]{6}$'),
  paper text not null check (paper ~ '^#[0-9A-Fa-f]{6}$'),
  surface text not null check (surface ~ '^#[0-9A-Fa-f]{6}$'),
  border text not null check (border ~ '^#[0-9A-Fa-f]{6}$'),
  accent text not null check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  text_primary text not null check (text_primary ~ '^#[0-9A-Fa-f]{6}$'),
  text_secondary text not null check (text_secondary ~ '^#[0-9A-Fa-f]{6}$'),
  link text not null check (link ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_site_theme_presets_account_idx on public.account_site_theme_presets(account_id, updated_at desc);

alter table public.account_site_theme_presets enable row level security;
drop policy if exists account_site_theme_presets_select_self on public.account_site_theme_presets;
create policy account_site_theme_presets_select_self on public.account_site_theme_presets for select to authenticated using (account_id = auth.uid());
drop policy if exists account_site_theme_presets_insert_self on public.account_site_theme_presets;
create policy account_site_theme_presets_insert_self on public.account_site_theme_presets for insert to authenticated with check (account_id = auth.uid() and private.has_active_plus_for_account(auth.uid()));
drop policy if exists account_site_theme_presets_update_self on public.account_site_theme_presets;
create policy account_site_theme_presets_update_self on public.account_site_theme_presets for update to authenticated using (account_id = auth.uid()) with check (account_id = auth.uid() and private.has_active_plus_for_account(auth.uid()));
drop policy if exists account_site_theme_presets_delete_self on public.account_site_theme_presets;
create policy account_site_theme_presets_delete_self on public.account_site_theme_presets for delete to authenticated using (account_id = auth.uid());

create or replace function public.set_my_custom_site_theme_v2(
  p_enabled boolean,
  p_ink text default null,
  p_soft text default null,
  p_paper text default null,
  p_surface text default null,
  p_border text default null,
  p_accent text default null,
  p_text text default null,
  p_text_secondary text default null,
  p_link text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := auth.uid();
  v_hex constant text := '^#[0-9A-Fa-f]{6}$';
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_enabled and not private.has_active_plus_for_account(v_account) then
    raise exception 'Active Hanami+ is required for custom website colors' using errcode='42501';
  end if;
  if p_enabled and (
    p_ink !~ v_hex or p_soft !~ v_hex or p_paper !~ v_hex or p_surface !~ v_hex or p_border !~ v_hex or
    p_accent !~ v_hex or p_text !~ v_hex or p_text_secondary !~ v_hex or p_link !~ v_hex
  ) then
    raise exception 'Custom colors must use six-digit hex values' using errcode='22023';
  end if;

  update public.account_preferences
  set custom_theme_enabled = p_enabled,
      custom_theme_ink = case when p_enabled then lower(p_ink) else custom_theme_ink end,
      custom_theme_soft = case when p_enabled then lower(p_soft) else custom_theme_soft end,
      custom_theme_paper = case when p_enabled then lower(p_paper) else custom_theme_paper end,
      custom_theme_surface = case when p_enabled then lower(p_surface) else custom_theme_surface end,
      custom_theme_border = case when p_enabled then lower(p_border) else custom_theme_border end,
      custom_theme_accent = case when p_enabled then lower(p_accent) else custom_theme_accent end,
      custom_theme_text = case when p_enabled then lower(p_text) else custom_theme_text end,
      custom_theme_text_secondary = case when p_enabled then lower(p_text_secondary) else custom_theme_text_secondary end,
      custom_theme_link = case when p_enabled then lower(p_link) else custom_theme_link end,
      updated_at = now()
  where account_id = v_account;
  return found;
end;
$$;

revoke all on function public.set_my_custom_site_theme_v2(boolean,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.set_my_custom_site_theme_v2(boolean,text,text,text,text,text,text,text,text,text) to authenticated;
