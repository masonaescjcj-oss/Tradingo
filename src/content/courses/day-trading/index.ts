import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'day-trading',
  title: 'دی‌تریدینگ',
  subtitle: 'باز و بسته کردن در یک روز',
  description:
    'یه روز معاملاتی حرفه‌ای: آماده‌سازی، رنج آسیا و سقف و کف روز قبل، شکست رنج آغازین، VWAP و مدیریت ریسک روزانه.',
  category: 'strategy',
  level: 'intermediate',
  ...PALETTE.coral,
  badge: { kind: 'text', text: 'DAY' },
  units: [u1, u2, u3],
};
