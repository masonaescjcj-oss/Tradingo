import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'volume',
  title: 'حجم معاملات',
  subtitle: 'حجم، OBV، VWAP و ولوم پروفایل',
  description:
    'پشت هر حرکت، حجم هست: تأیید روند و شکست با حجم، اندیکاتورهای حجمی و ولوم پروفایل برای پیدا کردن سطوح مهم.',
  category: 'technical',
  level: 'intermediate',
  ...PALETTE.sky,
  badge: { kind: 'text', text: 'VOL' },
  units: [u1, u2, u3],
};
