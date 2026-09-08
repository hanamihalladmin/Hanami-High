-- Hanami+ decorative asset library
-- Original Hanami sticker, emoji, divider, icon, and charm catalog.

insert into public.customization_assets
  (slug,name,description,asset_type,collection_name,rarity,access_kind,animated,asset_payload,state,sort_order)
values
  ('sticker-moon-bunny','Moon Bunny','A sleepy moon bunny surrounded by tiny starlight.','sticker','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"☾🐇","artKind":"celestial","background":"#221b3a","accent":"#d8b7ff","accent2":"#ffc6df","border":"#8e72c8","motion":"float"}'::jsonb,'published',401),
  ('sticker-sakura-soda','Sakura Soda','A fizzy pink soda with petals, ice, and a tiny cherry charm.','sticker','After School Café','uncommon','hanami_plus',true,'{"glyph":"🌸🥤","artKind":"cafe","background":"#fff0f5","accent":"#ef8db5","accent2":"#ffd0dc","border":"#d8729c","motion":"bubble"}'::jsonb,'published',402),
  ('sticker-dream-cloud-cat','Dream Cloud Cat','A tiny cat sleeping on a lavender cloud.','sticker','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"☁️🐈","artKind":"cloud","background":"#efe8ff","accent":"#a788dc","accent2":"#ffd4ea","border":"#b4a0dc","motion":"float"}'::jsonb,'published',403),
  ('sticker-ribbon-heart','Ribbon Heart','A glossy heart tied with a soft pink ribbon.','sticker','Ribbon Room','uncommon','hanami_plus',false,'{"glyph":"🎀♡","artKind":"ribbon","background":"#fff2f7","accent":"#e98eaf","accent2":"#ffe1eb","border":"#d57e9e","motion":"none"}'::jsonb,'published',404),
  ('sticker-angel-teddy','Angel Teddy','A plush teddy with tiny wings and a pearl halo.','sticker','Angel Study','epic','hanami_plus',true,'{"glyph":"🪽🧸","artKind":"angel","background":"#f9f4ff","accent":"#dfc7ff","accent2":"#fff2cf","border":"#c7afe6","motion":"glow"}'::jsonb,'published',405),
  ('sticker-star-diary','Star Diary','A decorated notebook with a star clasp and glittering tabs.','sticker','Notebook Club','uncommon','hanami_plus',false,'{"glyph":"📓✦","artKind":"notebook","background":"#fff9ed","accent":"#7589c7","accent2":"#f7acc5","border":"#6f7dad","motion":"none"}'::jsonb,'published',406),
  ('sticker-cherry-milk','Cherry Milk','A carton of sweet cherry milk with a smiling flower.','sticker','After School Café','common','standard',false,'{"glyph":"🍒🥛","artKind":"cafe","background":"#fff7f8","accent":"#e87e9f","accent2":"#ffd8df","border":"#d89cab","motion":"none"}'::jsonb,'published',407),
  ('sticker-school-bell-spark','School Bell Spark','A polished school bell surrounded by Hanami sparkles.','sticker','Hanami Campus','common','standard',true,'{"glyph":"🔔✦","artKind":"school","background":"#fffaf0","accent":"#ba9255","accent2":"#f6d89a","border":"#9d7d4f","motion":"shimmer"}'::jsonb,'published',408),
  ('sticker-pixel-frog','Pixel Frog','A tiny green pixel frog for old-web pages and desktops.','sticker','Pixel After School','rare','hanami_plus',true,'{"glyph":"▦🐸","artKind":"pixel","background":"#17251f","accent":"#83d69c","accent2":"#d8ff9c","border":"#4b8d67","motion":"blink"}'::jsonb,'published',409),
  ('sticker-tea-cup-spirit','Tea Cup Spirit','A warm teacup with a shy little steam spirit.','sticker','Garden Teahouse','uncommon','hanami_plus',true,'{"glyph":"🍵♡","artKind":"teahouse","background":"#f6f0df","accent":"#87a784","accent2":"#e7b9c8","border":"#708f72","motion":"steam"}'::jsonb,'published',410),
  ('sticker-moon-koi','Moon Koi','Two luminous koi circling a crescent moon.','sticker','Moonlit Garden','epic','hanami_plus',true,'{"glyph":"☾𓆝","artKind":"koi","background":"#151b35","accent":"#a7baf7","accent2":"#f6b4cf","border":"#7487be","motion":"orbit"}'::jsonb,'published',411),
  ('sticker-bloom-laptop','Bloom Laptop','A 2006 laptop covered in flowers and tiny school stickers.','sticker','Hanami Campus','rare','hanami_plus',false,'{"glyph":"💻🌸","artKind":"tech","background":"#eef3ed","accent":"#7f9b86","accent2":"#e9a6bd","border":"#718b77","motion":"none"}'::jsonb,'published',412),

  ('emoji-blush-bloom','Blush Bloom','A bashful flower emote.','emoji','Hanami Emotes','common','standard',false,'{"glyph":"🌸","artKind":"emoji","background":"#fff2f6","accent":"#ef98b5","accent2":"#ffd2df","border":"#e0a0b5","motion":"none"}'::jsonb,'published',421),
  ('emoji-sparkle-eyes','Sparkle Eyes','A starry-eyed excitement emote.','emoji','Hanami Emotes','uncommon','hanami_plus',true,'{"glyph":"✦ᴗ✦","artKind":"emoji","background":"#f4efff","accent":"#a991e5","accent2":"#f9c2df","border":"#a58dcc","motion":"sparkle"}'::jsonb,'published',422),
  ('emoji-heart-eyes','Heart Eyes','A soft heart-eyed smile.','emoji','Hanami Emotes','uncommon','hanami_plus',false,'{"glyph":"♡ᴗ♡","artKind":"emoji","background":"#fff0f5","accent":"#e887aa","accent2":"#ffc2d6","border":"#d77c9f","motion":"none"}'::jsonb,'published',423),
  ('emoji-soft-sob','Soft Sob','A tiny dramatic sob for diary-level feelings.','emoji','Hanami Emotes','uncommon','hanami_plus',true,'{"glyph":";﹏;","artKind":"emoji","background":"#edf3ff","accent":"#7e9bd1","accent2":"#c9dcff","border":"#8298bd","motion":"bob"}'::jsonb,'published',424),
  ('emoji-support-heart','Support Heart','A comforting heart used for supportive reactions.','emoji','Hanami Emotes','common','standard',true,'{"glyph":"♡+","artKind":"emoji","background":"#f2f7ed","accent":"#7ca179","accent2":"#f1b7c8","border":"#799178","motion":"pulse"}'::jsonb,'published',425),
  ('emoji-sleepy-cloud','Sleepy Cloud','A little cloud ready for bed.','emoji','Hanami Emotes','rare','hanami_plus',true,'{"glyph":"☁ zZ","artKind":"cloud","background":"#eef0ff","accent":"#9aa2d8","accent2":"#d8c8ff","border":"#959bc7","motion":"float"}'::jsonb,'published',426),
  ('emoji-starry','Starry','A bright little starburst.','emoji','Hanami Emotes','common','standard',true,'{"glyph":"✦✧✦","artKind":"celestial","background":"#f7f3ff","accent":"#a88de0","accent2":"#ffe6a8","border":"#9b89bf","motion":"sparkle"}'::jsonb,'published',427),
  ('emoji-bunny-wave','Bunny Wave','A friendly bunny waving hello.','emoji','Hanami Emotes','rare','hanami_plus',true,'{"glyph":"ᕱ⑅ᕱﾉ","artKind":"kawaii","background":"#fff4f7","accent":"#df91ac","accent2":"#fbd4df","border":"#d09caf","motion":"wave"}'::jsonb,'published',428),
  ('emoji-petal','Petal','A single drifting Hanami petal.','emoji','Hanami Emotes','common','standard',true,'{"glyph":"❀","artKind":"floral","background":"#fff8f8","accent":"#dc809d","accent2":"#f3bdcb","border":"#d596a7","motion":"drift"}'::jsonb,'published',429),
  ('emoji-clover-wish','Clover Wish','A tiny lucky clover.','emoji','Hanami Emotes','uncommon','hanami_plus',false,'{"glyph":"☘","artKind":"garden","background":"#f0f6ed","accent":"#71966f","accent2":"#c4ddb7","border":"#759278","motion":"none"}'::jsonb,'published',430),
  ('emoji-music-note-pop','Music Note Pop','A poppy music-note emote.','emoji','Hanami Emotes','uncommon','hanami_plus',true,'{"glyph":"♫✦","artKind":"music","background":"#f8edff","accent":"#b377d5","accent2":"#f599c1","border":"#9f7cba","motion":"bounce"}'::jsonb,'published',431),
  ('emoji-teddy-hi','Teddy Hi','A tiny teddy greeting.','emoji','Hanami Emotes','rare','hanami_plus',true,'{"glyph":"🧸ﾉ","artKind":"kawaii","background":"#fff2e9","accent":"#b8876d","accent2":"#f4b8c8","border":"#ad8d7b","motion":"wave"}'::jsonb,'published',432),

  ('divider-ribbon-sparkle','Ribbon Sparkle Divider','A pink ribbon line with tiny white sparkles.','divider','Dream Dividers','rare','hanami_plus',true,'{"glyph":"✦ ── 🎀 ── ✦","artKind":"ribbon","background":"transparent","accent":"#e58fae","accent2":"#ffd2df","border":"#d28aa4","motion":"shimmer"}'::jsonb,'published',441),
  ('divider-star-chain','Star Chain Divider','A hanging chain of stars and pearls.','divider','Dream Dividers','rare','hanami_plus',true,'{"glyph":"⋆｡°✩ ─ ✧ ─ ✩°｡⋆","artKind":"celestial","background":"transparent","accent":"#a68bd8","accent2":"#f7c6e0","border":"#8f7cb8","motion":"sparkle"}'::jsonb,'published',442),
  ('divider-petal-lace','Petal Lace Divider','A delicate floral lace separator.','divider','Garden Dividers','uncommon','hanami_plus',false,'{"glyph":"❀ ┄ ♡ ┄ ❀ ┄ ♡ ┄ ❀","artKind":"lace","background":"transparent","accent":"#cf89a0","accent2":"#ead8c2","border":"#c8a4a8","motion":"none"}'::jsonb,'published',443),
  ('divider-moon-orbit','Moon Orbit Divider','A moon and tiny planets stretched across a profile section.','divider','Dream Dividers','epic','hanami_plus',true,'{"glyph":"☾ · ✦ · ◌ · ✧ · ☽","artKind":"celestial","background":"transparent","accent":"#8f8ed2","accent2":"#bfe4ff","border":"#8e90bd","motion":"orbit"}'::jsonb,'published',444),
  ('divider-heart-pearl','Heart Pearl Divider','A strand of pearl hearts.','divider','Dream Dividers','rare','hanami_plus',true,'{"glyph":"♡·｡·♡·｡·♡·｡·♡","artKind":"pearl","background":"transparent","accent":"#efb4ca","accent2":"#fff1dc","border":"#d9a9b8","motion":"glow"}'::jsonb,'published',445),
  ('divider-pixel-hearts','Pixel Hearts Divider','A retro pixel heart rule.','divider','Pixel After School','rare','hanami_plus',true,'{"glyph":"<3 :: <3 :: <3 :: <3","artKind":"pixel","background":"transparent","accent":"#ef72ad","accent2":"#ae91ff","border":"#b875ac","motion":"blink"}'::jsonb,'published',446),
  ('divider-notebook-dash','Notebook Dash Divider','A school-notebook dash line with a tiny flower.','divider','Notebook Club','common','standard',false,'{"glyph":"— — — ✿ — — —","artKind":"notebook","background":"transparent","accent":"#718b7a","accent2":"#d59ab1","border":"#8ca092","motion":"none"}'::jsonb,'published',447),
  ('divider-angel-wings','Angel Wings Divider','A small winged heart divider.','divider','Angel Study','epic','hanami_plus',true,'{"glyph":"𓆩♡𓆪 ─── 𓆩♡𓆪","artKind":"angel","background":"transparent","accent":"#e8d7ff","accent2":"#f8b7d0","border":"#c7afe0","motion":"glow"}'::jsonb,'published',448),

  ('icon-ribbon-bow','Ribbon Bow Icon','A soft ribbon bow accent.','icon','Ribbon Room','uncommon','hanami_plus',false,'{"glyph":"🎀","artKind":"ribbon","background":"#fff1f6","accent":"#e588ac","accent2":"#ffd1df","border":"#d684a3","motion":"none"}'::jsonb,'published',461),
  ('icon-pearl-heart','Pearl Heart Icon','A pearl-trimmed heart icon.','icon','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"♡","artKind":"pearl","background":"#fffafc","accent":"#f2b8d0","accent2":"#fff2d9","border":"#d8b6bd","motion":"glow"}'::jsonb,'published',462),
  ('icon-crystal-star','Crystal Star Icon','An iridescent crystal star.','icon','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"✦","artKind":"crystal","background":"#f4f2ff","accent":"#a7a2ff","accent2":"#d7f2ff","border":"#9794d5","motion":"shimmer"}'::jsonb,'published',463),
  ('icon-music-note','Music Note Icon','A glossy music note.','icon','After School Café','common','standard',false,'{"glyph":"♫","artKind":"music","background":"#fff2f8","accent":"#d97da7","accent2":"#a78ae4","border":"#c78aab","motion":"none"}'::jsonb,'published',464),
  ('icon-sakura','Sakura Icon','A tiny Hanami blossom.','icon','Hanami Campus','common','standard',true,'{"glyph":"❀","artKind":"floral","background":"#fff7f8","accent":"#dc839d","accent2":"#f8bdcb","border":"#d49aaa","motion":"drift"}'::jsonb,'published',465),
  ('icon-teddy','Teddy Icon','A tiny plush mascot icon.','icon','Angel Study','uncommon','hanami_plus',false,'{"glyph":"🧸","artKind":"kawaii","background":"#fff4eb","accent":"#b8896d","accent2":"#f2b2c3","border":"#ad8b78","motion":"none"}'::jsonb,'published',466),
  ('icon-crescent','Crescent Icon','A luminous crescent moon.','icon','Dreamy Nights','uncommon','hanami_plus',true,'{"glyph":"☾","artKind":"celestial","background":"#201b38","accent":"#d3b7ff","accent2":"#a9d7ff","border":"#8c78b5","motion":"glow"}'::jsonb,'published',467),
  ('icon-butterfly','Butterfly Icon','A dreamy butterfly accent.','icon','Moonlit Garden','rare','hanami_plus',true,'{"glyph":"🦋","artKind":"garden","background":"#f3efff","accent":"#ad91e7","accent2":"#f3b8dc","border":"#a68dcb","motion":"float"}'::jsonb,'published',468),

  ('accent-pearl-heart-charm','Pearl Heart Charm','A dangling heart-and-pearl charm.','decorative_accent','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"♡｡","artKind":"pearl","background":"#fff8fc","accent":"#efafd0","accent2":"#fff0cf","border":"#d7aab9","motion":"sway"}'::jsonb,'published',481),
  ('accent-crystal-star-charm','Crystal Star Charm','A small iridescent star charm.','decorative_accent','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"✦","artKind":"crystal","background":"#f4f3ff","accent":"#a8a0ff","accent2":"#c8efff","border":"#9b98d2","motion":"shimmer"}'::jsonb,'published',482),
  ('accent-mini-wing-charm','Mini Wing Charm','A tiny floating angel wing.','decorative_accent','Angel Study','epic','hanami_plus',true,'{"glyph":"𓆩","artKind":"angel","background":"#fbf7ff","accent":"#e3d2ff","accent2":"#fff1d0","border":"#cbb8e0","motion":"float"}'::jsonb,'published',483),
  ('accent-lace-bow-charm','Lace Bow Charm','A delicate lace bow.','decorative_accent','Ribbon Room','rare','hanami_plus',false,'{"glyph":"୨୧","artKind":"lace","background":"#fff5f8","accent":"#e4a0b8","accent2":"#f8e4d9","border":"#d3a1ae","motion":"none"}'::jsonb,'published',484),
  ('accent-crescent-chain','Crescent Chain','A crescent hanging from a tiny star chain.','decorative_accent','Dreamy Nights','epic','hanami_plus',true,'{"glyph":"⋆☾","artKind":"celestial","background":"#211c3a","accent":"#cdb4ff","accent2":"#9edcff","border":"#8377ab","motion":"sway"}'::jsonb,'published',485),
  ('accent-tiny-rose-charm','Tiny Rose Charm','A miniature garden rose charm.','decorative_accent','Moonlit Garden','uncommon','hanami_plus',false,'{"glyph":"🌹","artKind":"garden","background":"#fff4f5","accent":"#c86f8b","accent2":"#e6c3a7","border":"#bd8893","motion":"none"}'::jsonb,'published',486),
  ('accent-chain-heart-charm','Chain Heart Charm','A dark-silver chain with a pink heart crystal.','decorative_accent','Dreamy Nights','rare','hanami_plus',true,'{"glyph":"⛓♡","artKind":"gothic-soft","background":"#24202c","accent":"#ef9fca","accent2":"#b9a9e3","border":"#75687d","motion":"glow"}'::jsonb,'published',487),
  ('accent-pixel-spark-charm','Pixel Spark Charm','A tiny blinking old-web sparkle.','decorative_accent','Pixel After School','rare','hanami_plus',true,'{"glyph":"+*","artKind":"pixel","background":"#161d1b","accent":"#a5f0bd","accent2":"#f38ec1","border":"#5c8470","motion":"blink"}'::jsonb,'published',488)
