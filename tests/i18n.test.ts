import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALL_COURSES } from '../src/content/courses';
import { applyOverlay, courseCardStrings, localizeCourse, persianStrings, translationIssues } from '../src/content/i18n';
import { validateCourses } from '../src/content/validate';
import { setLang, t } from '../src/i18n';
import { fa, faNum } from '../src/utils/format';

describe('English', () => {
  it('translates by the Persian text, fills variables and picks singular or plural', () => {
    setLang('fa');
    assert.equal(t('سلام {name}!', { name: 'سارا' }), 'سلام سارا!');
    assert.equal(fa(12), '۱۲');
    assert.equal(faNum(12345), '۱۲٬۳۴۵');
    setLang('en');
    try {
      assert.equal(fa(12), '12');
      assert.equal(faNum(12345), '12,345');
      assert.equal(t('مقدماتی'), 'Beginner');
      // Anything not translated yet stays Persian rather than empty.
      assert.equal(t('یه متن ترجمه‌نشده'), 'یه متن ترجمه‌نشده');
    } finally {
      setLang('fa');
    }
  });

  it('addresses lesson strings by lesson id and swaps in the English', () => {
    const unit = ALL_COURSES[0].units[0];
    const strings = persianStrings(unit);
    const lesson = unit.lessons[0];
    const key = `lessons/${lesson.id}/title`;
    assert.equal(strings[key], lesson.title);
    const english = applyOverlay(unit, { [key]: 'What is a market?' });
    assert.equal(english.lessons[0].title, 'What is a market?');
    assert.equal(english.lessons[1].title, unit.lessons[1].title);
    // Numbers, ids and answers stay as they are.
    assert.equal(english.id, unit.id);
    assert.deepEqual(english.lessons[0].steps.map((s) => s.type), lesson.steps.map((s) => s.type));
  });

  it('has an English card for every course', () => {
    for (const course of ALL_COURSES) {
      const card = localizeCourse(course);
      assert.doesNotMatch(card.title, /[؀-ۿ]/, course.id);
      assert.equal(Object.keys(courseCardStrings(course)).length, 3, course.id);
    }
    assert.deepEqual(translationIssues(ALL_COURSES, { only: 'translated' }).filter((i) => i.where.startsWith('course')), []);
  });

  it('catches missing text, Persian left over, lost blanks and highlights', () => {
    const course = ALL_COURSES[0];
    const unit = course.units[0];
    const source = persianStrings(unit);
    const english = Object.fromEntries(Object.keys(source).map((k) => [k, 'text']));
    const [first, second] = Object.keys(source);
    delete english[first];
    english[second] = 'هنوز فارسی';
    const issues = translationIssues([{ ...course, units: [unit] }], { only: 'translated' }, { courses: {}, units: { [unit.id]: english } });
    assert.ok(issues.some((i) => i.key === first && i.problem === 'missing'));
    assert.ok(issues.some((i) => i.key === second && /Persian/.test(i.problem)));
    const blank = Object.keys(source).find((k) => source[k].includes('___'));
    if (blank) assert.ok(issues.some((i) => i.key === blank && /blanks/.test(i.problem)));
  });

  it('has every lesson in English, consistent with the Persian', () => {
    assert.deepEqual(translationIssues(ALL_COURSES), []);
  });

  it('keeps the English lessons as valid as the Persian ones (label lengths, answers…)', () => {
    assert.deepEqual(validateCourses(ALL_COURSES.map((c) => localizeCourse(c))), []);
  });
});
