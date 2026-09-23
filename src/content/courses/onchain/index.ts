import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'onchain',
  title: 'آنچین و توکنومیکس',
  subtitle: 'عرضه‌ی توکن، نهنگ‌ها و چرخه‌ها',
  description:
    'فاندامنتال کریپتو: عرضه و تورم توکن، FDV، داده‌های آنچین مثل جریان صرافی‌ها و نهنگ‌ها، هاوینگ و چرخه‌های بازار.',
  category: 'fundamental',
  level: 'advanced',
  ...PALETTE.gold,
  badge: { kind: 'text', text: 'ON' },
  units: [u1, u2, u3],
};
