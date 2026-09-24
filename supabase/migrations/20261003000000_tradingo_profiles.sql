-- Chartoon profiles: every account gets a unique @ID (so two people with the same name can be
-- told apart) and a profile picture chosen from the app's drawn set, and anyone can open a
-- learner's public profile from the chat: name, @ID, picture, when they joined and their
-- learning (XP, streak, finished lessons and courses). Simulator trades and the login stay private.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs 20261002000000_tradingo_email_login.sql first. Safe to run again.

alter table public.tradingo_accounts
  add column if not exists username text,
  add column if not exists avatar smallint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tradingo_accounts_username_check') then
    alter table public.tradingo_accounts add constraint tradingo_accounts_username_check check (username ~ '^[a-z][a-z0-9_]{2,19}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tradingo_accounts_avatar_check') then
    -- 0 is the first letter of the name; 1 to 40 are the drawn pictures (the app has 20 so far).
    alter table public.tradingo_accounts add constraint tradingo_accounts_avatar_check check (avatar between 0 and 40);
  end if;
end;
$$;
create unique index if not exists tradingo_accounts_username on public.tradingo_accounts (username);

-- Internal: a free @ID like trader48213, for new accounts until they pick their own.
create or replace function public.tradingo_new_username()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  loop
    v_name := 'trader' || (10000 + floor(random() * 90000))::int;
    exit when not exists (select 1 from public.tradingo_accounts where username = v_name);
  end loop;
  return v_name;
end;
$$;

-- Every new account gets an @ID, whichever function made it.
create or replace function public.tradingo_accounts_username_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is null then
    new.username := public.tradingo_new_username();
  end if;
  return new;
end;
$$;

drop trigger if exists tradingo_accounts_username_fill on public.tradingo_accounts;
create trigger tradingo_accounts_username_fill
  before insert on public.tradingo_accounts
  for each row execute function public.tradingo_accounts_username_fill();

-- Accounts made before this migration get one too.
update public.tradingo_accounts set username = public.tradingo_new_username() where username is null;
alter table public.tradingo_accounts alter column username set not null;

-- Changes the signed-in account's @ID and picture. The @ID is 3 to 20 English letters, digits or _,
-- starting with a letter; names that look official are kept back. Returns {username, avatar} or {error}.
create or replace function public.tradingo_set_profile(p_token text, p_username text, p_avatar integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_username text := lower(ltrim(btrim(coalesce(p_username, '')), '@'));
  v_row public.tradingo_accounts;
begin
  if v_username !~ '^[a-z][a-z0-9_]{2,19}$' then
    return json_build_object('error', 'invalid_username');
  end if;
  if coalesce(p_avatar, -1) not between 0 and 40 then
    return json_build_object('error', 'invalid_avatar');
  end if;
  if v_username ~ '(admin|chartoon|support|moderat|official|shamak|system)'
     and v_username is distinct from (select username from public.tradingo_accounts where id = v_account) then
    return json_build_object('error', 'username_reserved');
  end if;
  begin
    update public.tradingo_accounts set username = v_username, avatar = p_avatar where id = v_account returning * into v_row;
  exception when unique_violation then
    return json_build_object('error', 'username_taken');
  end;
  return json_build_object('username', v_row.username, 'avatar', v_row.avatar);
end;
$$;

-- The signed-in account's standing, now with its @ID and picture. Otherwise the same as in
-- 20261002000000_tradingo_email_login.sql.
create or replace function public.tradingo_account_status(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  perform public.tradingo_owner_check(v_account);
  return (
    select json_build_object(
      'admin', a.role = 'admin',
      'muted', coalesce(a.muted_until > now(), false),
      'muted_until', case when a.muted_until > now() and a.muted_until <> 'infinity' then a.muted_until end,
      'username', a.username,
      'avatar', a.avatar
    )
    from public.tradingo_accounts a where a.id = v_account
  );
end;
$$;

-- A learner's public profile by @ID, for anyone using the app (signed in or not). Banned
-- accounts don't have one. Progress comes from the synced snapshot; the app checks its shape.
create or replace function public.tradingo_profile(p_token text, p_username text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := public.tradingo_session_account_or_null(p_token);
  v_result json;
begin
  select json_build_object(
    'name', a.name,
    'username', a.username,
    'avatar', a.avatar,
    'created_at', a.created_at,
    'mine', v_viewer is not null and a.id = v_viewer,
    'xp', p.state -> 'xp',
    'streak', p.state -> 'streak',
    'best_streak', p.state -> 'bestStreak',
    'last_active', p.state -> 'lastActiveDay',
    'league', p.state -> 'league',
    'enrolled', p.state -> 'enrolled',
    'mastered', p.state -> 'mastered',
    'completed', case when jsonb_typeof(p.state -> 'completed') = 'object'
                      then (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(p.state -> 'completed') k)
                      else '[]'::jsonb end,
    'duel_wins', p.state #> '{duels,wins}',
    'messages', (select count(*) from public.tradingo_messages m where m.account_id = a.id and not m.hidden)
  )
    into v_result
    from public.tradingo_accounts a
    left join public.tradingo_progress p on p.account_id = a.id
   where a.username = lower(ltrim(btrim(coalesce(p_username, '')), '@'))
     and a.banned_at is null;
  return coalesce(v_result, json_build_object('error', 'not_found'));
end;
$$;

-- A room's messages, now with each author's @ID and picture (as they are now, not when the
-- message was sent). Otherwise the same as in 20260930000000_tradingo_admin.sql.
create or replace function public.tradingo_chat_messages(p_token text, p_room uuid, p_before bigint, p_after bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account_or_null(p_token);
  v_admin boolean := exists (select 1 from public.tradingo_accounts where id = v_account and role = 'admin' and banned_at is null);
  v_rows json;
  v_max bigint;
begin
  select json_agg(t order by t.id), max(t.id) into v_rows, v_max
  from (
    select x.id, x.author_name, x.body, x.kind, x.chart, x.created_at,
           (v_account is not null and x.account_id = v_account) as mine,
           case when v_admin then x.account_id end as author_id,
           a.username as author_username,
           a.avatar as author_avatar
      from public.tradingo_messages x
      left join public.tradingo_accounts a on a.id = x.account_id
     where x.room_id = p_room
       and not x.hidden
       and (p_after is null or x.id > p_after)
       and (p_before is null or x.id < p_before)
     order by case when p_after is null then -x.id else x.id end
     limit case when p_after is null then 50 else 100 end
  ) t;
  if v_account is not null and v_max is not null then
    update public.tradingo_room_members
       set last_read_id = greatest(last_read_id, v_max)
     where room_id = p_room and account_id = v_account;
  end if;
  return coalesce(v_rows, '[]'::json);
end;
$$;

-- Profiles are installed: the app checks for version 9.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 9 $$;

revoke all on function public.tradingo_new_username() from public, anon, authenticated;
revoke all on function public.tradingo_accounts_username_fill() from public, anon, authenticated;
revoke all on function public.tradingo_set_profile(text, text, integer) from public, authenticated;
revoke all on function public.tradingo_account_status(text) from public, authenticated;
revoke all on function public.tradingo_profile(text, text) from public, authenticated;
revoke all on function public.tradingo_chat_messages(text, uuid, bigint, bigint) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_set_profile(text, text, integer) to anon;
grant execute on function public.tradingo_account_status(text) to anon;
grant execute on function public.tradingo_profile(text, text) to anon;
grant execute on function public.tradingo_chat_messages(text, uuid, bigint, bigint) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
