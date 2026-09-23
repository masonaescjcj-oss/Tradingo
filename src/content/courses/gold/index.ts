import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'gold',
  title: 'طلا، نفت و شاخص‌ها',
  subtitle: 'XAUUSD، نفت و شاخص سهام',
  description:
    'فراتر از ارزها: طلا و عوامل اثرگذار بر اون، نفت و ارزهای کالایی، شاخص‌های سهام و ارتباطشون با کریپتو.',
  category: 'markets',
  level: 'intermediate',
  ...PALETTE.gold,
  badge: { kind: 'text', text: 'XAU' },
  units: [u1, u2, u3],
};
