import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'mean-reversion',
  title: 'بازگشت به میانگین',
  subtitle: 'معامله در بازار رنج',
  description:
    'قیمت همیشه روند نداره: بازار رنج رو تشخیص بده، با بولینگر و RSI کف و سقف رنج رو معامله کن و بدون وقتی رنج شکست.',
  category: 'strategy',
  level: 'intermediate',
  ...PALETTE.teal,
  badge: { kind: 'text', text: 'MR' },
  units: [u1, u2, u3],
};
