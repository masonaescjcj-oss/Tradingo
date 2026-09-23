import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'scalping',
  title: 'اسکالپینگ',
  subtitle: 'معامله‌های چنددقیقه‌ای',
  description:
    'سریع‌ترین سبک معامله: هزینه‌ها و زمان مناسب اسکالپ، ستاپ‌های EMA و سطوح و انضباطی که اسکالپر لازم داره.',
  category: 'strategy',
  level: 'advanced',
  ...PALETTE.flame,
  badge: { kind: 'text', text: '1M' },
  units: [u1, u2, u3],
};
