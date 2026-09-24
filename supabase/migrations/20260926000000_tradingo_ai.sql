-- Tradingo AI coach: a daily message count per account, checked by the tradingo-coach
-- Edge Function before it asks the AI. Only tradingo_* objects, like the other migrations.
-- The function itself (and the AI key) live in supabase/functions/tradingo-coach.
-- Needs 20260924000000_tradingo.sql first. Safe to run again.

create table if not exists public.tradingo_ai_usage (
  account_id uuid not null references public.tradingo_accounts (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (account_id, day)
);

alter table public.tradingo_ai_usage enable row level security;
revoke all on public.tradingo_ai_usage from anon, authenticated;

-- Checks a session and counts one coach message for today. Returns {ok, remaining, name}
-- or {error: 'session' | 'limit'}. Only the Edge Function (service role) may call it.
create or replace function public.tradingo_ai_allow(p_token text, p_limit integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
  v_count integer;
  v_name text;
begin
  begin
    v_account := public.tradingo_session_account(p_token);
  exception when others then
    return json_build_object('error', 'session');
  end;
  select count into v_count from public.tradingo_ai_usage where account_id = v_account and day = current_date;
  if coalesce(v_count, 0) >= p_limit then
    return json_build_object('error', 'limit');
  end if;
  insert into public.tradingo_ai_usage (account_id, day, count)
  values (v_account, current_date, 1)
  on conflict (account_id, day) do update set count = public.tradingo_ai_usage.count + 1
  returning count into v_count;
  -- Old days aren't needed once they're over.
  delete from public.tradingo_ai_usage where account_id = v_account and day < current_date - 7;
  select name into v_name from public.tradingo_accounts where id = v_account;
  return json_build_object('ok', true, 'remaining', greatest(0, p_limit - v_count), 'name', v_name);
end;
$$;

revoke all on function public.tradingo_ai_allow(text, integer) from public, anon, authenticated;
grant execute on function public.tradingo_ai_allow(text, integer) to service_role;

notify pgrst, 'reload schema';
