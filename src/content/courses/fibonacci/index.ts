import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'fibonacci',
  title: 'فیبوناچی',
  subtitle: 'اصلاح، اکستنشن و همگرایی',
  description:
    'نسبت‌های فیبوناچی رو درست رسم کن: سطوح اصلاحی، ناحیه‌ی طلایی، اکستنشن برای هدف‌گذاری و همگرایی با سطوح دیگه.',
  category: 'technical',
  level: 'intermediate',
  ...PALETTE.gold,
  badge: { kind: 'text', text: 'FIB' },
  units: [u1, u2, u3],
};
