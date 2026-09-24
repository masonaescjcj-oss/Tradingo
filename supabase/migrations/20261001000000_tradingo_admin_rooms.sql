-- Chartoon admin, part two: becoming the first admin from inside the app with a one-time setup
-- code, and the groups themselves in the admin panel (every group, its numbers, and deleting
-- a group that learners made).
--
-- Same rules as the other migrations: only tradingo_* tables and functions, and the app works
-- through security-definer functions granted to anon only.
-- Needs 20260930000000_tradingo_admin.sql first. Safe to run again.
--
-- A setup code is made on the server (SQL editor), shown once to the owner and kept only as a
-- SHA-256 hash; it works for 7 days, once:
--   insert into public.tradingo_settings (key, value)
--   values ('admin_claim_hash', encode(extensions.digest('<the code>', 'sha256'), 'hex'))
--   on conflict (key) do update set value = excluded.value, updated_at = now();

alter table public.tradingo_settings drop constraint if exists tradingo_settings_key_check;
alter table public.tradingo_settings add constraint tradingo_settings_key_check
  check (key in ('ai_api_key', 'ai_provider', 'ai_model', 'ai_base_url', 'ai_daily_limit', 'admin_claim_hash'));

-- The signed-in account becomes an admin with the setup code, which is then used up.
create or replace function public.tradingo_admin_claim(p_token text, p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account(p_token);
  v_setting public.tradingo_settings;
begin
  select * into v_setting from public.tradingo_settings where key = 'admin_claim_hash' for update;
  if v_setting.key is null
     or v_setting.updated_at < now() - interval '7 days'
     or v_setting.value <> encode(extensions.digest(btrim(coalesce(p_code, '')), 'sha256'), 'hex') then
    return json_build_object('error', 'invalid_code');
  end if;
  delete from public.tradingo_settings where key = 'admin_claim_hash';
  update public.tradingo_accounts set role = 'admin' where id = v_account and banned_at is null;
  if not found then
    return json_build_object('error', 'invalid_code');
  end if;
  perform public.tradingo_admin_note(v_account, 'claim_admin', v_account, null);
  return json_build_object('ok', true);
end;
$$;

-- Every group for the panel: official ones first, then by the latest message.
create or replace function public.tradingo_admin_rooms(p_token text)
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
    select json_agg(r order by r.official desc, r.last_message_at desc)
    from (
      select
        rm.id, rm.title, rm.about, rm.topic, rm.official, rm.member_count, rm.created_at, rm.last_message_at,
        rm.owner_id, o.name as owner_name,
        (select count(*) from public.tradingo_messages x where x.room_id = rm.id) as messages,
        (select count(*) from public.tradingo_messages x where x.room_id = rm.id and x.hidden) as hidden,
        (select count(*) from public.tradingo_messages x where x.room_id = rm.id and x.reports > 0 and x.reviewed_at is null) as open_reports
      from public.tradingo_rooms rm
      left join public.tradingo_accounts o on o.id = rm.owner_id
      order by rm.official desc, rm.last_message_at desc
      limit 300
    ) r
  ), '[]'::json);
end;
$$;

-- Deletes a group learners made, with its messages and members. Official groups stay.
create or replace function public.tradingo_admin_room_delete(p_token text, p_room uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.tradingo_admin_or_null(p_token);
  v_room public.tradingo_rooms;
begin
  if v_admin is null then
    return json_build_object('error', 'forbidden');
  end if;
  select * into v_room from public.tradingo_rooms where id = p_room;
  if v_room.id is null then
    return json_build_object('error', 'not_found');
  end if;
  if v_room.official then
    return json_build_object('error', 'official_room');
  end if;
  delete from public.tradingo_rooms where id = p_room;
  perform public.tradingo_admin_note(v_admin, 'delete_room', v_room.owner_id, v_room.title);
  return json_build_object('ok', true);
end;
$$;

-- The groups tab and setup codes are installed: the app checks for version 7.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 7 $$;

revoke all on function public.tradingo_admin_claim(text, text) from public, authenticated;
revoke all on function public.tradingo_admin_rooms(text) from public, authenticated;
revoke all on function public.tradingo_admin_room_delete(text, uuid) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_admin_claim(text, text) to anon;
grant execute on function public.tradingo_admin_rooms(text) to anon;
grant execute on function public.tradingo_admin_room_delete(text, uuid) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
