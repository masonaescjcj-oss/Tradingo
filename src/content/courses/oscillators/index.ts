import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'oscillators',
  title: 'اسیلاتورها',
  subtitle: 'RSI، MACD، استوکاستیک و واگرایی',
  description:
    'قدرت حرکت رو اندازه بگیر: RSI، MACD و استوکاستیک، اشباع خرید و فروش و مهم‌تر از همه، واگرایی‌ها.',
  category: 'technical',
  level: 'intermediate',
  ...PALETTE.flame,
  badge: { kind: 'text', text: 'RSI' },
  units: [u1, u2, u3],
};
