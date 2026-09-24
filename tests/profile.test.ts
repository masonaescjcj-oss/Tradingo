import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { parseMessage } from '../src/lib/chat';

const root = join(__dirname, '..');
const read = (f: string) => readFileSync(join(root, f), 'utf8');

describe('profiles', () => {
  it('reads an @ID the way people type it and explains what is wrong with it', async () => {
    const { normalizeUsername, usernameProblem } = await import('../src/lib/profileApi');
    assert.equal(normalizeUsername(' @Mina_FX '), 'mina_fx');
    assert.equal(normalizeUsername('trader۱۲۳'), 'trader123');
    assert.equal(usernameProblem('mina_fx'), null);
    assert.match(usernameProblem('مینا') ?? '', /انگلیسی/);
    assert.match(usernameProblem('ab') ?? '', /حداقل ۳/);
    assert.match(usernameProblem('1abc') ?? '', /با یه حرف انگلیسی شروع/);
    assert.match(usernameProblem('a'.repeat(21)) ?? '', /حداکثر ۲۰/);
    assert.match(usernameProblem('mina-fx') ?? '', /فقط/);
  });

  it('turns a server profile into safe numbers, with a streak that only counts if they were active lately', async () => {
    const { parseProfile } = await import('../src/lib/profileApi');
    const p = parseProfile(
      { name: 'مینا', username: 'mina_fx', avatar: 12, xp: 1240, streak: 6, best_streak: 9, last_active: '2026-09-23', league: 9, enrolled: ['basics', 3], completed: ['a', 'b'], duel_wins: '4' },
      '2026-09-24',
    );
    assert.equal(p.streak, 6);
    assert.equal(p.league, 4);
    assert.deepEqual(p.enrolled, ['basics']);
    assert.equal(p.completed.length, 2);
    assert.equal(p.duelWins, 0);
    assert.equal(parseProfile({ streak: 6, last_active: '2026-09-01' }, '2026-09-24').streak, 0);
  });

  it('keeps the author @ID and picture from the chat server', () => {
    const base = { id: 1, author_name: 'مینا', body: 'سلام', kind: 'text', chart: null, created_at: '2026-09-24T10:00:00Z', mine: false };
    const m = parseMessage({ ...base, author_username: 'mina_fx', author_avatar: 12 });
    assert.equal(m.author_username, 'mina_fx');
    assert.equal(m.author_avatar, 12);
    assert.equal('author_username' in parseMessage(base), false);
  });

  it('has twenty drawn pictures, and the server allows them', () => {
    const avatars = read('src/components/Avatar.tsx');
    const designs = avatars.slice(avatars.indexOf('const DESIGNS'), avatars.indexOf('export const AVATARS'));
    assert.equal(designs.match(/^\s{4}label: '/gm)?.length, 20);
    const sql = read('supabase/migrations/20261003000000_tradingo_profiles.sql');
    assert.match(sql, /check \(avatar between 0 and 40\)/);
  });

  it('gives every account an @ID on the server and shows profiles without the private parts', () => {
    const sql = read('supabase/migrations/20261003000000_tradingo_profiles.sql');
    assert.match(sql, /as \$\$ select 9 \$\$/);
    assert.match(sql, /before insert on public\.tradingo_accounts/);
    assert.match(sql, /update public\.tradingo_accounts set username = public\.tradingo_new_username\(\) where username is null;/);
    assert.match(sql, /grant execute on function public\.tradingo_profile\(text, text\) to anon;/);
    assert.doesNotMatch(sql, /grant [^;]*tradingo_new_username/);
    // The profile never carries the login, trades or balance.
    const profile = sql.slice(sql.indexOf('function public.tradingo_profile'), sql.indexOf('function public.tradingo_chat_messages'));
    assert.doesNotMatch(profile, /'email'|'mobile'|'sim'|balance|password/);
    assert.match(read('src/lib/profileApi.ts'), /serverVersion\(\)\) >= 9/);
  });
});
