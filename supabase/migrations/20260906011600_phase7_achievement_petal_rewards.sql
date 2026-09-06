create unique index if not exists petal_transactions_achievement_once_idx
on public.petal_transactions(user_id, source_type, source_id)
where source_type = 'achievement' and source_id is not null;

create or replace function private.credit_achievement_petals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward_amount integer;
  owner_id uuid;
  inserted_transaction uuid;
begin
  select a.token_reward
    into reward_amount
    from public.achievement_definitions a
   where a.id = new.achievement_id
     and a.active;

  if coalesce(reward_amount, 0) <= 0 then
    return new;
  end if;

  select c.owner_user_id
    into owner_id
    from public.characters c
   where c.id = new.character_id;

  if owner_id is null then
    return new;
  end if;

  insert into public.petal_transactions(user_id, amount, reason, source_type, source_id)
  values (owner_id, reward_amount, 'Achievement reward', 'achievement', new.id)
  on conflict (user_id, source_type, source_id) where source_type = 'achievement' and source_id is not null
  do nothing
  returning id into inserted_transaction;

  if inserted_transaction is null then
    return new;
  end if;

  insert into public.petal_wallets(user_id, balance, lifetime_earned, updated_at)
  values (owner_id, reward_amount, reward_amount, now())
  on conflict (user_id) do update
    set balance = public.petal_wallets.balance + excluded.balance,
        lifetime_earned = public.petal_wallets.lifetime_earned + excluded.lifetime_earned,
        updated_at = now();

  return new;
end;
$$;

revoke all on function private.credit_achievement_petals() from public, anon, authenticated;

drop trigger if exists credit_achievement_petals_after_award on public.character_achievements;
create trigger credit_achievement_petals_after_award
after insert on public.character_achievements
for each row execute function private.credit_achievement_petals();
