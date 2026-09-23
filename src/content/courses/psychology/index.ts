import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'psychology',
  title: 'روانشناسی ترید',
  subtitle: 'ترس، طمع، سوگیری و انضباط',
  description:
    'بازی اصلی توی ذهنته: ترس و طمع، سوگیری‌های ذهنی، معامله‌ی انتقامی، روتین، ژورنال و ذهنیت احتمالی.',
  category: 'risk',
  level: 'beginner',
  ...PALETTE.teal,
  badge: { kind: 'text', text: 'PSY' },
  units: [u1, u2, u3],
};
