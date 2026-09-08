-- Hanami Boutique ornate + Halloween preview collections.
-- New products are published for visual browsing with pricing_state='tbd'.
-- The owner must set a real Petal price before purchase becomes possible.

alter table public.boutique_items add column if not exists is_animated boolean not null default false;
alter table public.boutique_items add column if not exists pricing_state text not null default 'priced';

alter table public.boutique_items drop constraint if exists boutique_items_price_petals_check;
alter table public.boutique_items drop constraint if exists boutique_items_price_state_check;
alter table public.boutique_items add constraint boutique_items_price_state_check
  check ((pricing_state='priced' and price_petals>0) or (pricing_state='tbd' and price_petals=0));

alter table public.boutique_items drop constraint if exists boutique_items_pricing_state_check;
alter table public.boutique_items add constraint boutique_items_pricing_state_check
  check (pricing_state in ('priced','tbd'));

update public.boutique_items
set is_animated=true
where name in (
 'Petal Drift','Petal Shower','Sakura Drift Halo','Star Spark','Starlight Trail','Starlight Sprites',
 'Bubble Pop','Firefly Drift','Arcade Bloom','Midnight Shrine','Aurora Mist','Moonlit Koi Orbit',
 'Crystal Bloom Frame','Gilded Moon Frame','Aurora Wing Frame'
);

