-- Hanami+ account-scoped custom font uploads.
-- Members upload font files they have permission to use; Hanami stores them in
-- a private bucket and never republishes them as a global font library.

create table if not exists public.account_custom_fonts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  storage_path text not null unique,
  original_filename text not null,
  font_format text not null check (font_format in ('woff2','woff','ttf','otf')),
  file_size integer not null check (file_size > 0 and file_size <= 4194304),
  source_label text not null default 'Member upload',
  source_url text,
  rights_confirmed_at timestamptz not null,
  font_family text generated always as ('HanamiCustom_' || replace(id::text,'-','_')) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists account_custom_fonts_account_idx
  on public.account_custom_fonts(account_id, created_at desc);

alter table public.account_custom_fonts enable row level security;

drop policy if exists "custom fonts read own" on public.account_custom_fonts;
create policy "custom fonts read own"
  on public.account_custom_fonts for select
  to authenticated
  using (account_id=(select auth.uid()));

drop policy if exists "custom fonts create with plus" on public.account_custom_fonts;
create policy "custom fonts create with plus"
  on public.account_custom_fonts for insert
  to authenticated
  with check (
    account_id=(select auth.uid())
    and private.has_active_plus_for_account((select auth.uid()))
  );

drop policy if exists "custom fonts update with plus" on public.account_custom_fonts;
create policy "custom fonts update with plus"
  on public.account_custom_fonts for update
  to authenticated
  using (account_id=(select auth.uid()))
  with check (
    account_id=(select auth.uid())
    and private.has_active_plus_for_account((select auth.uid()))
  );

drop policy if exists "custom fonts delete own" on public.account_custom_fonts;
create policy "custom fonts delete own"
  on public.account_custom_fonts for delete
  to authenticated
  using (account_id=(select auth.uid()));

grant select,insert,update,delete on public.account_custom_fonts to authenticated;

alter table public.account_font_preferences
  add column if not exists ui_body_custom_font_id uuid references public.account_custom_fonts(id) on delete set null,
  add column if not exists ui_heading_custom_font_id uuid references public.account_custom_fonts(id) on delete set null,
  add column if not exists ui_display_custom_font_id uuid references public.account_custom_fonts(id) on delete set null;

alter table public.character_font_preferences
  add column if not exists display_name_custom_font_id uuid references public.account_custom_fonts(id) on delete set null,
  add column if not exists tag_custom_font_id uuid references public.account_custom_fonts(id) on delete set null,
  add column if not exists profile_heading_custom_font_id uuid references public.account_custom_fonts(id) on delete set null,
  add column if not exists profile_body_custom_font_id uuid references public.account_custom_fonts(id) on delete set null,
  add column if not exists blog_custom_font_id uuid references public.account_custom_fonts(id) on delete set null;

create or replace function private.validate_custom_font_reference_ownership()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid;
  v_ids uuid[];
begin
  if tg_table_name='account_font_preferences' then
    v_ids:=array[
      new.ui_body_custom_font_id,
      new.ui_heading_custom_font_id,
      new.ui_display_custom_font_id
    ];
  else
    v_ids:=array[
      new.display_name_custom_font_id,
      new.tag_custom_font_id,
      new.profile_heading_custom_font_id,
      new.profile_body_custom_font_id,
      new.blog_custom_font_id
    ];
  end if;

  foreach v_id in array v_ids loop
    if v_id is not null and not exists (
      select 1 from public.account_custom_fonts f
      where f.id=v_id and f.account_id=new.account_id
    ) then
      raise exception 'Custom font does not belong to this Hanami account' using errcode='42501';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists account_font_preferences_validate_custom_fonts on public.account_font_preferences;
create trigger account_font_preferences_validate_custom_fonts
before insert or update on public.account_font_preferences
for each row execute function private.validate_custom_font_reference_ownership();

drop trigger if exists character_font_preferences_validate_custom_fonts on public.character_font_preferences;
create trigger character_font_preferences_validate_custom_fonts
before insert or update on public.character_font_preferences
for each row execute function private.validate_custom_font_reference_ownership();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'custom-fonts',
  'custom-fonts',
  false,
  4194304,
  array[
    'font/woff2','font/woff','font/ttf','font/otf',
    'application/font-woff','application/x-font-woff',
    'application/x-font-ttf','application/x-font-opentype',
    'application/vnd.ms-opentype'
  ]::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "custom_fonts_select_own" on storage.objects;
create policy "custom_fonts_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id='custom-fonts'
    and (storage.foldername(name))[1]=((select auth.uid()))::text
  );

drop policy if exists "custom_fonts_insert_own_plus" on storage.objects;
create policy "custom_fonts_insert_own_plus"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id='custom-fonts'
    and (storage.foldername(name))[1]=((select auth.uid()))::text
    and private.has_active_plus_for_account((select auth.uid()))
  );

drop policy if exists "custom_fonts_delete_own" on storage.objects;
create policy "custom_fonts_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id='custom-fonts'
    and (storage.foldername(name))[1]=((select auth.uid()))::text
  );
