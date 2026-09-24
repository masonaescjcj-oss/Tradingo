-- Chartoon safety tools that Google Play expects of apps with chat and AI:
-- * any learner can block another by @ID: the blocked person's messages disappear from their
--   groups (for them only), and they can unblock from the person's profile or their list;
-- * any learner can report an answer from the AI assistant; the question and answer go to the
--   server only then, and admins see them in the panel.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs 20261003000000_tradingo_profiles.sql first. Safe to run again.

create table if not exists public.tradingo_user_blocks (
  blocker_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  blocked_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists tradingo_user_blocks_blocked on public.tradingo_user_blocks (blocked_id);

create table if not exists public.tradingo_ai_reports (
  id bigint generated always as identity primary key,
  account_id uuid references public.tradingo_accounts (id) on delete set null,
  question text not null check (char_length(question) <= 1000),
  answer text not null check (char_length(answer) between 1 and 6000),
  reason text not null check (reason in ('wrong', 'advice', 'offensive', 'other')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists tradingo_ai_reports_open on public.tradingo_ai_reports (id desc) where reviewed_at is null;

alter table public.tradingo_user_blocks enable row level security;
alter table public.tradingo_ai_reports enable row level security;
revoke all on public.tradingo_user_blocks, public.tradingo_ai_reports from anon, authenticated;

-- Blocks (p_block true) or unblocks someone by @ID. Returns {ok, blocked} or {error}.
create or replace function public.tradingo_block_user(p_token text, p_username text, p_block boolean)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_target uuid := (select id from public.tradingo_accounts where username = lower(ltrim(btrim(coalesce(p_username, '')), '@')));
begin
  if v_target is null then
    return json_build_object('error', 'not_found');
  end if;
  if v_target = v_account then
    return json_build_object('error', 'self');
  end if;
  if coalesce(p_block, true) then
    if (select count(*) from public.tradingo_user_blocks where blocker_id = v_account) >= 500 then
      return json_build_object('error', 'too_many');
    end if;
    insert into public.tradingo_user_blocks (blocker_id, blocked_id) values (v_account, v_target) on conflict do nothing;
  else
    delete from public.tradingo_user_blocks where blocker_id = v_account and blocked_id = v_target;
  end if;
  return json_build_object('ok', true, 'blocked', coalesce(p_block, true));
end;
$$;

-- The people the signed-in account has blocked, newest first.
create or replace function public.tradingo_blocked_users(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
begin
  return coalesce((
    select json_agg(json_build_object('username', a.username, 'name', a.name, 'avatar', a.avatar, 'blocked_at', b.created_at) order by b.created_at desc)
      from public.tradingo_user_blocks b
      join public.tradingo_accounts a on a.id = b.blocked_id
     where b.blocker_id = v_account
  ), '[]'::json);
end;
$$;

-- A room's messages, now without the messages of people the viewer blocked. Otherwise the same
-- as in 20261003000000_tradingo_profiles.sql.
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
       and (v_account is null or not exists (
             select 1 from public.tradingo_user_blocks b where b.blocker_id = v_account and b.blocked_id = x.account_id))
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

-- A public profile, now saying whether the viewer blocked this person. Otherwise the same as in
-- 20261003000000_tradingo_profiles.sql.
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
    'blocked', v_viewer is not null and exists (select 1 from public.tradingo_user_blocks b where b.blocker_id = v_viewer and b.blocked_id = a.id),
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

-- Reports an answer of the AI assistant with the question that led to it. 20 a day per account.
create or replace function public.tradingo_ai_report(p_token text, p_question text, p_answer text, p_reason text, p_note text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_answer text := btrim(coalesce(p_answer, ''));
begin
  if v_answer = '' or coalesce(p_reason, '') not in ('wrong', 'advice', 'offensive', 'other') then
    return json_build_object('error', 'invalid');
  end if;
  if (select count(*) from public.tradingo_ai_reports where account_id = v_account and created_at > now() - interval '1 day') >= 20 then
    return json_build_object('error', 'rate');
  end if;
  insert into public.tradingo_ai_reports (account_id, question, answer, reason, note)
  values (v_account, left(btrim(coalesce(p_question, '')), 1000), left(v_answer, 6000), p_reason, nullif(left(btrim(coalesce(p_note, '')), 300), ''));
  return json_build_object('ok', true);
end;
$$;

-- Reported AI answers for the admin panel: waiting ones first, then the latest reviewed ones.
create or replace function public.tradingo_admin_ai_reports(p_token text)
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
  return coalesce((
    select json_agg(r order by r.reviewed_at is not null, r.id desc)
    from (
      select x.id, x.question, x.answer, x.reason, x.note, x.created_at, x.reviewed_at, a.name as author_name, a.username as author_username
        from public.tradingo_ai_reports x
        left join public.tradingo_accounts a on a.id = x.account_id
       order by x.reviewed_at is not null, x.id desc
       limit 50
    ) r
  ), '[]'::json);
end;
$$;

-- Marks a reported AI answer as looked at.
create or replace function public.tradingo_admin_ai_report_done(p_token text, p_report bigint)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_account uuid;
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  update public.tradingo_ai_reports set reviewed_at = now() where id = p_report and reviewed_at is null returning account_id into v_account;
  if not found then
    return json_build_object('error', 'not_found');
  end if;
  perform public.tradingo_admin_note(v_admin, 'ai_report_done', v_account, null);
  return json_build_object('ok', true);
end;
$$;

-- Blocking and AI reports are installed: the app checks for version 10.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 10 $$;

revoke all on function public.tradingo_block_user(text, text, boolean) from public, authenticated;
revoke all on function public.tradingo_blocked_users(text) from public, authenticated;
revoke all on function public.tradingo_chat_messages(text, uuid, bigint, bigint) from public, authenticated;
revoke all on function public.tradingo_profile(text, text) from public, authenticated;
revoke all on function public.tradingo_ai_report(text, text, text, text, text) from public, authenticated;
revoke all on function public.tradingo_admin_ai_reports(text) from public, authenticated;
revoke all on function public.tradingo_admin_ai_report_done(text, bigint) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_block_user(text, text, boolean) to anon;
grant execute on function public.tradingo_blocked_users(text) to anon;
grant execute on function public.tradingo_chat_messages(text, uuid, bigint, bigint) to anon;
grant execute on function public.tradingo_profile(text, text) to anon;
grant execute on function public.tradingo_ai_report(text, text, text, text, text) to anon;
grant execute on function public.tradingo_admin_ai_reports(text) to anon;
grant execute on function public.tradingo_admin_ai_report_done(text, bigint) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
