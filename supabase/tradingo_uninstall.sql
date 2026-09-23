-- Removes everything Tradingo added to the project (its accounts, progress and leaderboard).
-- Nothing belonging to other apps is touched.
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
