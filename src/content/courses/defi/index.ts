import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'defi',
  title: 'دیفای و امنیت کریپتو',
  subtitle: 'DEX، استخر نقدینگی و ضدکلاه‌برداری',
  description:
    'امن بمون و دیفای رو بفهم: کلاه‌برداری‌های رایج، امنیت حساب، صرافی غیرمتمرکز، استخر نقدینگی و ریسک قراردادها.',
  category: 'markets',
  level: 'intermediate',
  ...PALETTE.lime,
  badge: { kind: 'text', text: 'DeFi' },
  units: [u1, u2, u3],
};
