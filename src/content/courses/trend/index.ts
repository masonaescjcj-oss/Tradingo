import { PALETTE } from '../../palette';
import type { Course } from '../../types';

import { u1 } from './u1';
import { u2 } from './u2';
import { u3 } from './u3';

export const course: Course = {
  id: 'trend',
  title: 'روند، حمایت و مقاومت',
  subtitle: 'روند، خط روند، کانال و ساختار',
  description:
    'مهم‌ترین مهارت تکنیکال: تشخیص روند، رسم حمایت و مقاومت، خط روند و کانال و خوندن ساختار سقف‌ها و کف‌ها.',
  category: 'technical',
  level: 'beginner',
  ...PALETTE.violet,
  badge: { kind: 'text', text: 'S/R' },
  units: [u1, u2, u3],
};
