-- Removes everything Tradingo added to the project (its accounts, progress, leaderboard and chat).
-- Nothing belonging to other apps is touched.
drop function if exists
  public.tradingo_chat_rooms(text),
  public.tradingo_chat_join(text, uuid),
  public.tradingo_chat_leave(text, uuid),
  public.tradingo_chat_create(text, text, text, text),
  public.tradingo_chat_messages(text, uuid, bigint, bigint),
  public.tradingo_chat_send(text, uuid, text, jsonb),
  public.tradingo_chat_report(text, bigint),
  public.tradingo_chat_delete(text, bigint),
  public.tradingo_chat_blocked(text),
  public.tradingo_session_account_or_null(text);
drop table if exists public.tradingo_message_reports, public.tradingo_messages, public.tradingo_room_members, public.tradingo_rooms;
drop function if exists
  public.tradingo_version(),
  public.tradingo_sign_up(text, text, text),
  public.tradingo_sign_in(text, text),
  public.tradingo_sign_out(text),
  public.tradingo_load(text),
  public.tradingo_save(text, jsonb, text, integer, integer),
  public.tradingo_set_name(text, text),
  public.tradingo_league(text, text, integer),
  public.tradingo_new_session(uuid),
  public.tradingo_session_account(text);
drop table if exists public.tradingo_weekly_xp, public.tradingo_progress, public.tradingo_sessions, public.tradingo_accounts;
notify pgrst, 'reload schema';
