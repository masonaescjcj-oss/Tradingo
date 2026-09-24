import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { ALL_COURSES } from '../src/content';
import { MAX_REPORT_MESSAGE, parseStepRef, REPORT_REASONS } from '../src/lib/reports';
import { practicePool } from '../src/lib/session';

const sql = readFileSync(join(__dirname, '../supabase/migrations/20260928000000_tradingo_reports.sql'), 'utf8');

describe('problem reports', () => {
  it('read a step ref as lesson and step', () => {
    assert.deepEqual(parseStepRef('cd-2:3'), { lesson: 'cd-2', step: 3 });
    assert.deepEqual(parseStepRef('basics-u3-l2:0'), { lesson: 'basics-u3-l2', step: 0 });
    for (const bad of ['', 'cd-2', 'cd-2:', ':3', 'CD 2:3', 'cd-2:abcd', 'cd-2:1234']) assert.equal(parseStepRef(bad), null, bad);
  });

  it('offer exactly the reasons the server accepts', () => {
    const server = /reason in \(([^)]*)\)/.exec(sql)![1].match(/'([a-z]+)'/g)!.map((s) => s.replace(/'/g, ''));
    assert.deepEqual(REPORT_REASONS.map((r) => r.id).sort(), server.sort());
    assert.ok(sql.includes(`char_length(message) <= ${MAX_REPORT_MESSAGE}`));
  });

  it('can point at every step of every lesson', () => {
    const lessonPattern = new RegExp(/lesson_id ~ '(\^\[a-z0-9-\]\{1,80\}\$)'/.exec(sql)![1]);
    for (const c of ALL_COURSES) {
      for (const u of c.units) {
        for (const l of u.lessons) {
          assert.ok(lessonPattern.test(l.id), l.id);
          assert.ok(l.steps.length <= 200, l.id);
          assert.deepEqual(parseStepRef(`${l.id}:${l.steps.length - 1}`), { lesson: l.id, step: l.steps.length - 1 });
        }
      }
    }
  });

  it('works for practice sessions, whose steps come from many lessons', () => {
    const lessonIds = ALL_COURSES[0].units[0].lessons.map((l) => l.id);
    const completed = Object.fromEntries(lessonIds.map((id) => [id, { best: 1, perfect: true }]));
    const pool = practicePool({ completed, activeCourse: ALL_COURSES[0].id, mistakes: [], reviews: {} } as never);
    assert.ok(pool.length > 0);
    for (const s of pool) assert.ok(parseStepRef(s.ref), s.ref);
  });
});
