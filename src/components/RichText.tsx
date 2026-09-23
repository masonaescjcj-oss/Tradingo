import { Text } from 'react-native';

import { colors, fonts } from '@/theme';

import { Txt, type TxtProps } from './Txt';

type Props = Omit<TxtProps, 'children'> & { text: string; highlight?: string; highlightBg?: string };

/** Renders copy where **words** are shown as highlighted key terms. */
export function RichText({ text, highlight = colors.gold, highlightBg = 'rgba(255,197,61,0.12)', ...rest }: Props) {
  const parts = text.split('**');
  return (
    <Txt {...rest}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontFamily: fonts.black, color: highlight, backgroundColor: highlightBg }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Txt>
  );
}
