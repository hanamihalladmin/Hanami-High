alter table public.character_profile_canvases add column if not exists background_storage_path text;

create or replace function private.visible_profile_design_internal(viewer_character_id uuid, target_handle text)
returns table(canvas jsonb, widgets jsonb)
language sql
stable security definer
set search_path to public, private
as $$
 select jsonb_build_object(
   'canvas_width',coalesce(pc.canvas_width,960),
   'canvas_height',coalesce(pc.canvas_height,1200),
   'background',coalesce(pc.background,'#fffafc'),
   'background_image_url',pc.background_image_url,
   'background_storage_path',pc.background_storage_path,
   'grid_enabled',coalesce(pc.grid_enabled,false),
   'snap_enabled',coalesce(pc.snap_enabled,false)
 ),
 coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'widget_type',w.widget_type,'x',w.x,'y',w.y,'width',w.width,'height',w.height,'z_index',w.z_index,'rotation',w.rotation,'opacity',w.opacity,'content',w.content,'style',w.style,'locked',w.locked) order by w.z_index,w.id) from public.character_profile_widgets w where w.character_id=target.id),'[]'::jsonb)
 from public.characters viewer
 join public.characters target on target.handle=lower(trim(leading '@' from target_handle))
 left join public.character_profile_canvases pc on pc.character_id=target.id
 where viewer.id=viewer_character_id and viewer.owner_user_id=auth.uid()
 and (target.owner_user_id=auth.uid() or target.visibility='public' or (target.visibility='friends_only' and private.characters_are_friends(viewer.id,target.id)))
 limit 1;
$$;
