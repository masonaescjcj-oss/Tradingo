import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'harmonics',
  title: 'الگوهای هارمونیک',
  subtitle: 'ABCD، گارتلی، خفاش، پروانه، خرچنگ',
  description:
    'الگوهای هندسی با نسبت‌های دقیق فیبوناچی: از ABCD تا گارتلی و خرچنگ، ناحیه‌ی PRZ و مدیریت معامله.',
  category: 'technical',
  level: 'advanced',
  ...PALETTE.pink,
  badge: { kind: 'text', text: 'ABCD' },
  units: [u1, u2, u3],
};
