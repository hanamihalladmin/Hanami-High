insert into public.boutique_items
  (slug,name,description,item_type,collection_name,season,rarity,price_petals,state,featured,is_new,pass_days,preview_token)
values
  ('crystal-bloom-frame','Crystal Bloom Frame','A luminous crystal-and-flower avatar frame with a soft animated pulse.','frame','Crystal Conservatory','winter','legendary',185,'published',true,true,null,'stars'),
  ('aurora-wing-frame','Aurora Wing Frame','Iridescent winglight circles your avatar in a slow rotating aurora.','frame','Celestial Wings','winter','legendary',195,'published',true,true,null,'navy'),
  ('gilded-moon-frame','Gilded Moon Frame','A gold moonlit frame with a warm shimmer around your portrait.','frame','Moonlit Court','fall','rare',135,'published',false,true,null,'gold'),
  ('pixel-arcade-frame','Pixel Arcade Frame','A colorful stepped neon frame inspired by after-school arcades.','frame','Arcade After School','summer','rare',125,'published',false,true,null,'arcade-bloom'),
  ('cherry-ribbon-frame','Cherry Ribbon Frame','Double pink ribbon lines and blossom accents for a sweet spring profile.','frame','Ribbon Garden','spring','uncommon',90,'published',false,true,null,'sakura'),

  ('sakura-drift-halo','Sakura Drift Halo','A ring of drifting petals that slowly circles the avatar.','avatar_decoration','Spring Daydream','spring','rare',130,'published',true,true,null,'sakura-sentinel'),
  ('moonlit-koi-orbit','Moonlit Koi Orbit','Blue moonlight and koi-inspired orbit lines circle your avatar.','avatar_decoration','Moonlit Court','winter','rare',140,'published',false,true,null,'midnight-shrine'),
  ('cloud-puff-friend','Cloud Puff Friend','Tiny floating cloud companions bob gently around your portrait.','avatar_decoration','Soft Sky','summer','uncommon',95,'published',false,true,null,'study-buddy'),
  ('starlight-sprites','Starlight Sprites','Four tiny star sprites sparkle around the edges of your avatar.','avatar_decoration','Celestial Wings','winter','rare',145,'published',true,true,null,'stars'),
  ('rosegarden-orbit','Rosegarden Orbit','A slow orbit of deep rose lights for an elegant garden look.','avatar_decoration','Roseglass Garden','fall','rare',135,'published',false,true,null,'lucky-daruma'),

  ('petal-shower','Petal Shower','Animated petals drift across the top of your published profile.','effect','Spring Daydream','spring','uncommon',85,'published',true,true,null,'petals'),
  ('starlight-trail','Starlight Trail','A sparkling star trail glimmers across your profile surface.','effect','Celestial Wings','winter','rare',125,'published',false,true,null,'stars'),
  ('firefly-drift','Firefly Drift','Warm little lights drift slowly across your profile like summer fireflies.','effect','Night Garden','summer','rare',120,'published',false,true,null,'midnight-shrine'),
  ('bubble-pop','Bubble Pop','Soft bubbles rise and shimmer around your profile card.','effect','Ocean Dream','summer','uncommon',90,'published',false,true,null,'arcade-bloom'),
  ('aurora-mist','Aurora Mist','A translucent aurora glow washes through the profile background.','effect','Celestial Wings','winter','legendary',175,'published',true,true,null,'navy'),

  ('tea-house-card','Tea House Card','A warm paper-and-tea profile card treatment for cozy after-school profiles.','profile_card','After Class','fall','uncommon',85,'published',false,true,null,'student-id-card'),
  ('midnight-card','Midnight Card','A dark indigo profile card with soft violet highlights.','profile_card','Night Garden','winter','rare',120,'published',false,true,null,'midnight-shrine'),
  ('night-garden','Night Garden','A deep night garden background with violet light and floral atmosphere.','background_pack','Night Garden','summer','rare',135,'published',true,true,null,'midnight-shrine')
on conflict (slug) do update set
  name=excluded.name,
  description=excluded.description,
  item_type=excluded.item_type,
  collection_name=excluded.collection_name,
  season=excluded.season,
  rarity=excluded.rarity,
  price_petals=excluded.price_petals,
  state=excluded.state,
  featured=excluded.featured,
  is_new=excluded.is_new,
  pass_days=excluded.pass_days,
  preview_token=excluded.preview_token,
  updated_at=now();
