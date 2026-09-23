import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'chart-patterns',
  title: 'الگوهای نموداری',
  subtitle: 'سر و شانه، دوقلو، مثلث، پرچم',
  description:
    'الگوهای کلاسیک رو بشناس و هدف قیمتی‌شون رو اندازه بگیر: بازگشتی‌ها، ادامه‌دهنده‌ها و کنج‌ها، همراه با شکست فیک.',
  category: 'technical',
  level: 'intermediate',
  ...PALETTE.pink,
  badge: { kind: 'text', text: 'H&S' },
  units: [u1, u2, u3],
};
