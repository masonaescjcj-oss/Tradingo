import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'leverage',
  title: 'فیوچرز و اهرم',
  subtitle: 'پرپچوال، فاندینگ و لیکوئید',
  description:
    'معاملات آتی بدون قمار: قرارداد پرپچوال، لانگ و شورت، فاندینگ ریت، مارجین کراس و ایزوله و قیمت لیکوئید.',
  category: 'risk',
  level: 'intermediate',
  ...PALETTE.coral,
  badge: { kind: 'text', text: 'x10' },
  units: [u1, u2, u3],
};
