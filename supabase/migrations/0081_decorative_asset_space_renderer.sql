-- Render approved customization assets as self-contained SVG data URLs in Personal Spaces.
create or replace function public.add_my_customization_asset_to_space(p_asset_id uuid,p_space_kind text)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account uuid:=auth.uid();
  v_character uuid;
  v_asset public.customization_assets%rowtype;
  v_item_id uuid;
  v_count integer;
  v_bg text;
  v_accent text;
  v_accent2 text;
  v_border text;
  v_glyph text;
  v_svg text;
  v_data_url text;
begin
  if v_account is null then raise exception 'Authentication required'; end if;
  if p_space_kind not in ('locker','desk','phone','desktop') then raise exception 'Unknown personal space'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Choose an active character first'; end if;
  if not private.can_edit_character_plus_customization(v_character) then raise exception 'Active Hanami+ is required to edit Personal Spaces'; end if;
  select * into v_asset from public.customization_assets where id=p_asset_id and state='published';
  if not found or v_asset.asset_type not in ('sticker','emoji','icon','decorative_accent') then raise exception 'This asset cannot be placed in Personal Spaces'; end if;
  if not private.account_can_use_customization_asset(v_account,p_asset_id) then raise exception 'This decoration is not available to your account'; end if;

  v_bg:=case when coalesce(v_asset.asset_payload->>'background','')~'^#[0-9A-Fa-f]{6}$' then v_asset.asset_payload->>'background' else '#fff5f8' end;
  v_accent:=case when coalesce(v_asset.asset_payload->>'accent','')~'^#[0-9A-Fa-f]{6}$' then v_asset.asset_payload->>'accent' else '#dc89a8' end;
  v_accent2:=case when coalesce(v_asset.asset_payload->>'accent2','')~'^#[0-9A-Fa-f]{6}$' then v_asset.asset_payload->>'accent2' else '#cbb8ef' end;
  v_border:=case when coalesce(v_asset.asset_payload->>'border','')~'^#[0-9A-Fa-f]{6}$' then v_asset.asset_payload->>'border' else '#c99aac' end;
  v_glyph:=replace(replace(replace(coalesce(v_asset.asset_payload->>'glyph','✦'),'&','&amp;'),'<','&lt;'),'>','&gt;');
  v_svg:='<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><defs><radialGradient id="g"><stop stop-color="'||v_accent2||'" stop-opacity=".72"/><stop offset="1" stop-color="'||v_bg||'" stop-opacity="0"/></radialGradient><linearGradient id="b" x2="1" y2="1"><stop stop-color="'||v_bg||'"/><stop offset="1" stop-color="'||v_accent2||'" stop-opacity=".38"/></linearGradient></defs><rect x="10" y="10" width="280" height="280" rx="58" fill="url(#b)" stroke="'||v_border||'" stroke-width="4"/><circle cx="86" cy="78" r="82" fill="url(#g)"/><circle cx="224" cy="222" r="74" fill="url(#g)" opacity=".7"/><text x="150" y="170" text-anchor="middle" font-size="62" font-family="Arial,sans-serif" fill="'||v_accent||'">'||v_glyph||'</text><text x="56" y="66" font-size="24" fill="'||v_accent2||'">✦</text><text x="230" y="76" font-size="18" fill="'||v_accent||'">♡</text><text x="226" y="242" font-size="22" fill="'||v_accent2||'">✧</text></svg>';
  v_data_url:='data:image/svg+xml;base64,'||encode(convert_to(v_svg,'UTF8'),'base64');

  select count(*) into v_count from public.character_space_items where character_id=v_character and space_kind=p_space_kind;
  insert into public.character_space_items(character_id,space_kind,item_kind,label,body,asset_url,position_x,position_y,width_pct,height_pct,rotation_deg,z_index,metadata)
  values(v_character,p_space_kind,case when v_asset.asset_type='decorative_accent' then 'charm' else 'sticker' end,v_asset.name,coalesce(v_asset.asset_payload->>'glyph','✦'),v_data_url,8+((v_count%6)*9),10+((v_count%6)*8),18,18,0,v_count+1,jsonb_build_object('customizationAssetId',v_asset.id,'customizationAssetSlug',v_asset.slug,'customizationAssetType',v_asset.asset_type,'collectionName',v_asset.collection_name,'animated',v_asset.animated,'assetStyle',v_asset.asset_payload)) returning id into v_item_id;
  return v_item_id;
end $$;
revoke all on function public.add_my_customization_asset_to_space(uuid,text) from public;
grant execute on function public.add_my_customization_asset_to_space(uuid,text) to authenticated;
