-- Chartoon admin: admin accounts, banning accounts, closing chat for an account, moderating
-- messages and reports, a log of what admins did, and the AI key kept in the database so an
-- admin can change it from the app's admin panel.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs the earlier tradingo migrations first. Safe to run again.
--
-- Make the first admin once (SQL editor), with the mobile number of an existing account:
--   update public.tradingo_accounts set role = 'admin' where mobile = '09xxxxxxxxx';
-- After that, admins can make other admins from the panel.

alter table public.tradingo_accounts
  add column if not exists role text not null default 'user',
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text,
  -- Chat closed for this account until then ('infinity' = until an admin opens it again).
  add column if not exists muted_until timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tradingo_accounts_role_check') then
    alter table public.tradingo_accounts add constraint tradingo_accounts_role_check check (role in ('user', 'admin'));
  end if;
end;
$$;

-- When an admin dealt with a reported message (deleted it or kept it).
alter table public.tradingo_messages add column if not exists reviewed_at timestamptz;
create index if not exists tradingo_messages_open_reports on public.tradingo_messages (id desc) where reports > 0 and reviewed_at is null;

-- App settings admins change from the panel. Only the AI settings for now.
create table if not exists public.tradingo_settings (
  key text primary key check (key in ('ai_api_key', 'ai_provider', 'ai_model', 'ai_base_url', 'ai_daily_limit')),
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.tradingo_accounts (id) on delete set null
);

-- What admins did, newest first in the panel. Names are copied so the log survives deletions.
create table if not exists public.tradingo_admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.tradingo_accounts (id) on delete set null,
  admin_name text not null,
  action text not null,
  target_name text,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.tradingo_settings enable row level security;
alter table public.tradingo_admin_log enable row level security;
revoke all on public.tradingo_settings, public.tradingo_admin_log from anon, authenticated;

