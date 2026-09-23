import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'price-action',
  title: 'پرایس اکشن',
  subtitle: 'معامله با خود قیمت، بدون اندیکاتور',
  description:
    'قیمت رو خالص بخون: سطوح کلیدی، پین‌بار، اینساید بار، فیک‌بریک و پولبک و ترکیبشون برای ستاپ‌های باکیفیت.',
  category: 'strategy',
  level: 'intermediate',
  ...PALETTE.green,
  badge: { kind: 'glyph', glyph: 'shootingStar' },
  units: [u1, u2, u3],
};
