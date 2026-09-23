import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'trading-system',
  title: 'سیستم معاملاتی و بک‌تست',
  subtitle: 'آمار، امید ریاضی و تست',
  description:
    'از سلیقه به سیستم: قوانین قابل‌اندازه‌گیری، وین‌ریت و امید ریاضی، دراوداون، بک‌تست و فوروارد تست.',
  category: 'strategy',
  level: 'advanced',
  ...PALETTE.green,
  badge: { kind: 'text', text: 'SYS' },
  units: [u1, u2, u3],
};
