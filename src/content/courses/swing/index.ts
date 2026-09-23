import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'swing',
  title: 'سوئینگ ترید',
  subtitle: 'معامله‌های چندروزه روی موج‌ها',
  description:
    'موج‌ها رو شکار کن: شناسایی سوئینگ‌ها، خرید پولبک در روند، برگشت از سطوح روزانه و مدیریت پوزیشن چندروزه.',
  category: 'strategy',
  level: 'intermediate',
  ...PALETTE.lime,
  badge: { kind: 'text', text: 'SW' },
  units: [u1, u2, u3],
};
