import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'orders',
  title: 'سفارش‌ها و پلتفرم',
  subtitle: 'انواع سفارش، متاتریدر و حساب',
  description:
    'قبل از اولین معامله‌ی واقعی: همه‌ی انواع سفارش، کار با پلتفرم، مدیریت پوزیشن باز و شناخت حساب و بروکر.',
  category: 'foundations',
  level: 'beginner',
  ...PALETTE.teal,
  badge: { kind: 'text', text: 'B/S' },
  units: [u1, u2, u3],
};
