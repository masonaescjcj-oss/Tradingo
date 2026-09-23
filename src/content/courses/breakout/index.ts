import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'breakout',
  title: 'استراتژی شکست',
  subtitle: 'شکار حرکت‌های بزرگ',
  description:
    'شکست‌های معتبر رو از فیک جدا کن: فشردگی قبل از شکست، ورود لحظه‌ای یا در پولبک، حجم و مدیریت شکست ناموفق.',
  category: 'strategy',
  level: 'intermediate',
  ...PALETTE.gold,
  badge: { kind: 'glyph', glyph: 'marubozuBull' },
  units: [u1, u2, u3],
};