insert into public.boutique_items
(slug,name,description,item_type,collection_name,season,rarity,price_petals,state,featured,is_new,preview_token,is_animated,pricing_state)
values
-- Azure Dragon Court
('azure-dragon-frame','Azure Dragon Frame','A sapphire dragon coils around an ornate silver portrait ring, lit by cold blue flame.','frame','Azure Dragon Court','permanent','legendary',0,'published',true,true,'ornate:azure-dragon',true,'tbd'),
('azure-dragon-nameplate','Azure Dragon Nameplate','A deep-blue silver-trimmed nameplate guarded by mirrored dragon flourishes.','nameplate','Azure Dragon Court','permanent','rare',0,'published',true,true,'ornate:azure-dragon',false,'tbd'),
('azure-dragon-flame','Azure Dragon Flame','Blue spirit-fire and icy sparks curl around the profile presentation.','effect','Azure Dragon Court','permanent','legendary',0,'published',true,true,'ornate:azure-dragon',true,'tbd'),
-- Gilded Dragon Court
('gilded-dragon-frame','Gilded Dragon Frame','A radiant gold dragon wraps around a black-and-gold court frame.','frame','Gilded Dragon Court','permanent','legendary',0,'published',true,true,'ornate:gilded-dragon',true,'tbd'),
('gilded-dragon-nameplate','Gilded Dragon Nameplate','A moon-crested gold nameplate with curling dragon filigree.','nameplate','Gilded Dragon Court','permanent','rare',0,'published',true,true,'ornate:gilded-dragon',false,'tbd'),
('golden-breath','Golden Breath','Warm golden dragon-fire circles the profile with drifting embers.','effect','Gilded Dragon Court','permanent','legendary',0,'published',true,true,'ornate:gilded-dragon',true,'tbd'),
-- Ink Dragon Garden
('ink-dragon-frame','Ink Dragon Frame','A sumi-ink dragon forms a dramatic monochrome ring with crimson flower accents.','frame','Ink Dragon Garden','permanent','legendary',0,'published',false,true,'ornate:ink-dragon',false,'tbd'),
('ink-dragon-nameplate','Ink Dragon Nameplate','An ivory plaque held by black brushwork dragons and red blossoms.','nameplate','Ink Dragon Garden','permanent','rare',0,'published',false,true,'ornate:ink-dragon',false,'tbd'),
('sumi-ember','Sumi Ember','Ink wisps, red petals, and moonlit smoke gather behind the profile.','effect','Ink Dragon Garden','permanent','rare',0,'published',false,true,'ornate:ink-dragon',true,'tbd'),
-- Celestial Crown
('celestial-crown-frame','Celestial Crown Frame','Pearl-white wings, a crystal crown, and hanging gems surround the portrait.','frame','Celestial Crown','permanent','legendary',0,'published',true,true,'ornate:celestial-crown',true,'tbd'),
('celestial-crown-nameplate','Celestial Crown Nameplate','A winged royal nameplate with icy crystal drops.','nameplate','Celestial Crown','permanent','rare',0,'published',true,true,'ornate:celestial-crown',false,'tbd'),
('halo-waltz','Halo Waltz','Feather-light crystal rings rotate through a pale celestial glow.','effect','Celestial Crown','permanent','legendary',0,'published',true,true,'ornate:celestial-crown',true,'tbd'),
-- Frost Feather
('frost-feather-frame','Frost Feather Frame','Blue-white feathers and icy florals make a delicate winter portrait wreath.','frame','Frost Feather','permanent','rare',0,'published',false,true,'ornate:frost-feather',false,'tbd'),
('frost-feather-nameplate','Frost Feather Nameplate','A frosted floral plaque with hanging crystal droplets.','nameplate','Frost Feather','permanent','rare',0,'published',false,true,'ornate:frost-feather',false,'tbd'),
('frostwing-aura','Frostwing Aura','Luminous feathers orbit through a soft blue frost haze.','effect','Frost Feather','permanent','legendary',0,'published',false,true,'ornate:frost-feather',true,'tbd'),
-- Roseglass Heart
('roseglass-heart-frame','Roseglass Heart Frame','A jeweled pink heart frame wrapped in sheer ribbon and pearl light.','frame','Roseglass Heart','permanent','legendary',0,'published',true,true,'ornate:roseglass-heart',true,'tbd'),
('roseglass-heart-nameplate','Roseglass Heart Nameplate','A rose-gold heart plaque with floating ribbon tails.','nameplate','Roseglass Heart','permanent','rare',0,'published',true,true,'ornate:roseglass-heart',false,'tbd'),
('roselight-veil','Roselight Veil','Pink glass light, butterflies, and ribbon swirls shimmer across the profile.','effect','Roseglass Heart','permanent','legendary',0,'published',true,true,'ornate:roseglass-heart',true,'tbd'),
-- Prism Feather
('prism-feather-frame','Prism Feather Frame','Pastel iridescent feathers and crystal stars ring the avatar.','frame','Prism Feather','permanent','legendary',0,'published',false,true,'ornate:prism-feather',true,'tbd'),
('prism-feather-nameplate','Prism Feather Nameplate','A dreamy lavender star plaque with small wing accents.','nameplate','Prism Feather','permanent','rare',0,'published',false,true,'ornate:prism-feather',false,'tbd'),
('prism-feather-drift','Prism Feather Drift','Rainbow feathers and star shards drift slowly through the profile.','effect','Prism Feather','permanent','legendary',0,'published',false,true,'ornate:prism-feather',true,'tbd'),
-- Crystal Wing
('crystal-wing-frame','Crystal Wing Frame','Large pearl-blue wings, bows, chains, and suspended crystals form an angelic frame.','frame','Crystal Wing','permanent','legendary',0,'published',true,true,'ornate:crystal-wing',true,'tbd'),
('crystal-wing-nameplate','Crystal Wing Nameplate','A royal blue crystal nameplate with chains and winged corners.','nameplate','Crystal Wing','permanent','rare',0,'published',true,true,'ornate:crystal-wing',false,'tbd'),
('crystal-wing-radiance','Crystal Wing Radiance','A rotating ring of crystal light blooms behind the profile.','effect','Crystal Wing','permanent','legendary',0,'published',true,true,'ornate:crystal-wing',true,'tbd'),
-- Moonlit Lace
('moonlit-lace-frame','Moonlit Lace Frame','Midnight violet flowers, crescents, butterflies, and pearls encircle the portrait.','frame','Moonlit Lace','permanent','legendary',0,'published',false,true,'ornate:moonlit-lace',true,'tbd'),
('moonlit-lace-nameplate','Moonlit Lace Nameplate','A dark lavender moon-and-butterfly plaque with hanging crystals.','nameplate','Moonlit Lace','permanent','rare',0,'published',false,true,'ornate:moonlit-lace',false,'tbd'),
('moon-butterfly-glow','Moon Butterfly Glow','Lavender butterflies circle a moonlit aura with tiny hanging lights.','effect','Moonlit Lace','permanent','legendary',0,'published',false,true,'ornate:moonlit-lace',true,'tbd'),
-- Sakura Seraph
('sakura-seraph-frame','Sakura Seraph Frame','Pearl-pink wings and crystal sakura ornaments create a soft angelic halo.','frame','Sakura Seraph','permanent','legendary',0,'published',true,true,'ornate:sakura-seraph',true,'tbd'),
('sakura-seraph-nameplate','Sakura Seraph Nameplate','A blossom-crowned pink-gold plate with winged crystal details.','nameplate','Sakura Seraph','permanent','rare',0,'published',true,true,'ornate:sakura-seraph',false,'tbd'),
('petal-seraph-aura','Petal Seraph Aura','Glowing pink feathers and sakura petals spiral around the profile.','effect','Sakura Seraph','permanent','legendary',0,'published',true,true,'ornate:sakura-seraph',true,'tbd'),

