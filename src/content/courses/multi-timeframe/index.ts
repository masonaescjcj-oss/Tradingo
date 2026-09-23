import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'multi-timeframe',
  title: 'تحلیل چندزمانی',
  subtitle: 'از تایم بالا تا نقطه‌ی ورود',
  description:
    'یه نمودار کافی نیست: روند رو از تایم‌فریم بالا بگیر، سطح رو پیدا کن و ورود رو توی تایم‌فریم پایین دقیق کن.',
  category: 'technical',
  level: 'intermediate',
  ...PALETTE.teal,
  badge: { kind: 'text', text: 'MTF' },
  units: [u1, u2, u3],
};
