-- Removes everything Chartoon (formerly Tradingo) added to the project (its accounts, progress, leaderboard, chat, duels, problem reports and admin settings).
-- Nothing belonging to other apps is touched. The tradingo-coach Edge Function is removed
-- separately (Supabase → Edge Functions → tradingo-coach → Delete).
drop function if exists
  public.tradingo_admin_claim(text, text),
  public.tradingo_admin_rooms(text),
  public.tradingo_admin_room_delete(text, uuid),
  public.tradingo_account_status(text),
  public.tradingo_admin_overview(text),
  public.tradingo_admin_messages(text, text, uuid, uuid, bigint),
  public.tradingo_admin_message(text, bigint, text),
  public.tradingo_admin_users(text, text, text),
  public.tradingo_admin_user(text, uuid, text, integer, text),
  public.tradingo_admin_set_ai(text, text, boolean, text, text, text, integer),
  public.tradingo_ai_gate(text, boolean, integer),
  public.tradingo_ai_status(),
  public.tradingo_admin_user_json(uuid),
  public.tradingo_admin_note(uuid, text, uuid, text),
  public.tradingo_admin_or_null(text);
drop table if exists public.tradingo_admin_log, public.tradingo_settings;
drop function if exists
  public.tradingo_duel_create(text, jsonb, jsonb),
  public.tradingo_duel_get(text, text),
  public.tradingo_duel_submit(text, text, jsonb),
  public.tradingo_duel_list(text),
  public.tradingo_duel_result_ok(jsonb),
  public.tradingo_duel_rounds_ok(jsonb);
drop table if exists public.tradingo_duels;
drop function if exists public.tradingo_delete_account(text, text);
drop function if exists public.tradingo_report_create(text, text, integer, text, text, text, text);
drop table if exists public.tradingo_reports;
drop function if exists public.tradingo_ai_allow(text, integer);
drop table if exists public.tradingo_ai_usage;
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
