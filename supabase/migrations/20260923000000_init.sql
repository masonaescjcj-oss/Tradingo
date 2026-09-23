-- Tradingo: accounts, cloud progress and weekly leagues.
-- Run once in the Supabase SQL editor (or with `npx supabase db push`).

-- One public profile per user.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default 'تریدر' check (char_length(name) between 1 and 20),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  league smallint not null default 0 check (league between 0 and 4),
  updated_at timestamptz not null default now()
);

-- The learner's full progress snapshot (lessons, coins, hearts, simulator…), synced from the app.
create table if not exists public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- XP earned per week (weeks start on Saturday), for the league leaderboard.
create table if not exists public.weekly_xp (
  user_id uuid not null references auth.users on delete cascade,
  week text not null check (week ~ '^\d{4}-\d{2}-\d{2}$'), -- start date (Saturday) of the week
  league smallint not null default 0 check (league between 0 and 4),
  name text not null check (char_length(name) between 1 and 20),
  xp integer not null default 0 check (xp between 0 and 50000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);
create index if not exists weekly_xp_board on public.weekly_xp (week, league, xp desc);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.weekly_xp enable row level security;

-- Profiles: everyone signed in can see names and XP; only you can change yours.
create policy "profiles are readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "users insert their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Progress: private to its owner.
create policy "users read their own progress" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert their own progress" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update their own progress" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Leagues: the board is public to signed-in users; each user writes only their own row.
create policy "weekly boards are readable by signed-in users" on public.weekly_xp
  for select to authenticated using (true);
create policy "users insert their own weekly row" on public.weekly_xp
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update their own weekly row" on public.weekly_xp
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.profiles, public.progress, public.weekly_xp to authenticated;

-- Keep updated_at honest.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger progress_touch before update on public.progress
  for each row execute function public.touch_updated_at();
create trigger weekly_xp_touch before update on public.weekly_xp
  for each row execute function public.touch_updated_at();

-- Weekly XP can only grow within a week (a client can't lower others' view by rewriting history).
create or replace function public.weekly_xp_only_grows() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.xp < old.xp then
    new.xp = old.xp;
  end if;
  return new;
end;
$$;

create trigger weekly_xp_grows before update on public.weekly_xp
  for each row execute function public.weekly_xp_only_grows();
