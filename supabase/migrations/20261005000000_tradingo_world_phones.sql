-- Chartoon mobile sign-in from any country. Iranian numbers stay as 09XXXXXXXXX (every account
-- made so far); numbers from other countries are kept in the international form +<code><number>
-- (E.164, 8 to 15 digits), e.g. +447911123456.
--
-- Same rules as the other migrations: only tradingo_* tables and functions, and the app works
-- through security-definer functions granted to anon only.
-- Needs 20261004000000_tradingo_blocks.sql first. Safe to run again.

alter table public.tradingo_accounts drop constraint if exists tradingo_accounts_mobile_check;
alter table public.tradingo_accounts add constraint tradingo_accounts_mobile_check
  check (mobile ~ '^09[0-9]{9}$' or mobile ~ '^\+[1-9][0-9]{7,14}$');

alter table public.tradingo_admin_logins drop constraint if exists tradingo_admin_logins_login_check;
alter table public.tradingo_admin_logins add constraint tradingo_admin_logins_login_check
  check (login = lower(btrim(login)) and (login ~ '^09[0-9]{9}$' or login ~ '^\+[1-9][0-9]{7,14}$' or position('@' in login) > 1));

-- Internal: a login as accounts keep it (a lower-case email, 09XXXXXXXXX, or +<code><number>),
-- or null when it's none of these. Otherwise the same as in 20261002000000_tradingo_email_login.sql.
create or replace function public.tradingo_login_norm(p_login text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when v ~ '^09[0-9]{9}$' then v
    -- An Iranian number written internationally is kept the Iranian way, so it finds its account.
    when v ~ '^\+989[0-9]{9}$' then '0' || substr(v, 4)
    when v ~ '^\+[1-9][0-9]{7,14}$' then v
    when char_length(v) <= 254 and v ~ '^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then v
  end
  from (select lower(btrim(coalesce(p_login, ''))) as v) t
$$;

-- Numbers from any country are installed: the app checks for version 11.
create or replace function public.tradingo_version()
returns integer
language sql
stable
set search_path = ''
as $$ select 11 $$;

revoke all on function public.tradingo_login_norm(text) from public, anon, authenticated;
revoke all on function public.tradingo_version() from public, authenticated;
grant execute on function public.tradingo_version() to anon;

notify pgrst, 'reload schema';
