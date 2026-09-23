import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'basics',
  title: 'مبانی ترید',
  subtitle: 'بازار، قیمت و اولین قدم‌ها',
  description:
    'از صفر شروع کن: بازار چطور کار می‌کنه، قیمت از کجا میاد، خرید و فروش یعنی چی و یه تریدر چه ابزارهایی لازم داره.',
  category: 'foundations',
  level: 'beginner',
  ...PALETTE.green,
  badge: { kind: 'glyph', glyph: 'bullish' },
  units: [u1, u2, u3],
};
