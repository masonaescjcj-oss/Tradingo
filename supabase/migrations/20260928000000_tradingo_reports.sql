-- Chartoon problem reports: a learner flags a lesson step (wrong answer, typo, broken chart,
-- unclear text) and the report lands here for whoever reviews the content. Guests can report
-- too, so there are two daily limits: one per account and one for everybody together.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, RLS on with no
-- policies, and the app works through security-definer functions granted to anon only.
-- Needs 20260924000000_tradingo.sql and 20260925000000_tradingo_chat.sql first. Safe to run again.
--
-- Reading the reports (SQL editor):
--   select created_at, lesson_id, step_index, reason, message from public.tradingo_reports
--    where status = 'new' order by created_at desc;

create table if not exists public.tradingo_reports (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.tradingo_accounts (id) on delete set null,
  lesson_id text not null check (lesson_id ~ '^[a-z0-9-]{1,80}$'),
  step_index integer not null check (step_index between 0 and 200),
  step_type text check (char_length(step_type) <= 40),
  reason text not null check (reason in ('answer', 'typo', 'chart', 'unclear', 'other')),
  message text check (char_length(message) <= 500),
  app_version text check (char_length(app_version) <= 40),
  status text not null default 'new' check (status in ('new', 'fixed', 'ignored')),
  created_at timestamptz not null default now()
);
create index if not exists tradingo_reports_recent on public.tradingo_reports (created_at desc);
create index if not exists tradingo_reports_lesson on public.tradingo_reports (lesson_id, step_index);
create index if not exists tradingo_reports_account on public.tradingo_reports (account_id, created_at desc);

alter table public.tradingo_reports enable row level security;
revoke all on public.tradingo_reports from anon, authenticated;

-- Saves one report. The token is optional (guests report without an account).
create or replace function public.tradingo_report_create(
  p_token text,
  p_lesson text,
  p_step integer,
  p_step_type text,
  p_reason text,
  p_message text,
  p_version text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid := public.tradingo_session_account_or_null(p_token);
  v_ok boolean;
begin
  v_ok := coalesce(p_lesson ~ '^[a-z0-9-]{1,80}$', false)
    and coalesce(p_step between 0 and 200, false)
    and coalesce(p_reason in ('answer', 'typo', 'chart', 'unclear', 'other'), false)
    and char_length(coalesce(p_message, '')) <= 500
    and char_length(coalesce(p_step_type, '')) <= 40
    and char_length(coalesce(p_version, '')) <= 40;
  if not v_ok then
    return json_build_object('error', 'invalid');
  end if;
  if v_account is not null
     and (select count(*) from public.tradingo_reports where account_id = v_account and created_at > now() - interval '1 day') >= 20 then
    return json_build_object('error', 'rate');
  end if;
  if (select count(*) from public.tradingo_reports where created_at > now() - interval '1 day') >= 1000 then
    return json_build_object('error', 'rate');
  end if;
  insert into public.tradingo_reports (account_id, lesson_id, step_index, step_type, reason, message, app_version)
  values (v_account, p_lesson, p_step, nullif(btrim(coalesce(p_step_type, '')), ''), p_reason, nullif(btrim(coalesce(p_message, '')), ''), nullif(btrim(coalesce(p_version, '')), ''));
  return json_build_object('ok', true);
end;
$$;

-- Reports are installed: the app checks for version 4.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 4 $$;

revoke all on function public.tradingo_report_create(text, text, integer, text, text, text, text) from public, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_report_create(text, text, integer, text, text, text, text) to anon;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
