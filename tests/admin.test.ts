import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { mutedNotice, parseMessage, untilText } from '../src/lib/chat';

const MIGRATION = readFileSync(join(__dirname, '..', 'supabase/migrations/20260930000000_tradingo_admin.sql'), 'utf8');

describe('admin panel', () => {
  it('tells a muted learner how long their chat stays closed', () => {
    const now = Date.UTC(2026, 8, 24, 12, 0);
    assert.equal(untilText(new Date(now + 30 * 60_000).toISOString(), now), 'تا کمتر از یه ساعت دیگه');
    assert.equal(untilText(new Date(now + 5 * 3_600_000).toISOString(), now), 'تا ۵ ساعت دیگه');
    assert.equal(untilText(new Date(now + 7 * 86_400_000).toISOString(), now), 'تا ۷ روز دیگه');
    assert.equal(untilText(new Date(now - 1000).toISOString(), now), '');
    assert.match(mutedNotice('forever', now), /^امکان فرستادن پیام برات بسته شده/);
    assert.match(mutedNotice(new Date(now + 2 * 3_600_000).toISOString(), now), /تا ۲ ساعت دیگه برات بسته شده/);
  });

  it('keeps the author account only when the server sends it (to admins)', () => {
    const base = { id: 7, author_name: 'مینا', body: 'سلام', kind: 'text', chart: null, created_at: '2026-09-24T10:00:00Z', mine: false };
    assert.equal('author_id' in parseMessage(base), false);
    assert.equal(parseMessage({ ...base, author_id: 'a-1' }).author_id, 'a-1');
    assert.equal('author_id' in parseMessage({ ...base, author_id: null }), false);
  });

  it('writes the admin log as plain Persian sentences', async () => {
    const { logDetail, logText } = await import('../src/lib/adminApi');
    assert.equal(logText('mute', 'سارا'), 'چت سارا رو بست');
    assert.equal(logText('ban', null), 'یه حساب حذف‌شده رو مسدود کرد');
    assert.equal(logDetail('mute', '24h · فحش'), '۲۴ ساعت · فحش');
    assert.equal(logDetail('mute', 'forever'), 'همیشه');
    assert.equal(logDetail('ban', 'اسپم'), 'اسپم');
  });

  it('shows only the time for today and the day too for older times', async () => {
    const { whenText } = await import('../src/lib/chat');
    const now = new Date(2026, 8, 24, 18, 0);
    assert.equal(whenText(new Date(2026, 8, 24, 9, 5).toISOString(), now), '۰۹:۰۵');
    assert.equal(whenText(new Date(2026, 8, 23, 9, 5).toISOString(), now), 'دیروز ۰۹:۰۵');
  });

  it('matches the server version the app looks for, and never hands the AI key to the app', async () => {
    assert.match(MIGRATION, /as \$\$ select 6 \$\$/);
    assert.match(readFileSync(join(__dirname, '..', 'src/lib/adminApi.ts'), 'utf8'), /serverVersion\(\)\) >= 6/);
    // Only the Edge Function (service role) gets the gate that carries the key.
    assert.match(MIGRATION, /grant execute on function public\.tradingo_ai_gate\(text, boolean, integer\) to service_role;/);
    assert.doesNotMatch(MIGRATION, /grant execute on function public\.tradingo_ai_gate[^;]*to anon/);
    const status = MIGRATION.slice(MIGRATION.indexOf('function public.tradingo_ai_status()'), MIGRATION.indexOf('function public.tradingo_admin_user_json'));
    assert.match(status, /right\(value, 4\)/);
    assert.doesNotMatch(status, /'api_key'/);
  });

  it('lists every group, and deletes only the ones learners made', async () => {
    const sql = readFileSync(join(__dirname, '..', 'supabase/migrations/20261001000000_tradingo_admin_rooms.sql'), 'utf8');
    assert.match(sql, /as \$\$ select 7 \$\$/);
    assert.match(sql, /if v_room\.official then/);
    const { logText } = await import('../src/lib/adminApi');
    assert.equal(logText('delete_room', 'رضا'), 'یه گروه از رضا رو حذف کرد');
  });

  it('makes the owner an admin from the server list only, with nothing in the app that shows it', async () => {
    const sql = readFileSync(join(__dirname, '..', 'supabase/migrations/20261002000000_tradingo_email_login.sql'), 'utf8');
    assert.match(sql, /as \$\$ select 8 \$\$/);
    // The list can't be read or changed through the API, and the setup code is gone.
    assert.match(sql, /revoke all on public\.tradingo_admin_logins from anon, authenticated;/);
    assert.match(sql, /revoke all on function public\.tradingo_owner_check\(uuid\) from public, anon, authenticated;/);
    assert.doesNotMatch(sql, /grant [^;]*tradingo_owner_check/);
    assert.match(sql, /drop function if exists public\.tradingo_admin_claim\(text, text\);/);
    assert.match(sql, /delete from public\.tradingo_settings where key = 'admin_claim_hash';/);
    // Checked on every sign-in and status call, and never for a banned account.
    assert.equal(sql.match(/perform public\.tradingo_owner_check\(/g)?.length, 3);
    assert.match(sql, /and a\.banned_at is null/);
    const app = ['src/app/account.tsx', 'src/lib/adminApi.ts', 'src/components/auth/SignupForm.tsx', 'src/components/auth/LoginForm.tsx']
      .map((f) => readFileSync(join(__dirname, '..', f), 'utf8'))
      .join('\n');
    assert.doesNotMatch(app, /tradingo_admin_claim|کد راه‌اندازی|admin_logins/);
    const { logText } = await import('../src/lib/adminApi');
    assert.equal(logText('owner_admin', 'اسحاق'), 'با حساب مالک وارد شد و مدیر شد');
  });
});
