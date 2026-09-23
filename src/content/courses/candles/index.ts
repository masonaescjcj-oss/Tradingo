import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'candles',
  title: 'کندل‌شناسی',
  subtitle: 'از آناتومی کندل تا الگوهای سه‌کندلی',
  description:
    'نمودار شمعی رو مثل یه زبان یاد بگیر: آناتومی کندل، الگوهای تک‌کندلی، دوکندلی و سه‌کندلی و مهم‌تر از همه، کانتکست.',
  category: 'technical',
  level: 'beginner',
  ...PALETTE.coral,
  badge: { kind: 'glyph', glyph: 'hammer' },
  units: [u1, u2, u3],
};
