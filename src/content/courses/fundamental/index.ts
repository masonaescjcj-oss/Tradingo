import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'fundamental',
  title: 'تحلیل فاندامنتال',
  subtitle: 'نرخ بهره، تورم، اشتغال و اخبار',
  description:
    'چرا بازار حرکت می‌کنه؟ بانک‌های مرکزی و نرخ بهره، تورم و اشتغال، تقویم اقتصادی و روابط بین بازارها.',
  category: 'fundamental',
  level: 'intermediate',
  ...PALETTE.sky,
  badge: { kind: 'text', text: '%' },
  units: [u1, u2, u3],
};
