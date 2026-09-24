-- Chartoon sign-in with an email (the app's default) or an Iranian mobile number, and the owner's
-- admin login: an email or number put on the server's list becomes an admin when it signs in, with
-- nothing in the app that shows it. This replaces the one-time setup code of version 7.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs 20261001000000_tradingo_admin_rooms.sql first. Safe to run again.
--
-- The owner's login is added on the server (SQL editor) only, never from the app:
--   insert into public.tradingo_admin_logins (login) values ('owner@example.com') on conflict do nothing;
-- An account with that email (or number, as 09XXXXXXXXX) becomes an admin the next time it signs
-- in or syncs. Emails aren't verified yet, so add a login only once its owner has registered it.

-- Accounts: an email, a mobile number, or both; at least one.
alter table public.tradingo_accounts add column if not exists email text;
alter table public.tradingo_accounts alter column mobile drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tradingo_accounts_email_check') then
    alter table public.tradingo_accounts add constraint tradingo_accounts_email_check
      check (email = lower(email) and char_length(email) <= 254 and email ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tradingo_accounts_login_check') then
    alter table public.tradingo_accounts add constraint tradingo_accounts_login_check check (email is not null or mobile is not null);
  end if;
end;
$$;
create unique index if not exists tradingo_accounts_email on public.tradingo_accounts (email);

-- The owner's admin logins (emails in lower case, numbers as 09XXXXXXXXX).
create table if not exists public.tradingo_admin_logins (
  login text primary key check (login = lower(btrim(login)) and (login ~ '^09[0-9]{9}$' or position('@' in login) > 1)),
  created_at timestamptz not null default now()
);
alter table public.tradingo_admin_logins enable row level security;
revoke all on public.tradingo_admin_logins from anon, authenticated;

-- The setup code is gone: its function, any unused code, and its settings key.
drop function if exists public.tradingo_admin_claim(text, text);
delete from public.tradingo_settings where key = 'admin_claim_hash';
alter table public.tradingo_settings drop constraint if exists tradingo_settings_key_check;
alter table public.tradingo_settings add constraint tradingo_settings_key_check
  check (key in ('ai_api_key', 'ai_provider', 'ai_model', 'ai_base_url', 'ai_daily_limit'));

-- Internal: a login as accounts keep it (a lower-case email, or 09XXXXXXXXX), or null when it's neither.
create or replace function public.tradingo_login_norm(p_login text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when v ~ '^09[0-9]{9}$' then v
    when char_length(v) <= 254 and v ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then v
  end
  from (select lower(btrim(coalesce(p_login, ''))) as v) t
$$;

-- Internal: an account whose email or number is on the owner's list becomes an admin (unless banned).
create or replace function public.tradingo_owner_check(p_account uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tradingo_accounts a
     set role = 'admin'
   where a.id = p_account
     and a.role <> 'admin'
     and a.banned_at is null
     and exists (select 1 from public.tradingo_admin_logins l where l.login = a.email or l.login = a.mobile);
  if found then
    perform public.tradingo_admin_note(p_account, 'owner_admin', p_account, null);
  end if;
end;
$$;

-- Sign-up with an email or a mobile number and a password. Returns {token, name} or {error}.
create or replace function public.tradingo_register(p_login text, p_password text, p_name text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_login text := public.tradingo_login_norm(p_login);
  v_email boolean := position('@' in coalesce(v_login, '')) > 0;
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_login is null then
    return json_build_object('error', 'invalid_login');
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
  begin
    insert into public.tradingo_accounts (email, mobile, password_hash, name)
    values (
      case when v_email then v_login end,
      case when v_email then null else v_login end,
      extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      v_name
    )
    returning id into v_id;
  exception when unique_violation then
    return json_build_object('error', case when v_email then 'email_taken' else 'mobile_taken' end);
  end;
  perform public.tradingo_owner_check(v_id);
  return json_build_object('token', public.tradingo_new_session(v_id), 'name', v_name);
end;
$$;

-- Sign-in with an email or a mobile number. Eight wrong passwords lock the account for 15 minutes;
-- banned accounts are refused. Returns {token, name} or {error}.
create or replace function public.tradingo_login(p_login text, p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_login text := public.tradingo_login_norm(p_login);
  v_account public.tradingo_accounts;
begin
  if v_login is null then
    return json_build_object('error', 'invalid_credentials');
  end if;
  select * into v_account from public.tradingo_accounts where email = v_login or mobile = v_login;
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
  -- Only after the password, so a ban doesn't tell strangers the login has an account.
  if v_account.banned_at is not null then
    return json_build_object('error', 'banned');
  end if;
  update public.tradingo_accounts set failed_logins = 0, locked_until = null where id = v_account.id;
  perform public.tradingo_owner_check(v_account.id);
  return json_build_object('token', public.tradingo_new_session(v_account.id), 'name', v_account.name);
end;
$$;

-- The mobile-only sign-up and sign-in that app versions before email use, now the same as above.
create or replace function public.tradingo_sign_up(p_mobile text, p_password text, p_name text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(p_mobile, '') !~ '^09[0-9]{9}$' then
    return json_build_object('error', 'invalid_mobile');
  end if;
  return public.tradingo_register(p_mobile, p_password, p_name);
end;
$$;

create or replace function public.tradingo_sign_in(p_mobile text, p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(p_mobile, '') !~ '^09[0-9]{9}$' then
    return json_build_object('error', 'invalid_credentials');
  end if;
  return public.tradingo_login(p_mobile, p_password);
end;
$$;

-- The signed-in account's standing, after the owner's list (so an owner already signed in becomes
-- an admin on the next sync). Otherwise the same as in 20260930000000_tradingo_admin.sql.
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
      'muted_until', case when a.muted_until > now() and a.muted_until <> 'infinity' then a.muted_until end
    )
    from public.tradingo_accounts a where a.id = v_account
  );
end;
$$;

-- An account as the panel lists it, now with its email. Otherwise the same as in 20260930000000_tradingo_admin.sql.
create or replace function public.tradingo_admin_user_json(p_account uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'id', a.id,
    'name', a.name,
    'email', a.email,
    'mobile', a.mobile,
    'role', a.role,
    'created_at', a.created_at,
    'banned', a.banned_at is not null,
    'banned_at', a.banned_at,
    'ban_reason', a.ban_reason,
    'muted', coalesce(a.muted_until > now(), false),
    'muted_until', case when a.muted_until > now() and a.muted_until <> 'infinity' then a.muted_until end,
    'messages', (select count(*) from public.tradingo_messages m where m.account_id = a.id),
    'reported', (select coalesce(sum(m.reports), 0) from public.tradingo_messages m where m.account_id = a.id),
    'last_seen', (select max(s.last_used_at) from public.tradingo_sessions s where s.account_id = a.id)
  )
  from public.tradingo_accounts a where a.id = p_account
$$;

-- Accounts for the panel, now also searched by email. Otherwise the same as in 20260930000000_tradingo_admin.sql.
create or replace function public.tradingo_admin_users(p_token text, p_query text, p_filter text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_query text := lower(btrim(coalesce(p_query, '')));
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  return coalesce((
    select json_agg(public.tradingo_admin_user_json(t.id) order by t.created_at desc)
    from (
      select a.id, a.created_at
      from public.tradingo_accounts a
      where (
          v_query = ''
          or strpos(lower(a.name), v_query) > 0
          or strpos(coalesce(a.email, ''), v_query) > 0
          or strpos(coalesce(a.mobile, ''), v_query) > 0
        )
        and case coalesce(p_filter, 'all')
              when 'banned' then a.banned_at is not null
              when 'muted' then a.muted_until > now()
              when 'admins' then a.role = 'admin'
              when 'reported' then exists (select 1 from public.tradingo_messages m where m.account_id = a.id and m.reports > 0)
              else true
            end
      order by a.created_at desc
      limit 50
    ) t
  ), '[]'::json);
end;
$$;

-- Email sign-in is installed: the app checks for version 8.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 8 $$;

revoke all on function public.tradingo_login_norm(text) from public, anon, authenticated;
revoke all on function public.tradingo_owner_check(uuid) from public, anon, authenticated;
revoke all on function public.tradingo_admin_user_json(uuid) from public, anon, authenticated;
revoke all on function public.tradingo_register(text, text, text) from public, authenticated;
revoke all on function public.tradingo_login(text, text) from public, authenticated;
revoke all on function public.tradingo_sign_up(text, text, text) from public, authenticated;
revoke all on function public.tradingo_sign_in(text, text) from public, authenticated;
revoke all on function public.tradingo_account_status(text) from public, authenticated;
revoke all on function public.tradingo_admin_users(text, text, text) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_register(text, text, text) to anon;
grant execute on function public.tradingo_login(text, text) to anon;
grant execute on function public.tradingo_sign_up(text, text, text) to anon;
grant execute on function public.tradingo_sign_in(text, text) to anon;
grant execute on function public.tradingo_account_status(text) to anon;
grant execute on function public.tradingo_admin_users(text, text, text) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
