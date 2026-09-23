import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'ichimoku',
  title: 'ایچیموکو',
  subtitle: 'تنکان، کیجون، ابر کومو و چیکو',
  description:
    'یه سیستم کامل در یک اندیکاتور: اجزای ایچیموکو، سیگنال‌های ابر و کراس‌ها و یه استراتژی روند‌محور.',
  category: 'technical',
  level: 'advanced',
  ...PALETTE.coral,
  badge: { kind: 'text', text: 'ICH' },
  units: [u1, u2, u3],
};
