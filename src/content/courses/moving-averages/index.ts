import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'moving-averages',
  title: 'میانگین متحرک',
  subtitle: 'SMA، EMA، کراس‌ها و بولینگر',
  description:
    'محبوب‌ترین اندیکاتور دنیا: میانگین ساده و نمایی، حمایت و مقاومت پویا، کراس طلایی و باندهای بولینگر.',
  category: 'technical',
  level: 'intermediate',
  ...PALETTE.lime,
  badge: { kind: 'text', text: 'MA' },
  units: [u1, u2, u3],
};
