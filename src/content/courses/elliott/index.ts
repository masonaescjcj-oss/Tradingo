import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'elliott',
  title: 'داو و امواج الیوت',
  subtitle: 'نظریه‌ی داو، موج‌های محرک و اصلاحی',
  description:
    'ریشه‌های تحلیل تکنیکال: نظریه‌ی داو، ساختار پنج‌موجی الیوت، قوانین طلایی موج‌شماری و الگوهای اصلاحی.',
  category: 'technical',
  level: 'advanced',
  ...PALETTE.violet,
  badge: { kind: 'text', text: 'EW' },
  units: [u1, u2, u3],
};
