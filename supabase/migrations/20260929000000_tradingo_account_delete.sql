-- Chartoon account deletion, from inside the app (app stores require it). The learner confirms
-- with their password; the account and everything tied to it goes: sessions, saved progress,
-- league rows, group memberships, chat messages, AI usage and the duels they created. In duels
-- they played against a friend, the friend keeps the result but not the name. Problem reports
-- stay, without the account.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, and the app works
-- through security-definer functions granted to anon only.
-- Needs the earlier tradingo migrations first. Safe to run again.

create or replace function public.tradingo_delete_account(p_token text, p_password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.tradingo_session_account_or_null(p_token);
  v_account public.tradingo_accounts;
begin
  if v_id is null then
    return json_build_object('error', 'invalid_session');
  end if;
  select * into v_account from public.tradingo_accounts where id = v_id for update;
  if v_account.locked_until is not null and v_account.locked_until > now() then
    return json_build_object('error', 'locked');
  end if;
  -- The same check (and lock after 8 wrong tries) as signing in.
  if v_account.password_hash <> extensions.crypt(coalesce(p_password, ''), v_account.password_hash) then
    update public.tradingo_accounts
       set failed_logins = failed_logins + 1,
           locked_until = case when failed_logins + 1 >= 8 then now() + interval '15 minutes' else null end
     where id = v_id;
    return json_build_object('error', 'invalid_credentials');
  end if;

  -- Messages carry the author's name, so they go too; their groups count one member fewer.
  update public.tradingo_rooms r
     set member_count = greatest(0, r.member_count - 1)
   where r.id in (select m.room_id from public.tradingo_room_members m where m.account_id = v_id);
  delete from public.tradingo_messages where account_id = v_id;
  -- A friend's duel history keeps the result, not the name.
  update public.tradingo_duels set opponent_name = 'حساب حذف‌شده' where opponent_id = v_id;
  -- Everything else refers to the account with on delete cascade (or set null for reports and group owners).
  delete from public.tradingo_accounts where id = v_id;
  return json_build_object('ok', true);
end;
$$;

-- Account deletion is installed: the app checks for version 5.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 5 $$;

revoke all on function public.tradingo_delete_account(text, text) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_delete_account(text, text) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
