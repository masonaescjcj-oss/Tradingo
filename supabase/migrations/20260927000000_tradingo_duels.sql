-- Tradingo friend duels: whoever starts a duel plays it first and saves the rounds (questions
-- and candles) with their result under a six-character code; one friend opens the code, plays
-- the same rounds, and both results are shown to both of them.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs 20260924000000_tradingo.sql and 20260925000000_tradingo_chat.sql first. Safe to run again.

create table if not exists public.tradingo_duels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  creator_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  creator_name text not null,
  opponent_id uuid references public.tradingo_accounts (id) on delete set null,
  opponent_name text,
  rounds jsonb not null check (jsonb_typeof(rounds) = 'object' and octet_length(rounds::text) <= 24000),
  creator_result jsonb not null,
  opponent_result jsonb,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists tradingo_duels_creator on public.tradingo_duels (creator_id, created_at desc);
create index if not exists tradingo_duels_opponent on public.tradingo_duels (opponent_id, created_at desc);

alter table public.tradingo_duels enable row level security;
revoke all on public.tradingo_duels from anon, authenticated;

-- Internal: a player's scores, within the bounds the app can produce.
create or replace function public.tradingo_duel_result_ok(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 1000 then
    return false;
  end if;
  if jsonb_typeof(p #> '{quiz,correct}') is distinct from 'number' or jsonb_typeof(p #> '{quiz,points}') is distinct from 'number'
     or jsonb_typeof(p #> '{chart,points}') is distinct from 'number' or jsonb_typeof(p #> '{chart,guess}') is distinct from 'number'
     or jsonb_typeof(p #> '{trade,pnl}') is distinct from 'number' or jsonb_typeof(p #> '{trade,trades}') is distinct from 'number' then
    return false;
  end if;
  return coalesce(
    (p #>> '{quiz,correct}')::numeric between 0 and 5
    and (p #>> '{quiz,points}')::numeric between 0 and 800
    and (p #>> '{chart,points}')::numeric between 0 and 100
    and (p #>> '{trade,pnl}')::numeric between -1000000 and 1000000
    and (p #>> '{trade,trades}')::numeric between 0 and 40,
    false
  );
exception when others then
  return false;
end;
$$;

-- Internal: the shape of a duel's rounds (five questions at most, 65 chart and 80 trade candles).
create or replace function public.tradingo_duel_rounds_ok(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 24000 then
    return false;
  end if;
  if jsonb_typeof(p -> 'v') is distinct from 'number' or (p ->> 'v')::int is distinct from 1 then
    return false;
  end if;
  if jsonb_typeof(p -> 'quiz') is distinct from 'array' or jsonb_array_length(p -> 'quiz') not between 1 and 5 then
    return false;
  end if;
  if jsonb_typeof(p #> '{chart,candles}') is distinct from 'array' or jsonb_array_length(p #> '{chart,candles}') is distinct from 65 then
    return false;
  end if;
  if jsonb_typeof(p #> '{trade,candles}') is distinct from 'array' or jsonb_array_length(p #> '{trade,candles}') is distinct from 80 then
    return false;
  end if;
  return true;
exception when others then
  return false;
end;
$$;

-- Starts a duel with the creator's rounds and result; returns its code.
create or replace function public.tradingo_duel_create(p_token text, p_rounds jsonb, p_result jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_name text;
  v_code text;
  v_tries integer := 0;
begin
  if public.tradingo_duel_rounds_ok(p_rounds) is not true or public.tradingo_duel_result_ok(p_result) is not true then
    return json_build_object('error', 'invalid');
  end if;
  if (select count(*) from public.tradingo_duels where creator_id = v_account and created_at > now() - interval '1 day') >= 30 then
    return json_build_object('error', 'rate');
  end if;
  select name into v_name from public.tradingo_accounts where id = v_account;
  -- Old duels are only history; keep the table small.
  delete from public.tradingo_duels where creator_id = v_account and created_at < now() - interval '90 days';
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into v_code
      from generate_series(1, 6);
    begin
      insert into public.tradingo_duels (code, creator_id, creator_name, rounds, creator_result)
      values (v_code, v_account, v_name, p_rounds, p_result);
      return json_build_object('code', v_code);
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

-- A duel by code, as the caller may see it: anyone can open an open duel to play it; the
-- creator's scores stay hidden from the friend until they've played; both see everything after.
create or replace function public.tradingo_duel_get(p_token text, p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account_or_null(p_token);
  d public.tradingo_duels;
  v_role text;
  v_status text;
begin
  select * into d from public.tradingo_duels where code = upper(coalesce(p_code, ''));
  if not found then
    return json_build_object('error', 'not_found');
  end if;
  v_role := case
    when v_account is null then null
    when d.creator_id = v_account then 'creator'
    when d.opponent_id = v_account then 'opponent'
  end;
  v_status := case when d.status = 'open' and d.created_at < now() - interval '7 days' then 'expired' else d.status end;
  return json_build_object(
    'code', d.code,
    'status', v_status,
    'role', v_role,
    'creator_name', d.creator_name,
    'opponent_name', d.opponent_name,
    'rounds', case when v_role is not null or v_status = 'open' then d.rounds end,
    'creator_result', case when v_role = 'creator' or (v_role = 'opponent' and d.status = 'done') then d.creator_result end,
    'opponent_result', case when v_role is not null and d.status = 'done' then d.opponent_result end
  );
end;
$$;

-- The friend's result: takes the duel (only one friend per duel) and returns it finished.
create or replace function public.tradingo_duel_submit(p_token text, p_code text, p_result jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  d public.tradingo_duels;
  v_name text;
begin
  if public.tradingo_duel_result_ok(p_result) is not true then
    return json_build_object('error', 'invalid');
  end if;
  select * into d from public.tradingo_duels where code = upper(coalesce(p_code, '')) for update;
  if not found then
    return json_build_object('error', 'not_found');
  end if;
  if d.creator_id = v_account then
    return json_build_object('error', 'own');
  end if;
  if d.status = 'done' then
    -- Sending the same result again (a retry after a lost answer) just returns the duel.
    if d.opponent_id = v_account then
      return public.tradingo_duel_get(p_token, d.code);
    end if;
    return json_build_object('error', 'taken');
  end if;
  if d.created_at < now() - interval '7 days' then
    return json_build_object('error', 'expired');
  end if;
  select name into v_name from public.tradingo_accounts where id = v_account;
  update public.tradingo_duels
     set opponent_id = v_account, opponent_name = v_name, opponent_result = p_result, status = 'done', finished_at = now()
   where id = d.id;
  return public.tradingo_duel_get(p_token, d.code);
end;
$$;

-- The caller's last 30 duels, as creator or friend, newest first.
create or replace function public.tradingo_duel_list(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  return coalesce((
    select json_agg(x order by x.created_at desc)
    from (
      select
        d.code,
        case when d.status = 'open' and d.created_at < now() - interval '7 days' then 'expired' else d.status end as status,
        case when d.creator_id = v_account then 'creator' else 'opponent' end as role,
        case when d.creator_id = v_account then d.opponent_name else d.creator_name end as other_name,
        case when d.creator_id = v_account then d.creator_result else d.opponent_result end as my_result,
        case when d.status = 'done' then case when d.creator_id = v_account then d.opponent_result else d.creator_result end end as their_result,
        d.created_at
      from public.tradingo_duels d
      where d.creator_id = v_account or d.opponent_id = v_account
      order by d.created_at desc
      limit 30
    ) x
  ), '[]'::json);
end;
$$;

-- Duels are installed: the app checks for version 3.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 3 $$;

revoke all on function public.tradingo_duel_result_ok(jsonb) from public, anon, authenticated;
revoke all on function public.tradingo_duel_rounds_ok(jsonb) from public, anon, authenticated;
revoke all on function public.tradingo_duel_create(text, jsonb, jsonb) from public, authenticated;
revoke all on function public.tradingo_duel_get(text, text) from public, authenticated;
revoke all on function public.tradingo_duel_submit(text, text, jsonb) from public, authenticated;
revoke all on function public.tradingo_duel_list(text) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_duel_create(text, jsonb, jsonb) to anon;
grant execute on function public.tradingo_duel_get(text, text) to anon;
grant execute on function public.tradingo_duel_submit(text, text, jsonb) to anon;
grant execute on function public.tradingo_duel_list(text) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
