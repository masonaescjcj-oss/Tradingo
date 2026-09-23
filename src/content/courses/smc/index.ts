import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'smc',
  title: 'اسمارت مانی',
  subtitle: 'ساختار، نقدینگی، اوردربلاک و FVG',
  description:
    'مفاهیم اسمارت مانی به زبان ساده: BOS و CHoCH، نقدینگی و شکار استاپ، اوردربلاک، FVG و یه ستاپ کامل.',
  category: 'strategy',
  level: 'advanced',
  ...PALETTE.violet,
  badge: { kind: 'text', text: 'SMC' },
  units: [u1, u2, u3],
};