on conflict (slug) do update set
  name=excluded.name,description=excluded.description,asset_type=excluded.asset_type,
  collection_name=excluded.collection_name,rarity=excluded.rarity,access_kind=excluded.access_kind,
  animated=excluded.animated,asset_payload=excluded.asset_payload,state=excluded.state,
  sort_order=excluded.sort_order,updated_at=now();

create or replace function public.add_my_customization_asset_to_profile(p_asset_id uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account uuid := auth.uid();
  v_character uuid;
  v_asset public.customization_assets%rowtype;
  v_widget_id uuid;
  v_y integer;
begin
  if v_account is null then raise exception 'Authentication required'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Choose an active character first'; end if;
  if not exists(select 1 from public.characters where id=v_character and account_id=v_account) then raise exception 'Active character is unavailable'; end if;
  select * into v_asset from public.customization_assets where id=p_asset_id and state='published';
  if not found or v_asset.asset_type not in ('sticker','divider','icon','decorative_accent') then raise exception 'This asset cannot be added to Profile Studio'; end if;
  if not private.account_can_use_customization_asset(v_account,p_asset_id) then raise exception 'This decoration is not available to your account'; end if;
  select least(195,greatest(1,coalesce(max(y+height),1)+1)) into v_y from public.profile_widgets where character_id=v_character;
  insert into public.profile_widgets(character_id,widget_type,title,config,x,y,width,height,z_index,is_visible)
  values(v_character,case when v_asset.asset_type='divider' then 'divider' else 'sticker' end,v_asset.name,
    jsonb_build_object('content',coalesce(v_asset.asset_payload->>'glyph','✦'),'customizationAssetId',v_asset.id,'customizationAssetSlug',v_asset.slug,'customizationAssetType',v_asset.asset_type,'collectionName',v_asset.collection_name,'animated',v_asset.animated,'assetStyle',v_asset.asset_payload),
    1,v_y,case when v_asset.asset_type='divider' then 12 else 3 end,case when v_asset.asset_type='divider' then 1 else 3 end,0,true)
  returning id into v_widget_id;
  return v_widget_id;
end $$;
revoke all on function public.add_my_customization_asset_to_profile(uuid) from public;
grant execute on function public.add_my_customization_asset_to_profile(uuid) to authenticated;

create or replace function public.add_my_customization_asset_to_space(p_asset_id uuid,p_space_kind text)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account uuid := auth.uid();
  v_character uuid;
  v_asset public.customization_assets%rowtype;
  v_item_id uuid;
  v_count integer;
begin
  if v_account is null then raise exception 'Authentication required'; end if;
  if p_space_kind not in ('locker','desk','phone','desktop') then raise exception 'Unknown personal space'; end if;
  select active_character_id into v_character from public.accounts where id=v_account;
  if v_character is null then raise exception 'Choose an active character first'; end if;
  if not private.can_edit_character_plus_customization(v_character) then raise exception 'Active Hanami+ is required to edit Personal Spaces'; end if;
  select * into v_asset from public.customization_assets where id=p_asset_id and state='published';
  if not found or v_asset.asset_type not in ('sticker','emoji','icon','decorative_accent') then raise exception 'This asset cannot be placed in Personal Spaces'; end if;
  if not private.account_can_use_customization_asset(v_account,p_asset_id) then raise exception 'This decoration is not available to your account'; end if;
  select count(*) into v_count from public.character_space_items where character_id=v_character and space_kind=p_space_kind;
  insert into public.character_space_items(character_id,space_kind,item_kind,label,body,position_x,position_y,width_pct,height_pct,rotation_deg,z_index,metadata)
  values(v_character,p_space_kind,case when v_asset.asset_type='decorative_accent' then 'charm' else 'sticker' end,v_asset.name,coalesce(v_asset.asset_payload->>'glyph','✦'),
    8+((v_count%6)*9),10+((v_count%6)*8),18,18,0,v_count+1,
    jsonb_build_object('customizationAssetId',v_asset.id,'customizationAssetSlug',v_asset.slug,'customizationAssetType',v_asset.asset_type,'collectionName',v_asset.collection_name,'animated',v_asset.animated,'assetStyle',v_asset.asset_payload))
  returning id into v_item_id;
  return v_item_id;
end $$;
revoke all on function public.add_my_customization_asset_to_space(uuid,text) from public;
grant execute on function public.add_my_customization_asset_to_space(uuid,text) to authenticated;