-- Internal: the admin behind a session token, or null.
create or replace function public.tradingo_admin_or_null(p_token text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select a.id from public.tradingo_accounts a
   where a.id = public.tradingo_session_account_or_null(p_token) and a.role = 'admin' and a.banned_at is null
$$;

-- Internal: writes one line to the admin log (and forgets lines older than a year).
create or replace function public.tradingo_admin_note(p_admin uuid, p_action text, p_target uuid, p_detail text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.tradingo_admin_log where created_at < now() - interval '365 days';
  insert into public.tradingo_admin_log (admin_id, admin_name, action, target_name, detail)
  values (
    p_admin,
    coalesce((select name from public.tradingo_accounts where id = p_admin), '?'),
    p_action,
    (select name from public.tradingo_accounts where id = p_target),
    left(p_detail, 300)
  );
$$;

-- Internal: the AI settings as the panel shows them. The key itself never leaves the database;
-- only its last four characters do.
create or replace function public.tradingo_ai_status()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'key_set', exists (select 1 from public.tradingo_settings where key = 'ai_api_key'),
    'key_hint', (select right(value, 4) from public.tradingo_settings where key = 'ai_api_key'),
    'key_updated_at', (select updated_at from public.tradingo_settings where key = 'ai_api_key'),
    'provider', coalesce((select value from public.tradingo_settings where key = 'ai_provider'), 'anthropic'),
    'model', (select value from public.tradingo_settings where key = 'ai_model'),
    'base_url', (select value from public.tradingo_settings where key = 'ai_base_url'),
    'daily_limit', (select value::integer from public.tradingo_settings where key = 'ai_daily_limit')
  )
$$;

-- Internal: an account as the panel lists it.
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

-- The signed-in account's standing: whether it's an admin and whether its chat is closed.
create or replace function public.tradingo_account_status(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
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

-- The panel's first page: numbers, AI settings and the latest admin actions.
create or replace function public.tradingo_admin_overview(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  return json_build_object(
    'accounts', (select count(*) from public.tradingo_accounts),
    'new_today', (select count(*) from public.tradingo_accounts where created_at > now() - interval '1 day'),
    'messages_today', (select count(*) from public.tradingo_messages where created_at > now() - interval '1 day'),
    'open_reports', (select count(*) from public.tradingo_messages where reports > 0 and reviewed_at is null),
    'banned', (select count(*) from public.tradingo_accounts where banned_at is not null),
    'muted', (select count(*) from public.tradingo_accounts where muted_until > now()),
    'admins', (select count(*) from public.tradingo_accounts where role = 'admin'),
    'ai', public.tradingo_ai_status(),
    'log', coalesce((
      select json_agg(l order by l.id desc)
      from (select id, admin_name, action, target_name, detail, created_at from public.tradingo_admin_log order by id desc limit 30) l
    ), '[]'::json)
  );
end;
$$;

-- Messages for the panel: reported ones waiting for a decision, or the latest (in a room, or by
-- one account), hidden ones included.
create or replace function public.tradingo_admin_messages(p_token text, p_filter text, p_room uuid, p_account uuid, p_before bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_reported boolean := coalesce(p_filter, '') = 'reported';
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  return coalesce((
    select json_agg(t order by t.sort_reports desc, t.id desc)
    from (
      select
        m.id, m.room_id, r.title as room_title, m.account_id as author_id, m.author_name, m.body, m.kind,
        m.hidden, m.reports, m.reviewed_at, m.created_at,
        coalesce(a.muted_until > now(), false) as author_muted,
        a.banned_at is not null as author_banned,
        case when v_reported then m.reports else 0 end as sort_reports
      from public.tradingo_messages m
      join public.tradingo_rooms r on r.id = m.room_id
      left join public.tradingo_accounts a on a.id = m.account_id
      where (not v_reported or (m.reports > 0 and m.reviewed_at is null))
        and (p_room is null or m.room_id = p_room)
        and (p_account is null or m.account_id = p_account)
        and (p_before is null or m.id < p_before)
      order by case when v_reported then m.reports else 0 end desc, m.id desc
      limit 50
    ) t
  ), '[]'::json);
end;
$$;

-- Deletes a message ('delete') or keeps it and closes its reports ('keep').
create or replace function public.tradingo_admin_message(p_token text, p_message bigint, p_action text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_author uuid;
  v_body text;
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  if coalesce(p_action, '') not in ('delete', 'keep') then
    return json_build_object('error', 'invalid');
  end if;
  update public.tradingo_messages
     set hidden = (p_action = 'delete'), reviewed_at = now()
   where id = p_message
  returning account_id, body into v_author, v_body;
  if not found then
    return json_build_object('error', 'not_found');
  end if;
  perform public.tradingo_admin_note(v_admin, case when p_action = 'delete' then 'delete_message' else 'keep_message' end, v_author, left(v_body, 120));
  return json_build_object('ok', true);
end;
$$;

-- Accounts for the panel: a search by name or mobile, or a list ('banned', 'muted', 'admins',
-- 'reported'); the newest first.
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
      where (v_query = '' or strpos(lower(a.name), v_query) > 0 or strpos(a.mobile, v_query) > 0)
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

-- What an admin can do to an account:
--   ban / unban      a banned account is signed out everywhere, can't sign in, its messages are
--                    hidden and it leaves this week's league
--   mute / unmute    closes chat for p_hours (null or 0: until opened again); reading still works
--   purge            hides all of the account's messages
--   make_admin / remove_admin
-- Admins can't ban, mute or demote themselves, and other admins have to be demoted before a ban or mute.
create or replace function public.tradingo_admin_user(p_token text, p_account uuid, p_action text, p_hours integer, p_reason text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_target public.tradingo_accounts;
  v_reason text := nullif(left(btrim(coalesce(p_reason, '')), 200), '');
  v_hidden integer;
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  select * into v_target from public.tradingo_accounts where id = p_account for update;
  if v_target.id is null then
    return json_build_object('error', 'not_found');
  end if;
  if v_target.id = v_admin and p_action in ('ban', 'mute', 'remove_admin') then
    return json_build_object('error', 'self');
  end if;
  if v_target.role = 'admin' and p_action in ('ban', 'mute') then
    return json_build_object('error', 'admin_target');
  end if;

  case p_action
    when 'ban' then
      update public.tradingo_accounts set banned_at = now(), ban_reason = v_reason where id = p_account;
      delete from public.tradingo_sessions where account_id = p_account;
      update public.tradingo_messages set hidden = true, reviewed_at = now() where account_id = p_account and not hidden;
      delete from public.tradingo_weekly_xp where account_id = p_account;
    when 'unban' then
      update public.tradingo_accounts set banned_at = null, ban_reason = null, failed_logins = 0, locked_until = null where id = p_account;
    when 'mute' then
      update public.tradingo_accounts
         set muted_until = case when coalesce(p_hours, 0) <= 0 then 'infinity'::timestamptz else now() + make_interval(hours => least(p_hours, 24 * 365)) end
       where id = p_account;
    when 'unmute' then
      update public.tradingo_accounts set muted_until = null where id = p_account;
    when 'purge' then
      update public.tradingo_messages set hidden = true, reviewed_at = now() where account_id = p_account and not hidden;
      get diagnostics v_hidden = row_count;
      v_reason := coalesce(v_reason || ' · ', '') || v_hidden || ' پیام';
    when 'make_admin' then
      update public.tradingo_accounts set role = 'admin' where id = p_account;
    when 'remove_admin' then
      update public.tradingo_accounts set role = 'user' where id = p_account;
    else
      return json_build_object('error', 'invalid');
  end case;

  perform public.tradingo_admin_note(
    v_admin, p_action, p_account,
    case when p_action = 'mute' then coalesce(nullif(p_hours, 0)::text || 'h', 'forever') || coalesce(' · ' || v_reason, '') else v_reason end
  );
  return json_build_object('ok', true, 'user', public.tradingo_admin_user_json(p_account));
end;
$$;

-- Changes the AI settings. An empty key keeps the current one; p_clear_key removes it (then the
-- Edge Function's TRADINGO_AI_API_KEY secret is used, if set). Returns the new settings.
create or replace function public.tradingo_admin_set_ai(
  p_token text, p_key text, p_clear_key boolean, p_provider text, p_model text, p_base_url text, p_daily_limit integer
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_key text := btrim(coalesce(p_key, ''));
  v_provider text := coalesce(nullif(btrim(p_provider), ''), 'anthropic');
  v_model text := nullif(btrim(coalesce(p_model, '')), '');
  v_base text := nullif(btrim(coalesce(p_base_url, '')), '');
  v_changes text[] := '{}';
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  if v_provider not in ('anthropic', 'openai') then
    return json_build_object('error', 'invalid_provider');
  end if;
  if v_key <> '' and (char_length(v_key) not between 10 and 400 or v_key ~ '\s') then
    return json_build_object('error', 'invalid_key');
  end if;
  if v_model is not null and (char_length(v_model) > 100 or v_model ~ '\s') then
    return json_build_object('error', 'invalid_model');
  end if;
  if v_base is not null and (v_base !~ '^https://[^\s]+$' or char_length(v_base) > 300) then
    return json_build_object('error', 'invalid_base_url');
  end if;
  if v_provider = 'openai' and (v_model is null or v_base is null) then
    return json_build_object('error', 'openai_needs_model_and_url');
  end if;
  if p_daily_limit is not null and p_daily_limit not between 1 and 1000 then
    return json_build_object('error', 'invalid_limit');
  end if;

  if v_key <> '' then
    insert into public.tradingo_settings (key, value, updated_by) values ('ai_api_key', v_key, v_admin)
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
    v_changes := array_append(v_changes, 'key');
  elsif coalesce(p_clear_key, false) then
    delete from public.tradingo_settings where key = 'ai_api_key';
    v_changes := array_append(v_changes, 'key removed');
  end if;

  insert into public.tradingo_settings (key, value, updated_by) values ('ai_provider', v_provider, v_admin)
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by
  where public.tradingo_settings.value is distinct from excluded.value;
  if v_model is null then
    delete from public.tradingo_settings where key = 'ai_model';
  else
    insert into public.tradingo_settings (key, value, updated_by) values ('ai_model', v_model, v_admin)
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  if v_base is null then
    delete from public.tradingo_settings where key = 'ai_base_url';
  else
    insert into public.tradingo_settings (key, value, updated_by) values ('ai_base_url', v_base, v_admin)
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  end if;
  if p_daily_limit is null then
    delete from public.tradingo_settings where key = 'ai_daily_limit';
  else
    insert into public.tradingo_settings (key, value, updated_by) values ('ai_daily_limit', p_daily_limit::text, v_admin)
    on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  end if;

  perform public.tradingo_admin_note(
    v_admin, 'ai_settings', null,
    array_to_string(array_append(v_changes, v_provider || coalesce(' · ' || v_model, '') || coalesce(' · ' || p_daily_limit || '/day', '')), ' · ')
  );
  return public.tradingo_ai_status();
end;
$$;

-- For the tradingo-coach Edge Function only: checks the session and daily limit like
-- tradingo_ai_allow, and hands over the AI settings saved from the panel. p_env_key says whether
-- the function has its own TRADINGO_AI_API_KEY to fall back on; without either, nothing is counted.
create or replace function public.tradingo_ai_gate(p_token text, p_env_key boolean, p_default_limit integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := (select value from public.tradingo_settings where key = 'ai_api_key');
  v_limit integer := coalesce((select value::integer from public.tradingo_settings where key = 'ai_daily_limit'), p_default_limit, 40);
  v_gate jsonb;
begin
  if v_key is null and not coalesce(p_env_key, false) then
    return json_build_object('error', 'not_configured');
  end if;
  v_gate := public.tradingo_ai_allow(p_token, v_limit)::jsonb;
  if v_gate ? 'error' then
    return v_gate::json;
  end if;
  return (v_gate || jsonb_build_object('config', jsonb_build_object(
    'api_key', v_key,
    'provider', (select value from public.tradingo_settings where key = 'ai_provider'),
    'model', (select value from public.tradingo_settings where key = 'ai_model'),
    'base_url', (select value from public.tradingo_settings where key = 'ai_base_url')
  )))::json;
end;
$$;

-- Sign-in, now refusing banned accounts. Otherwise the same as in 20260924000000_tradingo.sql.
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
  -- Only after the password, so a ban doesn't tell strangers the number has an account.
  if v_account.banned_at is not null then
    return json_build_object('error', 'banned');
  end if;
  update public.tradingo_accounts set failed_logins = 0, locked_until = null where id = v_account.id;
  return json_build_object('token', public.tradingo_new_session(v_account.id), 'name', v_account.name);
end;
$$;

-- Posting, now refusing accounts whose chat is closed. Otherwise the same as in 20260925000000_tradingo_chat.sql.
create or replace function public.tradingo_chat_send(p_token text, p_room uuid, p_body text, p_chart jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_body text := btrim(coalesce(p_body, ''));
  v_name text;
  v_row public.tradingo_messages;
begin
  if exists (select 1 from public.tradingo_accounts where id = v_account and (muted_until > now() or banned_at is not null)) then
    return json_build_object('error', 'muted');
  end if;
  if not exists (select 1 from public.tradingo_room_members where room_id = p_room and account_id = v_account) then
    return json_build_object('error', 'not_member');
  end if;
  if char_length(v_body) > 1000 or (v_body = '' and p_chart is null) then
    return json_build_object('error', 'invalid');
  end if;
  if p_chart is not null and (
       jsonb_typeof(p_chart) <> 'object'
       or octet_length(p_chart::text) > 12000
       or jsonb_typeof(p_chart -> 'candles') <> 'array'
       or jsonb_array_length(p_chart -> 'candles') not between 5 and 80
     ) then
    return json_build_object('error', 'invalid');
  end if;
  if public.tradingo_chat_blocked(v_body) then
    return json_build_object('error', 'links');
  end if;
  if exists (select 1 from public.tradingo_messages where account_id = v_account and created_at > now() - interval '3 seconds')
     or (select count(*) from public.tradingo_messages where account_id = v_account and created_at > now() - interval '1 minute') >= 15 then
    return json_build_object('error', 'rate');
  end if;
  select name into v_name from public.tradingo_accounts where id = v_account;
  insert into public.tradingo_messages (room_id, account_id, author_name, body, kind, chart)
  values (p_room, v_account, v_name, v_body, case when p_chart is null then 'text' else 'analysis' end, p_chart)
  returning * into v_row;
  update public.tradingo_rooms set last_message_at = now() where id = p_room;
  update public.tradingo_room_members set last_read_id = greatest(last_read_id, v_row.id) where room_id = p_room and account_id = v_account;
  return json_build_object(
    'id', v_row.id, 'author_name', v_row.author_name, 'body', v_row.body, 'kind', v_row.kind,
    'chart', v_row.chart, 'created_at', v_row.created_at, 'mine', true
  );
end;
$$;

-- New groups, now refusing accounts whose chat is closed. Otherwise the same as in 20260925000000_tradingo_chat.sql.
create or replace function public.tradingo_chat_create(p_token text, p_title text, p_about text, p_topic text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_title text := btrim(coalesce(p_title, ''));
  v_about text := btrim(coalesce(p_about, ''));
  v_id uuid;
begin
  if exists (select 1 from public.tradingo_accounts where id = v_account and (muted_until > now() or banned_at is not null)) then
    return json_build_object('error', 'muted');
  end if;
  if char_length(v_title) not between 3 and 40 or char_length(v_about) > 160 then
    return json_build_object('error', 'invalid');
  end if;
  if coalesce(p_topic, '') not in ('general', 'beginners', 'crypto', 'forex', 'technical', 'psychology') then
    return json_build_object('error', 'invalid');
  end if;
  if public.tradingo_chat_blocked(v_title) or public.tradingo_chat_blocked(v_about) then
    return json_build_object('error', 'links');
  end if;
  if (select count(*) from public.tradingo_rooms where owner_id = v_account) >= 5
     or (select count(*) from public.tradingo_rooms where owner_id = v_account and created_at > now() - interval '1 day') >= 3 then
    return json_build_object('error', 'too_many_groups');
  end if;
  insert into public.tradingo_rooms (title, about, topic, owner_id, member_count)
  values (v_title, v_about, p_topic, v_account, 1)
  returning id into v_id;
  insert into public.tradingo_room_members (room_id, account_id) values (v_id, v_account);
  return json_build_object('id', v_id);
end;
$$;

-- A room's messages, now with the author's account for admins (so they can act on it from the
-- chat). Otherwise the same as in 20260925000000_tradingo_chat.sql.
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
           case when v_admin then x.account_id end as author_id
      from public.tradingo_messages x
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

-- Removing a message: its author, the owner of its group, and now admins (logged).
create or replace function public.tradingo_chat_delete(p_token text, p_message bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_admin boolean := exists (select 1 from public.tradingo_accounts where id = v_account and role = 'admin' and banned_at is null);
  v_author uuid;
  v_body text;
begin
  update public.tradingo_messages x
     set hidden = true, reviewed_at = case when v_admin then now() else x.reviewed_at end
   where x.id = p_message
     and (v_admin
          or x.account_id = v_account
          or exists (select 1 from public.tradingo_rooms r where r.id = x.room_id and r.owner_id = v_account))
  returning x.account_id, x.body into v_author, v_body;
  if found and v_admin and v_author is distinct from v_account then
    perform public.tradingo_admin_note(v_account, 'delete_message', v_author, left(v_body, 120));
  end if;
  return json_build_object('ok', found);
end;
$$;

-- The admin panel is installed: the app checks for version 6.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 6 $$;

revoke all on function public.tradingo_admin_or_null(text) from public, anon, authenticated;
revoke all on function public.tradingo_admin_note(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.tradingo_ai_status() from public, anon, authenticated;
revoke all on function public.tradingo_admin_user_json(uuid) from public, anon, authenticated;
revoke all on function public.tradingo_ai_gate(text, boolean, integer) from public, anon, authenticated;
revoke all on function public.tradingo_account_status(text) from public, authenticated;
revoke all on function public.tradingo_admin_overview(text) from public, authenticated;
revoke all on function public.tradingo_admin_messages(text, text, uuid, uuid, bigint) from public, authenticated;
revoke all on function public.tradingo_admin_message(text, bigint, text) from public, authenticated;
revoke all on function public.tradingo_admin_users(text, text, text) from public, authenticated;
revoke all on function public.tradingo_admin_user(text, uuid, text, integer, text) from public, authenticated;
revoke all on function public.tradingo_admin_set_ai(text, text, boolean, text, text, text, integer) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_ai_gate(text, boolean, integer) to service_role;
grant execute on function public.tradingo_account_status(text) to anon;
grant execute on function public.tradingo_admin_overview(text) to anon;
grant execute on function public.tradingo_admin_messages(text, text, uuid, uuid, bigint) to anon;
grant execute on function public.tradingo_admin_message(text, bigint, text) to anon;
grant execute on function public.tradingo_admin_users(text, text, text) to anon;
grant execute on function public.tradingo_admin_user(text, uuid, text, integer, text) to anon;
grant execute on function public.tradingo_admin_set_ai(text, text, boolean, text, text, text, integer) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
