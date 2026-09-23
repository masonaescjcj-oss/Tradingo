import { useWindowDimensions } from 'react-native';

import { MAX_WIDTH } from '@/theme';

/** Width of the app column: the window on phones, capped on wide web screens. */
export function useColumnWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_WIDTH);
}
