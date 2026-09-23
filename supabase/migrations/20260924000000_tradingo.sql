-- Tradingo on a shared Supabase project.
--
-- Everything Tradingo needs lives in tables and functions whose names start with "tradingo_".
-- It does NOT touch auth.users, the project's auth settings, or any table of other apps:
-- Tradingo accounts (mobile + password, no SMS code for now) are kept in tradingo_accounts,
-- and the app talks to the database only through the tradingo_* functions below.
--
-- Run once in Supabase → SQL Editor. Safe to run again. Remove everything with
-- supabase/tradingo_uninstall.sql.

create extension if not exists pgcrypto with schema extensions;

-- Accounts: mobile number and a bcrypt password hash.
create table if not exists public.tradingo_accounts (
  id uuid primary key default gen_random_uuid(),
  mobile text not null unique check (mobile ~ '^09[0-9]{9}$'),
  password_hash text not null,
  name text not null check (char_length(name) between 1 and 20),
  created_at timestamptz not null default now(),
  failed_logins integer not null default 0,
  locked_until timestamptz
);

-- Sign-in sessions; only a SHA-256 of each token is stored.
create table if not exists public.tradingo_sessions (
  token_hash text primary key,
  account_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists tradingo_sessions_account on public.tradingo_sessions (account_id);

-- The learner's whole progress snapshot, synced from the app.
create table if not exists public.tradingo_progress (
  account_id uuid primary key references public.tradingo_accounts (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- XP per league week (weeks start on Saturday) for the leaderboard.
create table if not exists public.tradingo_weekly_xp (
  account_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  week text not null check (week ~ '^\d{4}-\d{2}-\d{2}$'),
  league smallint not null default 0 check (league between 0 and 4),
  name text not null,
  xp integer not null default 0 check (xp between 0 and 50000),
  updated_at timestamptz not null default now(),
  primary key (account_id, week)
);
create index if not exists tradingo_weekly_board on public.tradingo_weekly_xp (week, league, xp desc);

-- RLS on and no policies: the tables can't be read or written through the API directly,
-- only through the security-definer functions below.
alter table public.tradingo_accounts enable row level security;
alter table public.tradingo_sessions enable row level security;
alter table public.tradingo_progress enable row level security;
alter table public.tradingo_weekly_xp enable row level security;
revoke all on public.tradingo_accounts, public.tradingo_sessions, public.tradingo_progress, public.tradingo_weekly_xp from anon, authenticated;

-- Internal: the account behind a session token, or an 'invalid_session' error.
create or replace function public.tradingo_session_account(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
begin
  update public.tradingo_sessions
     set last_used_at = now()
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and last_used_at > now() - interval '90 days'
  returning account_id into v_account;
  if v_account is null then
    raise exception 'invalid_session';
  end if;
  return v_account;
end;
$$;

-- Internal: a new random session token for an account.
create or replace function public.tradingo_new_session(p_account uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into public.tradingo_sessions (token_hash, account_id)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_account);
  return v_token;
end;
$$;

-- Lets the app check that this migration is installed.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 1 $$;

-- Sign-up with mobile + password. Returns {token, name} or {error}.
create or replace function public.tradingo_sign_up(p_mobile text, p_password text, p_name text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if coalesce(p_mobile, '') !~ '^09[0-9]{9}$' then
    return json_build_object('error', 'invalid_mobile');
  end if;
  if char_length(coalesce(p_password, '')) not between 6 and 72 then
    return json_build_object('error', 'weak_password');
  end if;
  if char_length(v_name) not between 1 and 20 then
    return json_build_object('error', 'invalid_name');
  end if;
  -- A simple brake on scripted sign-ups.
  if (select count(*) from public.tradingo_accounts where created_at > now() - interval '1 minute') >= 30 then
    return json_build_object('error', 'rate_limited');
  end if;
  insert into public.tradingo_accounts (mobile, password_hash, name)
  values (p_mobile, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), v_name)
  on conflict (mobile) do nothing
  returning id into v_id;
  if v_id is null then
    return json_build_object('error', 'mobile_taken');
  end if;
  return json_build_object('token', public.tradingo_new_session(v_id), 'name', v_name);
end;
$$;

-- Sign-in. Eight wrong passwords lock the account for 15 minutes. Returns {token, name} or {error}.
create or replace function public.tradingo_sign_in(p_mobile text, p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.tradingo_accounts;
begin
  select * into v_account from public.tradingo_accounts where mobile = coalesce(p_mobile, '');
  if v_account.id is null then
    return json_build_object('error', 'invalid_credentials');
  end if;
  if v_account.locked_until is not null and v_account.locked_until > now() then
    return json_build_object('error', 'locked');
  end if;
  if v_account.password_hash <> extensions.crypt(coalesce(p_password, ''), v_account.password_hash) then
    update public.tradingo_accounts
       set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= 8 then now() + interval '15 minutes' else null end
     where id = v_account.id;
    return json_build_object('error', 'invalid_credentials');
  end if;
  update public.tradingo_accounts set failed_logins = 0, locked_until = null where id = v_account.id;
  return json_build_object('token', public.tradingo_new_session(v_account.id), 'name', v_account.name);
end;
$$;

create or replace function public.tradingo_sign_out(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tradingo_sessions where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- The account's name and saved progress.
create or replace function public.tradingo_load(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_result json;
begin
  select json_build_object('name', a.name, 'mobile', a.mobile, 'state', p.state, 'updated_at', p.updated_at)
    into v_result
    from public.tradingo_accounts a
    left join public.tradingo_progress p on p.account_id = a.id
   where a.id = v_account;
  return v_result;
end;
$$;

-- Saves the progress snapshot and this week's XP (which can only grow within a week).
create or replace function public.tradingo_save(p_token text, p_state jsonb, p_week text, p_weekly_xp integer, p_league integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' or pg_column_size(p_state) > 400000 then
    raise exception 'invalid_state';
  end if;
  insert into public.tradingo_progress (account_id, state)
  values (v_account, p_state)
  on conflict (account_id) do update set state = excluded.state, updated_at = now();

  if coalesce(p_weekly_xp, 0) > 0 and coalesce(p_week, '') ~ '^\d{4}-\d{2}-\d{2}$' then
    insert into public.tradingo_weekly_xp (account_id, week, league, name, xp)
    select v_account, p_week, least(greatest(coalesce(p_league, 0), 0), 4), a.name, least(p_weekly_xp, 50000)
      from public.tradingo_accounts a
     where a.id = v_account
    on conflict (account_id, week) do update
      set xp = greatest(public.tradingo_weekly_xp.xp, excluded.xp),
          league = excluded.league,
          name = excluded.name,
          updated_at = now();
  end if;
end;
$$;

create or replace function public.tradingo_set_name(p_token text, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) not between 1 and 20 then
    raise exception 'invalid_name';
  end if;
  update public.tradingo_accounts set name = v_name where id = v_account;
  update public.tradingo_weekly_xp set name = v_name where account_id = v_account;
end;
$$;

-- Other players in the same league this week, best first.
create or replace function public.tradingo_league(p_token text, p_week text, p_league integer)
returns table (player_name text, weekly_xp integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  return query
    select w.name, w.xp
      from public.tradingo_weekly_xp w
     where w.week = p_week
       and w.league = p_league
       and w.account_id <> v_account
     order by w.xp desc
     limit 14;
end;
$$;

-- Only the public entry points can be called from the app.
revoke all on function public.tradingo_session_account(text) from public, anon, authenticated;
revoke all on function public.tradingo_new_session(uuid) from public, anon, authenticated;
grant execute on function public.tradingo_version() to anon, authenticated;
grant execute on function public.tradingo_sign_up(text, text, text) to anon, authenticated;
grant execute on function public.tradingo_sign_in(text, text) to anon, authenticated;
grant execute on function public.tradingo_sign_out(text) to anon, authenticated;
grant execute on function public.tradingo_load(text) to anon, authenticated;
grant execute on function public.tradingo_save(text, jsonb, text, integer, integer) to anon, authenticated;
grant execute on function public.tradingo_set_name(text, text) to anon, authenticated;
grant execute on function public.tradingo_league(text, text, integer) to anon, authenticated;

-- Make the new functions visible to the API right away.
notify pgrst, 'reload schema';
