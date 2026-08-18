create type public.profile_widget_type as enum ('text','image','card','link','divider','sticker');

create table public.character_profile_canvases (
  character_id uuid primary key references public.characters(id) on delete cascade,
  canvas_width integer not null default 960 check (canvas_width between 640 and 1600),
  canvas_height integer not null default 1200 check (canvas_height between 720 and 3000),
  background text not null default '#fffafc',
  background_image_url text,
  grid_enabled boolean not null default true,
  snap_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.character_profile_widgets (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  widget_type public.profile_widget_type not null,
  x integer not null default 40 check (x between -400 and 2000),
  y integer not null default 40 check (y between -400 and 4000),
  width integer not null default 280 check (width between 40 and 1400),
  height integer not null default 120 check (height between 24 and 1800),
  z_index integer not null default 1 check (z_index between 0 and 999),
  rotation numeric(6,2) not null default 0 check (rotation between -180 and 180),
  opacity numeric(4,3) not null default 1 check (opacity between 0 and 1),
  content jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index character_profile_widgets_character_layer_idx on public.character_profile_widgets(character_id,z_index,id);

alter table public.character_profile_canvases enable row level security;
alter table public.character_profile_widgets enable row level security;

grant select,insert,update,delete on public.character_profile_canvases to authenticated;
grant select,insert,update,delete on public.character_profile_widgets to authenticated;

create policy "members manage own profile canvas"
on public.character_profile_canvases for all to authenticated
using (exists(select 1 from public.characters c where c.id=character_profile_canvases.character_id and c.owner_user_id=(select auth.uid())))
with check (exists(select 1 from public.characters c where c.id=character_profile_canvases.character_id and c.owner_user_id=(select auth.uid())));

create policy "members manage own profile widgets"
on public.character_profile_widgets for all to authenticated
using (exists(select 1 from public.characters c where c.id=character_profile_widgets.character_id and c.owner_user_id=(select auth.uid())))
with check (exists(select 1 from public.characters c where c.id=character_profile_widgets.character_id and c.owner_user_id=(select auth.uid())));
