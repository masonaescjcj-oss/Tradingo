import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'supply-demand',
  title: 'عرضه و تقاضا',
  subtitle: 'زون‌های عرضه و تقاضا',
  description:
    'ردپای سفارش‌های بزرگ رو پیدا کن: الگوهای RBR و DBD، رسم زون، سنجیدن کیفیتش و معامله‌ی اصولی با اون.',
  category: 'strategy',
  level: 'intermediate',
  ...PALETTE.sky,
  badge: { kind: 'text', text: 'S/D' },
  units: [u1, u2, u3],
};
