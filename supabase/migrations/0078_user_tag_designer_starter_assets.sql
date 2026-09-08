begin;

insert into public.customization_assets(
  slug,name,description,asset_type,collection_name,rarity,access_kind,animated,asset_payload,state,sort_order
) values
  ('font-campus-serif','Campus Serif','A polished school-yearbook serif stack.','font','Hanami Type Cabinet','common','standard',false,'{"fontFamily":"Georgia, Times New Roman, serif","category":"serif"}'::jsonb,'published',10),
  ('font-notebook-hand','Notebook Hand','A friendly handwritten-style stack for character tags and headings.','font','Hanami Type Cabinet','hanami_plus','hanami_plus',false,'{"fontFamily":"Comic Sans MS, Bradley Hand, cursive","category":"handwritten"}'::jsonb,'published',20),
  ('font-terminal-mono','Terminal Mono','A compact early-web monospace stack.','font','Hanami Type Cabinet','common','standard',false,'{"fontFamily":"Courier New, Courier, monospace","category":"mono"}'::jsonb,'published',30),
  ('font-soft-rounded','Soft Rounded','A soft rounded system stack for cute display treatments.','font','Hanami Type Cabinet','hanami_plus','hanami_plus',false,'{"fontFamily":"Trebuchet MS, Arial Rounded MT Bold, sans-serif","category":"rounded"}'::jsonb,'published',40),
  ('tag-soft-pill','Soft Pill','A soft filled tag with a subtle border.','tag_style','Tag Shapes','common','standard',false,'{"radius":"999px","borderStyle":"solid","shadow":"soft"}'::jsonb,'published',10),
  ('tag-glass-note','Glass Note','A translucent status-like label inspired by glossy profile cards.','tag_style','Tag Shapes','hanami_plus','hanami_plus',false,'{"radius":"14px","borderStyle":"solid","backdrop":"glass"}'::jsonb,'published',20),
  ('tag-ribbon-label','Ribbon Label','A compact ribbon treatment for decorative character labels.','tag_style','Tag Shapes','hanami_plus','hanami_plus',false,'{"radius":"6px","borderStyle":"double","edge":"ribbon"}'::jsonb,'published',30),
  ('tag-lace-card','Lace Card','A delicate bordered tag for scrapbook-style profiles.','tag_style','Tag Shapes','rare','hanami_plus',false,'{"radius":"10px","borderStyle":"dashed","edge":"lace"}'::jsonb,'published',40),
  ('accent-bow','Bow','A bow accent for user tags and profile decorations.','decorative_accent','Sweet Symbols','common','standard',false,'{"glyph":"🎀"}'::jsonb,'published',10),
  ('accent-heart','Heart','A soft heart accent.','decorative_accent','Sweet Symbols','common','standard',false,'{"glyph":"♡"}'::jsonb,'published',20),
  ('accent-star','Star','A sparkling star accent.','decorative_accent','Sweet Symbols','common','standard',false,'{"glyph":"✦"}'::jsonb,'published',30),
  ('accent-flower','Flower','A Hanami flower accent.','decorative_accent','Sweet Symbols','hanami_plus','hanami_plus',false,'{"glyph":"✿"}'::jsonb,'published',40),
  ('accent-bear','Bear','A tiny bear accent for playful tags.','decorative_accent','Sweet Symbols','hanami_plus','hanami_plus',false,'{"glyph":"🧸"}'::jsonb,'published',50),
  ('effect-soft-glow','Soft Glow','A low-intensity glow for display text.','font_effect','Text Effects','hanami_plus','hanami_plus',false,'{"effect":"glow","intensity":"soft"}'::jsonb,'published',10),
  ('effect-sparkle-shift','Sparkle Shift','A reduced-motion-aware sparkle treatment.','font_effect','Text Effects','special','hanami_plus',true,'{"effect":"sparkle","motion":"subtle"}'::jsonb,'published',20)
on conflict(slug) do update set
  name=excluded.name,
  description=excluded.description,
  asset_type=excluded.asset_type,
  collection_name=excluded.collection_name,
  rarity=excluded.rarity,
  access_kind=excluded.access_kind,
  animated=excluded.animated,
  asset_payload=excluded.asset_payload,
  state=excluded.state,
  sort_order=excluded.sort_order,
  updated_at=now();

create or replace function public.set_my_character_custom_tag_active(p_tag_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  v_account uuid := (select auth.uid());
  v_character uuid;
begin
  if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not private.has_active_plus_for_account(v_account) then raise exception 'Active Hanami+ required to change the active custom tag' using errcode='42501'; end if;

  select t.character_id into v_character
  from public.character_custom_tags t
  join public.characters c on c.id=t.character_id
  where t.id=p_tag_id and t.account_id=v_account and c.account_id=v_account;

  if v_character is null then raise exception 'Custom tag not found for this account' using errcode='P0002'; end if;

  update public.character_custom_tags
  set is_active=false
  where character_id=v_character and account_id=v_account and is_active and id<>p_tag_id;

  update public.character_custom_tags
  set is_active=true, visible=true
  where id=p_tag_id and account_id=v_account;

  return true;
end;
$$;
revoke all on function public.set_my_character_custom_tag_active(uuid) from public,anon;
grant execute on function public.set_my_character_custom_tag_active(uuid) to authenticated;

commit;
