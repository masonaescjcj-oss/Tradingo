import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'risk',
  title: 'مدیریت ریسک',
  subtitle: 'حد ضرر، ریوارد و حجم معامله',
  description:
    'مهم‌ترین درس ترید: چطور زنده بمونی. حد ضرر، نسبت ریسک به ریوارد، حجم معامله، ریاضی ضرر و ریسک کل پرتفو.',
  category: 'risk',
  level: 'beginner',
  ...PALETTE.flame,
  badge: { kind: 'text', text: '2%' },
  units: [u1, u2, u3],
};
