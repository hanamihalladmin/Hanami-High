begin;

insert into public.customization_assets
(slug,name,description,asset_type,collection_name,rarity,access_kind,animated,asset_payload,state,sort_order)
values
('font-cherry-pop','Cherry Pop','Playful bubbly display lettering for bright Hanami profiles.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"cute","fontFamily":"\"Cherry Bomb One\", cursive","googleFamily":"Cherry Bomb One","sample":"sweet little daydream"}'::jsonb,'published',100),
('font-sugar-rounded','Sugar Rounded','Soft rounded lettering with a friendly profile-card feel.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"cute","fontFamily":"Fredoka, sans-serif","googleFamily":"Fredoka","sample":"sugar cloud club"}'::jsonb,'published',110),
('font-dreamy-soft','Dreamy Soft','Gentle rounded text for bios, notes, and cozy pages.','font','Hanami Font Library','uncommon','hanami_plus',false,'{"category":"soft","fontFamily":"Nunito, sans-serif","googleFamily":"Nunito","sample":"small heart, big feelings"}'::jsonb,'published',120),
('font-cloud-note','Cloud Note','Clean soft lettering with a modern diary feel.','font','Hanami Font Library','uncommon','hanami_plus',false,'{"category":"soft","fontFamily":"Quicksand, sans-serif","googleFamily":"Quicksand","sample":"welcome to my little space"}'::jsonb,'published',130),
('font-love-letter','Love Letter','Loose handwritten lettering for diary-style profile sections.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"handwritten","fontFamily":"Caveat, cursive","googleFamily":"Caveat","sample":"dear hanami, today was lovely"}'::jsonb,'published',140),
('font-ribbon-script','Ribbon Script','Bold flowing script for names, headers, and decorative tags.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"script","fontFamily":"Pacifico, cursive","googleFamily":"Pacifico","sample":"ribbons and roses"}'::jsonb,'published',150),
('font-moonlight-script','Moonlight Script','Fine romantic script for dreamy display names.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"script","fontFamily":"Sacramento, cursive","googleFamily":"Sacramento","sample":"moonlight after class"}'::jsonb,'published',160),
('font-storybook','Storybook','Elegant editorial serif for polished profile headings.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"serif","fontFamily":"\"Playfair Display\", serif","googleFamily":"Playfair Display","sample":"a quiet afternoon at Hanami"}'::jsonb,'published',170),
('font-rose-editorial','Rose Editorial','High-contrast romantic serif for ornate pages.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"serif","fontFamily":"\"Cormorant Garamond\", serif","googleFamily":"Cormorant Garamond","sample":"roses bloom after school"}'::jsonb,'published',180),
('font-classic-diary','Classic Diary','Traditional readable serif for long blogs and journals.','font','Hanami Font Library','uncommon','hanami_plus',false,'{"category":"serif","fontFamily":"\"Libre Baskerville\", serif","googleFamily":"Libre Baskerville","sample":"notes from the school year"}'::jsonb,'published',190),
('font-velvet-title','Velvet Title','Heavy editorial display serif with dramatic contrast.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"display","fontFamily":"\"DM Serif Display\", serif","googleFamily":"DM Serif Display","sample":"HANAMI AFTER DARK"}'::jsonb,'published',200),
('font-campus-typewriter','Campus Typewriter','Rough typewriter lettering for old-web notes and journal cards.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"retro","fontFamily":"\"Special Elite\", monospace","googleFamily":"Special Elite","sample":"typed in the computer lab"}'::jsonb,'published',210),
('font-pixel-heart','Pixel Heart','Chunky pixel lettering for games, status cards, and retro profiles.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"pixel","fontFamily":"\"Pixelify Sans\", monospace","googleFamily":"Pixelify Sans","sample":"LEVEL UP ♥ HANAMI"}'::jsonb,'published',220),
('font-arcade-tiny','Arcade Tiny','Classic arcade bitmap lettering for compact decorative labels.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"pixel","fontFamily":"\"Press Start 2P\", monospace","googleFamily":"Press Start 2P","sample":"PLAYER ONE READY"}'::jsonb,'published',230),
('font-gothic-crest','Gothic Crest','Formal fantasy serif for elegant school-crested designs.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"gothic","fontFamily":"Cinzel, serif","googleFamily":"Cinzel","sample":"Hanami High Society"}'::jsonb,'published',240),
('font-midnight-blackletter','Midnight Blackletter','Decorative blackletter for gothic profile titles and tags.','font','Hanami Font Library','special','hanami_plus',false,'{"category":"gothic","fontFamily":"UnifrakturMaguntia, cursive","googleFamily":"UnifrakturMaguntia","sample":"midnight garden"}'::jsonb,'published',250),
('font-pop-poster','Pop Poster','Outlined display lettering for loud Y2K-inspired headers.','font','Hanami Font Library','special','hanami_plus',false,'{"category":"y2k","fontFamily":"\"Bungee Shade\", sans-serif","googleFamily":"Bungee Shade","sample":"HANAMI POP!"}'::jsonb,'published',260),
('font-tokyo-pop','Tokyo Pop','Heavy geometric Japanese-pop inspired display lettering.','font','Hanami Font Library','special','hanami_plus',false,'{"category":"y2k","fontFamily":"\"Dela Gothic One\", sans-serif","googleFamily":"Dela Gothic One","sample":"after school dream club"}'::jsonb,'published',270),
('font-mochi-pop','Mochi Pop','Round energetic display lettering for cute tags and banners.','font','Hanami Font Library','epic','hanami_plus',false,'{"category":"cute","fontFamily":"\"Mochiy Pop One\", sans-serif","googleFamily":"Mochiy Pop One","sample":"mochi pop memories"}'::jsonb,'published',280),
('font-retro-candy','Retro Candy','Bold bubbly retro lettering for bright nostalgic layouts.','font','Hanami Font Library','rare','hanami_plus',false,'{"category":"retro","fontFamily":"Coiny, cursive","googleFamily":"Coiny","sample":"candy hearts forever"}'::jsonb,'published',290)
on conflict (slug) do update set
 name=excluded.name,
 description=excluded.description,
 collection_name=excluded.collection_name,
 rarity=excluded.rarity,
 access_kind=excluded.access_kind,
 asset_payload=excluded.asset_payload,
 state=excluded.state,
 sort_order=excluded.sort_order,
 updated_at=now();

commit;
