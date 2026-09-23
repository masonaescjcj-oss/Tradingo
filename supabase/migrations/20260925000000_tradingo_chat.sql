-- Tradingo community chat: rooms (like Telegram groups), members, messages and reports.
--
-- Same rules as the first migration: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs 20260924000000_tradingo.sql first. Safe to run again.

-- Rooms: a few official ones (with a slug) plus groups learners create.
create table if not exists public.tradingo_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null check (char_length(title) between 3 and 40),
  about text not null default '' check (char_length(about) <= 160),
  topic text not null default 'general' check (topic in ('general', 'beginners', 'crypto', 'forex', 'technical', 'psychology')),
  official boolean not null default false,
  owner_id uuid references public.tradingo_accounts (id) on delete set null,
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists tradingo_rooms_owner on public.tradingo_rooms (owner_id);

create table if not exists public.tradingo_room_members (
  room_id uuid not null references public.tradingo_rooms (id) on delete cascade,
  account_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_id bigint not null default 0,
  primary key (room_id, account_id)
);
create index if not exists tradingo_room_members_account on public.tradingo_room_members (account_id);

-- Messages: plain text, or an analysis that carries a small chart (candles and levels).
create table if not exists public.tradingo_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.tradingo_rooms (id) on delete cascade,
  account_id uuid references public.tradingo_accounts (id) on delete set null,
  author_name text not null,
  body text not null default '' check (char_length(body) <= 1000),
  kind text not null default 'text' check (kind in ('text', 'analysis')),
  chart jsonb check (chart is null or (jsonb_typeof(chart) = 'object' and octet_length(chart::text) <= 12000)),
  reports integer not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tradingo_messages_room on public.tradingo_messages (room_id, id desc);
create index if not exists tradingo_messages_author on public.tradingo_messages (account_id, created_at desc);

create table if not exists public.tradingo_message_reports (
  message_id bigint not null references public.tradingo_messages (id) on delete cascade,
  account_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, account_id)
);

alter table public.tradingo_rooms enable row level security;
alter table public.tradingo_room_members enable row level security;
alter table public.tradingo_messages enable row level security;
alter table public.tradingo_message_reports enable row level security;
revoke all on public.tradingo_rooms, public.tradingo_room_members, public.tradingo_messages, public.tradingo_message_reports from anon, authenticated;

insert into public.tradingo_rooms (slug, title, about, topic, official) values
  ('general', 'گفتگوی آزاد', 'هر چی درباره‌ی ترید و یادگیری داری، اینجا بگو.', 'general', true),
  ('beginners', 'تازه‌کارها', 'سؤال داری؟ اینجا هیچ سؤالی مسخره نیست.', 'beginners', true),
  ('crypto', 'کریپتو', 'بیت‌کوین، آلت‌کوین‌ها و بازار کریپتو.', 'crypto', true),
  ('forex', 'فارکس و طلا', 'جفت‌ارزها، طلا و اخبار اقتصادی.', 'forex', true),
  ('technical', 'تحلیل تکنیکال', 'تحلیل و نمودارت رو بذار و نظر بگیر.', 'technical', true),
  ('psychology', 'ریسک و روانشناسی', 'انضباط، مدیریت ریسک و کنترل احساسات.', 'psychology', true)
on conflict (slug) do nothing;

