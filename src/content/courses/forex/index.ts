import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'forex',
  title: 'فارکس از صفر',
  subtitle: 'جفت‌ارز، پیپ، لات و سشن‌ها',
  description:
    'بزرگ‌ترین بازار مالی دنیا رو بشناس: جفت‌ارزها، محاسبه‌ی پیپ و لات، اهرم، سشن‌های معاملاتی و هزینه‌های واقعی معامله.',
  category: 'foundations',
  level: 'beginner',
  ...PALETTE.sky,
  badge: { kind: 'text', text: 'FX' },
  units: [u1, u2, u3],
};
