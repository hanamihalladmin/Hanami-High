begin;

alter table public.profile_widget_attribution
  add column install_group_id uuid;

update public.profile_widget_attribution
set install_group_id=gen_random_uuid()
where install_group_id is null;

alter table public.profile_widget_attribution
  alter column install_group_id set not null;

create index profile_widget_attribution_group_idx
  on public.profile_widget_attribution(install_group_id,installed_at);

drop function if exists public.install_creator_widget_kit(uuid);

create or replace function public.install_creator_widget_kit(p_kit_id uuid)
returns table(inserted_count integer,version_id uuid,install_group_id uuid)
language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_kit public.creator_widget_kits%rowtype;
  v_version public.creator_widget_kit_versions%rowtype;
  v_base_y integer;
  v_entry jsonb;
  v_new_widget uuid;
  v_inserted integer:=0;
  v_creator_name text;
  v_group_id uuid:=gen_random_uuid();
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required' using errcode='42501'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  if v_character is null then raise exception 'Choose an active character first' using errcode='22023'; end if;

  select * into v_kit from public.creator_widget_kits k where k.id=p_kit_id and k.state='published' and k.visibility in ('public','unlisted');
  if v_kit.id is null then raise exception 'Published widget kit not found' using errcode='P0002'; end if;
  select * into v_version from public.creator_widget_kit_versions v where v.kit_id=v_kit.id and v.version_no=v_kit.current_version;
  if v_version.id is null then raise exception 'Widget kit version not found' using errcode='P0002'; end if;

  select coalesce(max(w.y+w.height),0)+2 into v_base_y from public.profile_widgets w where w.character_id=v_character;
  select coalesce(cp.display_name,'Hanami Creator') into v_creator_name from public.creator_profiles cp where cp.account_id=v_kit.author_account_id;

  for v_entry in select value from jsonb_array_elements(v_version.widget_payload)
  loop
    insert into public.profile_widgets(character_id,widget_type,title,config,x,y,width,height,z_index,is_visible)
    values(
      v_character,
      coalesce(nullif(v_entry->>'widget_type',''),'note'),
      nullif(v_entry->>'title',''),
      coalesce(v_entry->'config','{}'::jsonb),
      greatest(1,least(12,coalesce((v_entry->>'x')::smallint,1))),
      greatest(1,least(200,v_base_y+coalesce((v_entry->>'relative_y')::integer,0))),
      greatest(1,least(12,coalesce((v_entry->>'width')::smallint,4))),
      greatest(1,least(20,coalesce((v_entry->>'height')::smallint,3))),
      coalesce((v_entry->>'z_index')::smallint,0),
      coalesce((v_entry->>'is_visible')::boolean,true)
    ) returning id into v_new_widget;

    insert into public.profile_widget_attribution(widget_id,kit_id,version_id,source_author_account_id,attribution_text,install_group_id)
    values(v_new_widget,v_kit.id,v_version.id,v_kit.author_account_id,'From "'||v_kit.title||'" by '||coalesce(v_creator_name,'Hanami Creator'),v_group_id);
    v_inserted:=v_inserted+1;
  end loop;

  update public.creator_widget_kits set install_count=install_count+1 where id=v_kit.id;
  return query select v_inserted,v_version.id,v_group_id;
end;
$$;

create or replace function public.my_installed_widget_kit_groups()
returns table(
  install_group_id uuid,
  kit_id uuid,
  version_id uuid,
  kit_title text,
  kit_slug text,
  creator_name text,
  attribution_text text,
  widget_count integer,
  installed_at timestamptz
)
language sql stable security definer set search_path='' as $$
  select
    a.install_group_id,
    a.kit_id,
    a.version_id,
    k.title,
    k.slug,
    coalesce(cp.display_name,'Hanami Creator'),
    min(a.attribution_text),
    count(*)::integer,
    min(a.installed_at)
  from public.profile_widget_attribution a
  join public.profile_widgets w on w.id=a.widget_id
  join public.characters c on c.id=w.character_id
  join public.accounts acc on acc.id=(select auth.uid())
  join public.creator_widget_kits k on k.id=a.kit_id
  left join public.creator_profiles cp on cp.account_id=a.source_author_account_id
  where c.account_id=(select auth.uid())
    and acc.active_character_id=c.id
  group by a.install_group_id,a.kit_id,a.version_id,k.title,k.slug,cp.display_name
  order by min(a.installed_at) desc;
$$;

create or replace function public.remove_installed_widget_kit_group(p_install_group_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
  v_count integer;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select a.active_character_id into v_character from public.accounts a where a.id=v_account;
  if v_character is null then raise exception 'Choose an active character first' using errcode='22023'; end if;

  select count(*)::integer into v_count
  from public.profile_widget_attribution attr
  join public.profile_widgets w on w.id=attr.widget_id
  where attr.install_group_id=p_install_group_id and w.character_id=v_character;

  if v_count=0 then raise exception 'Installed component group not found' using errcode='P0002'; end if;

  delete from public.profile_widgets w
  using public.profile_widget_attribution attr
  where attr.widget_id=w.id
    and attr.install_group_id=p_install_group_id
    and w.character_id=v_character;

  return v_count;
end;
$$;

revoke all on function public.install_creator_widget_kit(uuid),public.my_installed_widget_kit_groups(),public.remove_installed_widget_kit_group(uuid) from public,anon;
grant execute on function public.install_creator_widget_kit(uuid),public.my_installed_widget_kit_groups(),public.remove_installed_widget_kit_group(uuid) to authenticated;

commit;