-- Internal: the account of a token, or null when there is no valid session (reading is open to all).
create or replace function public.tradingo_session_account_or_null(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_token is null or p_token = '' then
    return null;
  end if;
  return public.tradingo_session_account(p_token);
exception when others then
  return null;
end;
$$;

-- Internal: links, handles and phone numbers aren't allowed (keeps out scams and signal-selling ads).
create or replace function public.tradingo_chat_blocked(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_text, '') ~* '(https?://|www\.|[a-z0-9-]+\.(com|ir|io|net|org|me|xyz|app|link)\M|t\.me|@[a-z0-9_]{4,}|(\+98|0098|\m0)?9[0-9]{9}\M|[۰-۹]{10,})'
$$;

-- Rooms, the caller's own groups first, with the last message and unread count.
create or replace function public.tradingo_chat_rooms(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account_or_null(p_token);
begin
  return coalesce((
    select json_agg(r order by r.joined desc, r.official desc, r.last_message_at desc)
    from (
      select
        rm.id, rm.title, rm.about, rm.topic, rm.official, rm.member_count, rm.last_message_at,
        rm.owner_id is not null and rm.owner_id = v_account as owned,
        m.account_id is not null as joined,
        coalesce(least(99, (
          select count(*) from public.tradingo_messages x
           where m.account_id is not null and x.room_id = rm.id and not x.hidden and x.id > m.last_read_id
        )), 0) as unread,
        last.author_name as last_author,
        last.kind as last_kind,
        left(last.body, 80) as last_body
      from public.tradingo_rooms rm
      left join public.tradingo_room_members m on m.room_id = rm.id and m.account_id = v_account
      left join lateral (
        select x.author_name, x.kind, x.body from public.tradingo_messages x
         where x.room_id = rm.id and not x.hidden order by x.id desc limit 1
      ) last on true
      order by m.account_id is not null desc, rm.official desc, rm.last_message_at desc
      limit 100
    ) r
  ), '[]'::json);
end;
$$;

create or replace function public.tradingo_chat_join(p_token text, p_room uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  if not exists (select 1 from public.tradingo_rooms where id = p_room) then
    return json_build_object('error', 'no_room');
  end if;
  if (select count(*) from public.tradingo_room_members where account_id = v_account) >= 30 then
    return json_build_object('error', 'too_many_rooms');
  end if;
  insert into public.tradingo_room_members (room_id, account_id, last_read_id)
  values (p_room, v_account, coalesce((select max(id) from public.tradingo_messages where room_id = p_room), 0))
  on conflict do nothing;
  update public.tradingo_rooms
     set member_count = (select count(*) from public.tradingo_room_members where room_id = p_room)
   where id = p_room;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.tradingo_chat_leave(p_token text, p_room uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  delete from public.tradingo_room_members where room_id = p_room and account_id = v_account;
  update public.tradingo_rooms
     set member_count = (select count(*) from public.tradingo_room_members where room_id = p_room)
   where id = p_room;
  return json_build_object('ok', true);
end;
$$;

-- A new public group. Each account can run a few groups and create at most 3 a day.
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

-- Messages of a room: the latest 50, the 50 before p_before, or everything after p_after.
-- Anyone can read; a member's read position moves to the newest message they received.
create or replace function public.tradingo_chat_messages(p_token text, p_room uuid, p_before bigint, p_after bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account_or_null(p_token);
  v_rows json;
  v_max bigint;
begin
  select json_agg(t order by t.id), max(t.id) into v_rows, v_max
  from (
    select x.id, x.author_name, x.body, x.kind, x.chart, x.created_at,
           (v_account is not null and x.account_id = v_account) as mine
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

-- Posts a message as a member. Returns the message, or {error}.
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

-- Reports a message; three reports from different people hide it.
create or replace function public.tradingo_chat_report(p_token text, p_message bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  insert into public.tradingo_message_reports (message_id, account_id)
  select id, v_account from public.tradingo_messages where id = p_message and account_id is distinct from v_account
  on conflict do nothing;
  if found then
    update public.tradingo_messages
       set reports = reports + 1, hidden = hidden or reports + 1 >= 3
     where id = p_message;
  end if;
  return json_build_object('ok', true);
end;
$$;

-- Removes a message: its author can, and so can the owner of the group it's in.
create or replace function public.tradingo_chat_delete(p_token text, p_message bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  update public.tradingo_messages x
     set hidden = true
   where x.id = p_message
     and (x.account_id = v_account
          or exists (select 1 from public.tradingo_rooms r where r.id = x.room_id and r.owner_id = v_account));
  return json_build_object('ok', found);
end;
$$;

-- Chat is installed: the app checks for version 2.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 2 $$;

revoke all on function public.tradingo_session_account_or_null(text) from public, anon, authenticated;
revoke all on function public.tradingo_chat_blocked(text) from public, anon, authenticated;
revoke all on function public.tradingo_chat_rooms(text) from public, authenticated;
revoke all on function public.tradingo_chat_join(text, uuid) from public, authenticated;
revoke all on function public.tradingo_chat_leave(text, uuid) from public, authenticated;
revoke all on function public.tradingo_chat_create(text, text, text, text) from public, authenticated;
revoke all on function public.tradingo_chat_messages(text, uuid, bigint, bigint) from public, authenticated;
revoke all on function public.tradingo_chat_send(text, uuid, text, jsonb) from public, authenticated;
revoke all on function public.tradingo_chat_report(text, bigint) from public, authenticated;
revoke all on function public.tradingo_chat_delete(text, bigint) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_chat_rooms(text) to anon;
grant execute on function public.tradingo_chat_join(text, uuid) to anon;
grant execute on function public.tradingo_chat_leave(text, uuid) to anon;
grant execute on function public.tradingo_chat_create(text, text, text, text) to anon;
grant execute on function public.tradingo_chat_messages(text, uuid, bigint, bigint) to anon;
grant execute on function public.tradingo_chat_send(text, uuid, text, jsonb) to anon;
grant execute on function public.tradingo_chat_report(text, bigint) to anon;
grant execute on function public.tradingo_chat_delete(text, bigint) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
