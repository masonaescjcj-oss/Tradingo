import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');
const SQL = read('supabase/migrations/20261004000000_tradingo_blocks.sql');

describe('blocking and AI answer reports', () => {
  it('hides blocked people from the one who blocked them only, and never lets the app read the lists directly', () => {
    assert.match(SQL, /as \$\$ select 10 \$\$/);
    const messages = SQL.slice(SQL.indexOf('function public.tradingo_chat_messages'), SQL.indexOf('function public.tradingo_profile'));
    assert.match(messages, /b\.blocker_id = v_account and b\.blocked_id = x\.account_id/);
    assert.match(messages, /v_account is null or not exists/);
    assert.match(SQL, /revoke all on public\.tradingo_user_blocks, public\.tradingo_ai_reports from anon, authenticated;/);
    assert.match(SQL, /check \(blocker_id <> blocked_id\)/);
    // Blocks and reports go with the account when it's deleted.
    assert.match(SQL, /blocked_id uuid not null references public\.tradingo_accounts \(id\) on delete cascade/);
  });

  it('keeps reported AI answers for admins only, with a daily cap', () => {
    const list = SQL.slice(SQL.indexOf('function public.tradingo_admin_ai_reports'), SQL.indexOf('function public.tradingo_admin_ai_report_done'));
    assert.match(list, /tradingo_admin_or_null/);
    assert.match(SQL, /interval '1 day'\) >= 20/);
  });

  it('offers the same report reasons in the app as the server accepts', async () => {
    const { ANSWER_REPORT_REASONS } = await import('../src/lib/coachApi');
    const ids = ANSWER_REPORT_REASONS.map((r) => r.id).sort();
    assert.deepEqual(ids, ['advice', 'offensive', 'other', 'wrong']);
    for (const id of ids) assert.match(SQL, new RegExp(`'${id}'`));
    const { AI_REPORT_REASON, logText } = await import('../src/lib/adminApi');
    assert.deepEqual(Object.keys(AI_REPORT_REASON).sort(), ids);
    assert.equal(logText('ai_report_done', 'بهرام'), 'گزارش بهرام درباره‌ی جواب هوش مصنوعی رو بررسی کرد');
  });

  it('reads the blocked flag of a profile', async () => {
    const { parseProfile } = await import('../src/lib/profileApi');
    assert.equal(parseProfile({ blocked: true }).blocked, true);
    assert.equal(parseProfile({}).blocked, false);
  });
});
