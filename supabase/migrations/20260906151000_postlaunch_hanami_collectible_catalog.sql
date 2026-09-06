create or replace function private.validate_exchange_cosmetic_metadata(input jsonb) returns boolean
language plpgsql immutable set search_path=''
as $$
declare k text; v text;
begin
  input:=coalesce(input,'{}'::jsonb);
  if jsonb_typeof(input)<>'object' then return false; end if;
  for k in select jsonb_object_keys(input) loop
    if k not in ('accent','text','sidebar','surface','font','effect','decoration','nameplate') then return false; end if;
  end loop;
  foreach k in array array['accent','text','sidebar','surface'] loop
    v:=input->>k; if v is not null and v !~ '^#[0-9A-Fa-f]{6}$' then return false; end if;
  end loop;
  v:=input->>'font'; if v is not null and v not in ('classic','modern','rounded','schoolbook','clean','notebook') then return false; end if;
  v:=input->>'effect'; if v is not null and v not in ('none','paper','petals','sparkle') then return false; end if;
  v:=input->>'decoration'; if v is not null and v not in ('none','sakura_halo','pixel_hearts','festival_lanterns','starlight_orbit','council_seal') then return false; end if;
  v:=input->>'nameplate'; if v is not null and v not in ('none','navy_ribbon','sakura_label','notebook_strip','chronicle_print') then return false; end if;
  return true;
end $$;

insert into public.school_store_items(slug,label,category,description,cost,rarity,active,cosmetic_slot,bloom_required,metadata)
values
('sakura-halo','Sakura Halo','avatar_decoration','A ring of tiny Hanami blossoms around your profile portrait.',90,'uncommon',true,'avatar_decoration',false,'{"decoration":"sakura_halo"}'::jsonb),
('pixel-heart-ring','Pixel Heart Ring','avatar_decoration','A retro pixel-heart frame inspired by early social-network profile decorations.',110,'rare',true,'avatar_decoration',false,'{"decoration":"pixel_hearts"}'::jsonb),
('starlight-orbit','Starlight Orbit','avatar_decoration','A school-night constellation orbit for your portrait.',150,'rare',true,'avatar_decoration',false,'{"decoration":"starlight_orbit"}'::jsonb),
('festival-lantern-orbit','Festival Lantern Orbit','avatar_decoration','Miniature festival lanterns circle your portrait during Hanami celebrations.',180,'legendary',true,'avatar_decoration',true,'{"decoration":"festival_lanterns"}'::jsonb),
('student-council-seal','Student Council Seal','avatar_decoration','A formal Hanami crest treatment for prestige profiles.',200,'prestige',true,'avatar_decoration',true,'{"decoration":"council_seal"}'::jsonb),
('petal-drift','Petal Drift','profile_effect','Soft falling petals across the portal background.',80,'uncommon',true,'profile_effect',false,'{"effect":"petals"}'::jsonb),
('starlight-spark','Starlight Spark','profile_effect','Tiny sparkling highlights for your school-network profile.',100,'rare',true,'profile_effect',false,'{"effect":"sparkle"}'::jsonb),
('notebook-paper','Notebook Paper','profile_theme','A paper-texture portal treatment with notebook typography.',65,'common',true,'profile_theme',false,'{"effect":"paper","font":"notebook","accent":"#6B8D74","surface":"#FFF9EC"}'::jsonb),
('after-school-sakura','After-School Sakura','profile_theme','Dusty rose, navy, and ivory inspired by an after-school cherry blossom walk.',120,'rare',true,'profile_theme',false,'{"accent":"#9B5870","sidebar":"#17375F","surface":"#FFF8F1","text":"#263342"}'::jsonb),
('navy-ribbon-nameplate','Navy Ribbon','nameplate','A crisp navy school-ribbon nameplate for profile headings.',70,'common',true,'nameplate',false,'{"nameplate":"navy_ribbon"}'::jsonb),
('sakura-label-nameplate','Sakura Label','nameplate','A pink stationery-style label with a tiny blossom motif.',90,'uncommon',true,'nameplate',false,'{"nameplate":"sakura_label"}'::jsonb),
('notebook-strip-nameplate','Notebook Strip','nameplate','A handwritten-school-note nameplate treatment.',85,'uncommon',true,'nameplate',false,'{"nameplate":"notebook_strip"}'::jsonb),
('chronicle-print-nameplate','Chronicle Print','nameplate','A newspaper masthead-inspired nameplate from the Hanami Chronicle.',105,'rare',true,'nameplate',false,'{"nameplate":"chronicle_print"}'::jsonb),
('schoolbook-type','Schoolbook Type','font','A classic schoolbook serif font preset.',40,'common',true,'font',false,'{"font":"schoolbook"}'::jsonb),
('clean-type','Clean Type','font','A simple clean sans-serif profile font preset.',40,'common',true,'font',false,'{"font":"clean"}'::jsonb),
('notebook-type','Notebook Type','font','A casual notebook-style profile font preset.',45,'common',true,'font',false,'{"font":"notebook"}'::jsonb)
on conflict(slug) do update set label=excluded.label,category=excluded.category,description=excluded.description,cost=excluded.cost,rarity=excluded.rarity,active=excluded.active,cosmetic_slot=excluded.cosmetic_slot,bloom_required=excluded.bloom_required,metadata=excluded.metadata;