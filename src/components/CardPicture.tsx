import { useMemo, type Ref } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { CARD_H, CARD_W, cardLayers, type ShareCard } from '@/lib/shareCard';

/**
 * A share card drawn on the phone: the card's SVG without words, with the words on top as
 * native text so Persian letters join up. The view can be captured as a picture (`ref`).
 */
export function CardPicture({ card, width, ref }: { card: ShareCard; width: number; ref?: Ref<View> }) {
  const { svg, texts } = useMemo(() => cardLayers(card), [card]);
  const scale = width / CARD_W;
  const height = (width * CARD_H) / CARD_W;
  return (
    // Left to right inside, so `left` means the card's left edge in a right-to-left app too.
    <View ref={ref} collapsable={false} style={{ width, height, direction: 'ltr' }}>
      <SvgXml xml={svg} width={width} height={height} />
      {texts.map((item, i) => {
        const size = item.size * scale;
        // A line box around the text, centred where the SVG's letters sit (a little above the baseline).
        const box = size * 1.8;
        const centre = (item.y - item.size * 0.34) * scale;
        const x = item.x * scale;
        // SVG anchors: centred on x, or running right from x (start in LTR, end in RTL), or left of it.
        const half = Math.min(item.x, CARD_W - item.x) * scale;
        const rightward = (item.anchor === 'start') === item.ltr;
        const span = item.anchor === 'middle' ? { left: x - half, width: half * 2 } : rightward ? { left: x, width: width - x } : { left: 0, width: x };
        const align = item.anchor === 'middle' ? 'center' : rightward ? 'left' : 'right';
        return (
          <Text
            key={i}
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              position: 'absolute',
              ...span,
              top: centre - box / 2,
              height: box,
              lineHeight: box,
              fontSize: size,
              fontFamily: item.family,
              color: item.fill,
              opacity: item.opacity,
              textAlign: align,
              textAlignVertical: 'center',
              includeFontPadding: false,
              writingDirection: item.ltr ? 'ltr' : 'rtl',
            }}
          >
            {item.text}
          </Text>
        );
      })}
    </View>
  );
}
