create table if not exists public.character_profile_design_templates (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  canvas jsonb not null default '{}'::jsonb,
  widgets jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists character_profile_design_templates_character_idx
  on public.character_profile_design_templates(character_id, updated_at desc);

alter table public.character_profile_design_templates enable row level security;

drop policy if exists "members manage own profile design templates" on public.character_profile_design_templates;
create policy "members manage own profile design templates"
on public.character_profile_design_templates
for all
to authenticated
using (exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=(select auth.uid())))
with check (exists(select 1 from public.characters c where c.id=character_id and c.owner_user_id=(select auth.uid())));

grant select, insert, update, delete on public.character_profile_design_templates to authenticated;

create or replace function public.save_profile_design_template(target_character_id uuid, requested_name text)
returns uuid
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  new_id uuid;
  canvas_snapshot jsonb;
  widget_snapshot jsonb;
begin
  if not exists(select 1 from public.characters c where c.id=target_character_id and c.owner_user_id=auth.uid()) then
    raise exception 'Character access required';
  end if;
  if char_length(trim(coalesce(requested_name,''))) not between 1 and 60 then
    raise exception 'Template name must be 1 to 60 characters';
  end if;
  if (select count(*) from public.character_profile_design_templates where character_id=target_character_id) >= 20 then
    raise exception 'A character can save up to 20 profile designs';
  end if;

  select coalesce(to_jsonb(c)-'character_id'-'updated_at','{}'::jsonb)
    into canvas_snapshot
    from public.character_profile_canvases c
   where c.character_id=target_character_id;
  canvas_snapshot:=coalesce(canvas_snapshot,jsonb_build_object('canvas_width',960,'canvas_height',1200,'background','#fffafc','background_image_url',null,'background_storage_path',null,'grid_enabled',true,'snap_enabled',true));

  select coalesce(jsonb_agg(to_jsonb(w)-'id'-'character_id'-'created_at'-'updated_at' order by w.z_index,w.created_at),'[]'::jsonb)
    into widget_snapshot
    from public.character_profile_widgets w
   where w.character_id=target_character_id;

  insert into public.character_profile_design_templates(character_id,name,canvas,widgets)
  values(target_character_id,trim(requested_name),canvas_snapshot,coalesce(widget_snapshot,'[]'::jsonb))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.apply_profile_design_template(target_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public','auth'
as $$
declare
  t public.character_profile_design_templates%rowtype;
  item jsonb;
begin
  select * into t from public.character_profile_design_templates where id=target_template_id;
  if t.id is null or not exists(select 1 from public.characters c where c.id=t.character_id and c.owner_user_id=auth.uid()) then
    raise exception 'Template access required';
  end if;

  delete from public.character_profile_widgets where character_id=t.character_id;

  insert into public.character_profile_canvases(character_id,canvas_width,canvas_height,background,background_image_url,background_storage_path,grid_enabled,snap_enabled,updated_at)
  values(
    t.character_id,
    coalesce((t.canvas->>'canvas_width')::int,960),
    coalesce((t.canvas->>'canvas_height')::int,1200),
    coalesce(t.canvas->>'background','#fffafc'),
    nullif(t.canvas->>'background_image_url',''),
    nullif(t.canvas->>'background_storage_path',''),
    coalesce((t.canvas->>'grid_enabled')::boolean,true),
    coalesce((t.canvas->>'snap_enabled')::boolean,true),
    now()
  )
  on conflict(character_id) do update set
    canvas_width=excluded.canvas_width,
    canvas_height=excluded.canvas_height,
    background=excluded.background,
    background_image_url=excluded.background_image_url,
    background_storage_path=excluded.background_storage_path,
    grid_enabled=excluded.grid_enabled,
    snap_enabled=excluded.snap_enabled,
    updated_at=now();

  for item in select value from jsonb_array_elements(coalesce(t.widgets,'[]'::jsonb)) loop
    insert into public.character_profile_widgets(character_id,widget_type,x,y,width,height,z_index,rotation,opacity,content,style,locked,created_at,updated_at)
    values(
      t.character_id,
      (item->>'widget_type')::public.profile_widget_type,
      coalesce((item->>'x')::int,40),coalesce((item->>'y')::int,40),
      coalesce((item->>'width')::int,280),coalesce((item->>'height')::int,120),
      coalesce((item->>'z_index')::int,1),coalesce((item->>'rotation')::numeric,0),coalesce((item->>'opacity')::numeric,1),
      coalesce(item->'content','{}'::jsonb),coalesce(item->'style','{}'::jsonb),coalesce((item->>'locked')::boolean,false),now(),now()
    );
  end loop;

  update public.character_profile_design_templates set is_active=false where character_id=t.character_id;
  update public.character_profile_design_templates set is_active=true,updated_at=now() where id=t.id;
  return t.character_id;
end;
$$;

grant execute on function public.save_profile_design_template(uuid,text) to authenticated;
grant execute on function public.apply_profile_design_template(uuid) to authenticated;
