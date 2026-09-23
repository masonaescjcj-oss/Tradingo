import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'crypto',
  title: 'کریپتو از صفر',
  subtitle: 'بیت‌کوین، آلت‌کوین و صرافی',
  description:
    'ارزهای دیجیتال رو از پایه یاد بگیر: بلاک‌چین، بیت‌کوین و آلت‌کوین‌ها، کیف پول، صرافی و نحوه‌ی معامله‌ی امن.',
  category: 'foundations',
  level: 'beginner',
  ...PALETTE.gold,
  badge: { kind: 'text', text: 'BTC' },
  units: [u1, u2, u3],
};