-- Halloween 2006: Witching Hour
('witching-hour-frame','Witching Hour Frame','Black lace, violet stars, tiny spell charms, and a crescent crown for Halloween nights.','frame','Witching Hour','fall','legendary',0,'published',true,true,'halloween:witching-hour',true,'tbd'),
('witching-hour-nameplate','Witching Hour Nameplate','A velvet-purple plaque with silver moons, charms, and pointed gothic corners.','nameplate','Witching Hour','fall','rare',0,'published',true,true,'halloween:witching-hour',false,'tbd'),
('witchlight-mist','Witchlight Mist','Purple spell-light, floating stars, and smoky wisps move behind the profile.','effect','Witching Hour','fall','legendary',0,'published',true,true,'halloween:witching-hour',true,'tbd'),
-- Ghostlight Garden
('ghostlight-frame','Ghostlight Frame','Pale spectral flowers and tiny friendly ghosts float around an antique silver frame.','frame','Ghostlight Garden','fall','rare',0,'published',true,true,'halloween:ghostlight',true,'tbd'),
('ghostlight-nameplate','Ghostlight Nameplate','A misty silver garden plaque with ghost-lantern ornaments.','nameplate','Ghostlight Garden','fall','rare',0,'published',true,true,'halloween:ghostlight',false,'tbd'),
('ghostlight-drift','Ghostlight Drift','Soft blue-green ghost lights wander through floating autumn mist.','effect','Ghostlight Garden','fall','legendary',0,'published',true,true,'halloween:ghostlight',true,'tbd'),
-- Pumpkin Moon
('pumpkin-moon-frame','Pumpkin Moon Frame','A warm orange moon, tiny pumpkins, curling vines, and gold stars surround the portrait.','frame','Pumpkin Moon','fall','rare',0,'published',true,true,'halloween:pumpkin-moon',true,'tbd'),
('pumpkin-moon-nameplate','Pumpkin Moon Nameplate','A moonlit pumpkin plaque trimmed in gold vines and candlelight.','nameplate','Pumpkin Moon','fall','rare',0,'published',true,true,'halloween:pumpkin-moon',false,'tbd'),
('lantern-orbit','Lantern Orbit','Mini jack-o-lantern lights and warm sparks orbit the profile.','effect','Pumpkin Moon','fall','legendary',0,'published',true,true,'halloween:pumpkin-moon',true,'tbd'),
-- Velvet Bat
('velvet-bat-frame','Velvet Bat Frame','Deep plum velvet, jeweled bat wings, black roses, and silver chains.','frame','Velvet Bat','fall','legendary',0,'published',true,true,'halloween:velvet-bat',true,'tbd'),
('velvet-bat-nameplate','Velvet Bat Nameplate','A black-and-plum batwing plate with a ruby heart gem.','nameplate','Velvet Bat','fall','rare',0,'published',true,true,'halloween:velvet-bat',false,'tbd'),
('batwing-spark','Batwing Spark','Tiny bat silhouettes sweep through violet sparkles and soft red light.','effect','Velvet Bat','fall','legendary',0,'published',true,true,'halloween:velvet-bat',true,'tbd'),
-- Crimson Familiar
('crimson-familiar-frame','Crimson Familiar Frame','A black-cat familiar, crimson ribbons, thorny roses, and moon charms decorate the portrait.','frame','Crimson Familiar','fall','legendary',0,'published',true,true,'halloween:crimson-familiar',true,'tbd'),
('crimson-familiar-nameplate','Crimson Familiar Nameplate','A dark school-gothic plaque with cat ears, roses, and a red moon charm.','nameplate','Crimson Familiar','fall','rare',0,'published',true,true,'halloween:crimson-familiar',false,'tbd'),
('familiar-ember','Familiar Ember','Crimson embers, black-cat paw sparks, and rose petals flicker behind the profile.','effect','Crimson Familiar','fall','legendary',0,'published',true,true,'halloween:crimson-familiar',true,'tbd')
on conflict (slug) do update set
 name=excluded.name,description=excluded.description,item_type=excluded.item_type,
 collection_name=excluded.collection_name,season=excluded.season,rarity=excluded.rarity,
 price_petals=excluded.price_petals,state=excluded.state,featured=excluded.featured,is_new=excluded.is_new,
 preview_token=excluded.preview_token,is_animated=excluded.is_animated,pricing_state=excluded.pricing_state,
 updated_at=now();

