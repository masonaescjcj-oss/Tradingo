import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { loginMethod, loginText, normalizeEmail, normalizeLogin, withLogin } from '../src/lib/login';

describe('email sign-in', () => {
  it('keeps emails in one form: trimmed, lower case, Latin digits, no invisible marks', () => {
    assert.equal(normalizeEmail('  Sara.K@Gmail.COM '), 'sara.k@gmail.com');
    assert.equal(normalizeEmail('ali۱۲۳@yahoo.com'), 'ali123@yahoo.com');
    assert.equal(normalizeEmail('‏name@mail.co‎'), 'name@mail.co');
    assert.equal(normalizeEmail('first+tag@sub.domain.ir'), 'first+tag@sub.domain.ir');
  });

  it('refuses what is not an email', () => {
    for (const input of ['', 'sara', 'sara@', '@gmail.com', 'sara@gmail', 'sara@gmail.c', 'سارا@gmail.com', 'a b@gmail.com', `${'a'.repeat(250)}@x.com`]) {
      assert.equal(normalizeEmail(input), null, input);
    }
  });

  it('reads each tab its own way, with Iranian numbers only for mobiles', () => {
    assert.equal(normalizeLogin('email', 'A@B.co'), 'a@b.co');
    assert.equal(normalizeLogin('mobile', '۰۹۱۲ ۳۴۵ ۶۷۸۹'), '09123456789');
    assert.equal(normalizeLogin('mobile', '+989123456789'), '09123456789');
    assert.equal(normalizeLogin('mobile', '+14155550123'), null);
    assert.equal(normalizeLogin('email', '09123456789'), null);
  });

  it('takes numbers from other countries in the international form, and keeps Iranian ones as 09', async () => {
    const { normalizePhone, loginCountry } = await import('../src/lib/login');
    assert.equal(normalizePhone('GB', '07911 123456'), '+447911123456');
    assert.equal(normalizePhone('GB', '+44 7911 123456'), '+447911123456');
    assert.equal(normalizePhone('DE', '0049 151 2345 6789'), '+4915123456789');
    assert.equal(normalizePhone('AE', '۰۵۰ ۱۲۳ ۴۵۶۷'), '+971501234567');
    assert.equal(normalizePhone('US', '(415) 555-0123'), '+14155550123');
    assert.equal(normalizePhone('IR', '09123456789'), '09123456789');
    assert.equal(normalizePhone('TR', '+989123456789'), '09123456789');
    assert.equal(normalizePhone('GB', '123'), null);
    assert.equal(loginCountry('+447911123456'), 'GB');
    assert.equal(loginCountry('+971501234567'), 'AE');
    assert.equal(loginCountry('09123456789'), 'IR');
    const { COUNTRIES, flagOf } = await import('../src/lib/countries');
    assert.equal(COUNTRIES[0].iso, 'IR');
    assert.equal(new Set(COUNTRIES.map((c) => c.iso)).size, COUNTRIES.length);
    assert.equal(flagOf('IR'), '🇮🇷');
    const sql = readFileSync(join(__dirname, '..', 'supabase/migrations/20261005000000_tradingo_world_phones.sql'), 'utf8');
    assert.match(sql, /as \$\$ select 11 \$\$/);
    assert.match(sql, /when v ~ '\^\\\+989\[0-9\]\{9\}\$' then '0' \|\| substr\(v, 4\)/);
  });

  it('tells a stored email from a number and shows each well', () => {
    assert.equal(loginMethod('a@b.co'), 'email');
    assert.equal(loginMethod('09123456789'), 'mobile');
    assert.equal(loginText('a@b.co'), 'a@b.co');
    assert.equal(loginText('09123456789'), '0912 345 6789');
  });

  it('turns an account saved before email sign-in into one whose login is its number', () => {
    const old = { name: 'سارا', mobile: '09123456789', passwordHash: 'h', createdAt: 1, cloud: true };
    assert.deepEqual(withLogin(old), { name: 'سارا', login: '09123456789', passwordHash: 'h', createdAt: 1, cloud: true });
    assert.deepEqual(withLogin({ name: 'x', login: 'a@b.co' }), { name: 'x', login: 'a@b.co' });
  });

  it('names the email or the number in sign-in errors', async () => {
    const { authErrorText } = await import('../src/lib/cloud');
    assert.equal(authErrorText('invalid_credentials', 'email'), 'ایمیل یا رمز عبور درست نیست.');
    assert.equal(authErrorText('invalid_credentials', 'mobile'), 'شماره موبایل یا رمز عبور درست نیست.');
    assert.equal(authErrorText('email_taken', 'email'), 'با این ایمیل قبلاً حساب ساخته شده؛ وارد شو.');
    assert.equal(authErrorText('invalid_login', 'email'), 'ایمیل درست نیست.');
  });

  it('matches the server: same email rule, register and login for anon, old mobile sign-in kept', () => {
    const sql = readFileSync(join(__dirname, '..', 'supabase/migrations/20261002000000_tradingo_email_login.sql'), 'utf8');
    const app = readFileSync(join(__dirname, '..', 'src/lib/login.ts'), 'utf8');
    const rule = app.match(/const EMAIL = \/(.+)\/;/)?.[1];
    assert.ok(rule);
    assert.ok(sql.includes(`'${rule.replace(/\\\//g, '/')}'`), 'the app and the server check emails the same way');
    assert.match(sql, /grant execute on function public\.tradingo_register\(text, text, text\) to anon;/);
    assert.match(sql, /grant execute on function public\.tradingo_login\(text, text\) to anon;/);
    assert.match(sql, /function public\.tradingo_sign_in\(p_mobile text, p_password text\)/);
    assert.match(readFileSync(join(__dirname, '..', 'src/lib/cloud.ts'), 'utf8'), /v >= 8/);
  });
});
