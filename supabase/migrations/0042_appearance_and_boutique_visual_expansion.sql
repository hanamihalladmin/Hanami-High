alter table public.account_preferences
add column site_theme text not null default 'hanami'
check (site_theme in ('hanami','sakura','sage','navy','lavender','sunset','mono'));

alter table public.boutique_items drop constraint boutique_items_item_type_check;
alter table public.boutique_items add constraint boutique_items_item_type_check
check (item_type in ('avatar_decoration','frame','effect','nameplate','profile_card','background_pack','sticker','hanami_plus_pass'));

insert into public.boutique_items(
  slug,name,description,item_type,collection_name,season,rarity,price_petals,state,featured,is_new,pass_days,preview_token
) values
('sakura-sentinel','Sakura Sentinel','A cherry-blossom guardian that curls around your avatar.','avatar_decoration','Spring Guardians','spring','rare',125,'published',true,true,null,'sakura-sentinel'),
('study-buddy','Study Buddy','A sleepy library cat and book stack for your avatar.','avatar_decoration','After Class','permanent','uncommon',80,'published',true,true,null,'study-buddy'),
('lucky-daruma','Lucky Daruma','A bright Daruma charm that bobs beside your avatar.','avatar_decoration','Festival Charms','fall','uncommon',75,'published',false,true,null,'lucky-daruma'),
('arcade-bloom','Arcade Bloom','Pixel petals and neon sparkles for your profile.','effect','Arcade After School','summer','rare',115,'published',true,true,null,'arcade-bloom'),
('midnight-shrine','Midnight Shrine','A deep indigo profile effect with lantern glows.','effect','Night Campus','winter','legendary',180,'published',true,true,null,'midnight-shrine'),
('student-id-card','Student ID Card','A collectible Hanami school ID profile card style.','profile_card','Campus Classics','permanent','uncommon',70,'published',false,true,null,'student-id-card'),
('rooftop-sunset','Rooftop Sunset','A warm after-school rooftop background pack.','background_pack','After School','fall','rare',130,'published',true,true,null,'rooftop-sunset'),
('hanami-sticker-sheet','Hanami Sticker Sheet','A sheet of school, sakura, notebook, and club stickers.','sticker','Hanami Stationery','spring','common',45,'published',false,true,null,'sticker-sheet')
on conflict(slug) do nothing;