create or replace function private.purchase_boutique_item_impl(p_item_id uuid,p_request_id uuid)
returns table(balance integer,item_id uuid,quantity integer)
language plpgsql security definer set search_path=''
as $$
declare
 v_account uuid:=auth.uid(); v_character uuid; v_item public.boutique_items%rowtype;
 v_existing integer; v_now timestamptz:=now(); v_start timestamptz; v_end timestamptz; v_posted boolean;
begin
 if v_account is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select a.active_character_id into v_character from public.accounts a where a.id=v_account;
 if v_character is null then raise exception 'Select an active character first' using errcode='P0001'; end if;
 select b.* into v_item from public.boutique_items b where b.id=p_item_id and b.state='published';
 if not found then raise exception 'Boutique item is unavailable' using errcode='P0002'; end if;
 if v_item.pricing_state<>'priced' or v_item.price_petals<=0 then raise exception 'This Boutique item is preview-only until the owner sets its Petal price' using errcode='P0001'; end if;
 select i.quantity into v_existing from public.inventory_items i where i.account_id=v_account and i.item_id=p_item_id;
 if v_existing is not null and v_item.item_type<>'hanami_plus_pass' then raise exception 'Item already owned' using errcode='P0001'; end if;
 v_posted:=private.post_petal_entry(v_account,v_character,-v_item.price_petals,'purchase','Purchased '||v_item.name,'purchase:'||p_request_id::text,v_character,jsonb_build_object('item_id',p_item_id::text,'item_slug',v_item.slug));
 if not v_posted then return query select w.balance,p_item_id,coalesce(i.quantity,0) from public.petal_wallets w left join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id where w.account_id=v_account; return; end if;
 insert into public.inventory_items(account_id,item_id,quantity) values(v_account,p_item_id,1)
 on conflict on constraint inventory_items_pkey do update set quantity=public.inventory_items.quantity+1,updated_at=now();
 if v_item.item_type='hanami_plus_pass' then
  select greatest(v_now,coalesce(e.ends_at,v_now)) into v_start from public.hanami_plus_entitlements e where e.account_id=v_account;
  v_start:=coalesce(v_start,v_now); v_end:=v_start+make_interval(days=>v_item.pass_days);
  insert into public.hanami_plus_entitlements(account_id,starts_at,ends_at,source_item_id) values(v_account,v_now,v_end,p_item_id)
  on conflict(account_id) do update set ends_at=v_end,source_item_id=p_item_id,updated_at=now();
 end if;
 return query select w.balance,p_item_id,i.quantity from public.petal_wallets w join public.inventory_items i on i.account_id=w.account_id and i.item_id=p_item_id where w.account_id=v_account;
end $$;
