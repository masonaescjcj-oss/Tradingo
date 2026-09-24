import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { layoutDir, t, textStart } from '@/i18n';
import { DRAW_COLORS, type Drawing, type Shape } from '@/lib/drawings';
import { colors, fonts } from '@/theme';

/** A drawing with its shapes in screen space, ready to draw. */
export type DrawnItem = { d: Drawing; shapes: Shape[]; handles: { x: number; y: number }[]; selected: boolean };

const INK = '#06090F';
const PERSIAN = /[؀-ۿ]/; // i18n-ignore: detects Persian in the learner's own text
const f1 = (v: number) => v.toFixed(1);

/** An arrowhead at (x2, y2) pointing away from (x1, y1). */
function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 9): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d: number) => `${f1(x2 - size * Math.cos(a + d))},${f1(y2 - size * Math.sin(a + d))}`;
  return `${f1(x2)},${f1(y2)} ${p(0.45)} ${p(-0.45)}`;
}

function markerPath(kind: 'up' | 'down' | 'flag' | 'pin' | 'dot', x: number, y: number): string {
  switch (kind) {
    case 'up':
      return `M${f1(x)} ${f1(y)}l8 10h-4.5v10h-7v-10h-4.5z`;
    case 'down':
      return `M${f1(x)} ${f1(y)}l8 -10h-4.5v-10h-7v10h-4.5z`;
    case 'flag':
      return `M${f1(x)} ${f1(y - 26)}h16l-4.5 6l4.5 6h-16z`;
    case 'pin':
      return `M${f1(x)} ${f1(y)}c-2.5-6-9-9.5-9-16a9 9 0 1 1 18 0c0 6.5-6.5 10-9 16z`;
    case 'dot':
      return `M${f1(x - 4)} ${f1(y)}a4 4 0 1 0 8 0a4 4 0 1 0 -8 0`;
  }
}

/** The drawings' lines and fills; sits over the candles, clipped to the plot. */
export function DrawingSvg({ items, width, height }: { items: DrawnItem[]; width: number; height: number }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { width, height }]}>
      <Svg width={width} height={height}>
        {items.map(({ d, shapes, handles, selected }) => (
          <DrawingShapes key={d.id} d={d} shapes={shapes} handles={handles} selected={selected} />
        ))}
      </Svg>
    </View>
  );
}

function DrawingShapes({ d, shapes, handles, selected }: Omit<DrawnItem, 'd'> & { d: Drawing }) {
  const bold = selected ? 0.6 : 0;
  return (
    <>
      {shapes.map((s, i) => {
        const color = ('color' in s && s.color) || d.color;
        switch (s.kind) {
          case 'line':
            return (
              <G key={i}>
                <Line
                  x1={s.x1}
                  y1={s.y1}
                  x2={s.x2}
                  y2={s.y2}
                  stroke={color}
                  strokeWidth={(s.width ?? 1.6) + bold}
                  strokeDasharray={s.dash ? '5 4' : undefined}
                  strokeLinecap="round"
                  opacity={s.opacity ?? 1}
                />
                {s.arrow ? <Polygon points={arrowHead(s.x1, s.y1, s.x2, s.y2)} fill={color} opacity={s.opacity ?? 1} /> : null}
              </G>
            );
          case 'poly': {
            if (s.points.length === 0) return null;
            const pts = s.points.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
            const stroke = s.noStroke ? 'none' : color;
            const last = s.points.length > 1 ? [s.points[s.points.length - 2], s.points[s.points.length - 1]] : null;
            return (
              <G key={i}>
                {s.closed ? (
                  <Polygon points={pts} fill={s.fillOpacity ? color : 'none'} fillOpacity={s.fillOpacity ?? 0} stroke={stroke} strokeWidth={(s.width ?? 1.6) + bold} strokeLinejoin="round" />
                ) : (
                  <Polyline
                    points={pts}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={(s.width ?? 1.6) + bold}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeOpacity={s.opacity ?? 1}
                  />
                )}
                {s.arrow && last ? <Polygon points={arrowHead(last[0][0], last[0][1], last[1][0], last[1][1])} fill={color} /> : null}
              </G>
            );
          }
          case 'rect':
            return (
              <Rect
                key={i}
                x={s.x}
                y={s.y}
                width={Math.max(0.5, s.w)}
                height={Math.max(0.5, s.h)}
                fill={color}
                fillOpacity={s.fillOpacity}
                stroke={s.stroke ? color : 'none'}
                strokeWidth={1.5 + bold}
              />
            );
          case 'ellipse':
            return <Ellipse key={i} cx={s.cx} cy={s.cy} rx={Math.max(0.5, s.rx)} ry={Math.max(0.5, s.ry)} fill={color} fillOpacity={s.fillOpacity} stroke={color} strokeWidth={1.6 + bold} />;
          case 'marker':
            return (
              <G key={i}>
                {s.marker === 'flag' ? <Line x1={s.x} y1={s.y} x2={s.x} y2={s.y - 26} stroke={color} strokeWidth={2} strokeLinecap="round" /> : null}
                <Path d={markerPath(s.marker, s.x, s.y)} fill={color} stroke={selected ? '#fff' : 'none'} strokeWidth={1} />
                {s.marker === 'pin' ? <Circle cx={s.x} cy={s.y - 16} r={3.4} fill={INK} /> : null}
              </G>
            );
          default:
            return null;
        }
      })}
      {handles.map((h, i) => (
        <Circle key={`h${i}`} cx={h.x} cy={h.y} r={5.5} fill="#090D15" stroke={selected ? '#fff' : d.color} strokeWidth={2} />
      ))}
    </>
  );
}

/** The drawings' text: level names, measurements, notes, and price tags on the axis. */
export function DrawingLabels({
  items,
  width,
  height,
  axisLeft,
  axisWidth,
}: {
  items: DrawnItem[];
  width: number;
  height: number;
  axisLeft: number;
  axisWidth: number;
}) {
  const labels: ReactNode[] = [];
  const tags: ReactNode[] = [];
  for (const { d, shapes } of items) {
    shapes.forEach((s, i) => {
      const key = `${d.id}-${i}`;
      if (s.kind === 'tag') {
        if (s.y < 0 || s.y > height) return;
        tags.push(
          <View key={key} style={[styles.tag, { left: axisLeft, width: axisWidth, top: s.y - 9, backgroundColor: d.color }]}>
            <Txt mono w={800} size={10.5} color={INK}>
              {s.text}
            </Txt>
          </View>,
        );
        return;
      }
      if (s.kind !== 'label') return;
      const color = s.color ?? d.color;
      const size = s.size ?? 11;
      const persian = PERSIAN.test(s.text);
      // Measurements mix numbers with a Persian word, so they read left to right either way.
      const dirProps = s.mono && persian && Platform.OS === 'web' ? ({ dir: 'ltr' } as object) : null;
      const text = (
        <Txt {...dirProps} mono={s.mono && !persian} w={800} size={size} color={s.box ? INK : color} numberOfLines={3}>
          {s.text}
        </Txt>
      );
      const inner = <View style={[styles.label, s.box ? { backgroundColor: color } : styles.labelPlain]}>{text}</View>;
      const wide = 260;
      const pos =
        s.align === 'center'
          ? { left: s.x - wide / 2, width: wide, alignItems: 'center' as const }
          : s.align === 'end'
            ? { left: s.x - wide, width: wide, alignItems: 'flex-end' as const }
            : { left: s.x, width: wide, alignItems: 'flex-start' as const };
      labels.push(
        <View key={key} style={[styles.abs, pos, { top: s.y }]}>
          {inner}
        </View>,
      );
    });
  }
  return (
    <>
      <View pointerEvents="none" style={[styles.abs, styles.clip, { width, height }]}>
        {labels}
      </View>
      <View pointerEvents="none" style={styles.abs}>
        {tags}
      </View>
    </>
  );
}

/** What to do next while placing a tool, with cancel (and "done" for open-ended tools). */
export function PlaceBar({ name, hint, onCancel, onDone }: { name: string; hint: string; onCancel: () => void; onDone?: () => void }) {
  return (
    <View style={[styles.bar, { direction: layoutDir() }]}>
      <View style={{ flexShrink: 1 }}>
        <Txt w={900} size={12.5}>
          {name}
        </Txt>
        <Txt w={700} size={11.5} color={colors.text2}>
          {hint}
        </Txt>
      </View>
      {onDone ? (
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel={t('تمام کردن رسم')} hitSlop={6} style={[styles.barButton, styles.barDone]}>
          <Txt w={900} size={12.5} color={colors.bullInk}>
            {t('تمام')}
          </Txt>
        </Pressable>
      ) : null}
      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('لغو رسم')} hitSlop={6} style={styles.barButton}>
        <Txt w={900} size={12.5} color={colors.text}>
          {t('لغو')}
        </Txt>
      </Pressable>
    </View>
  );
}

/** Colour, text and delete for the selected drawing, like TradingView's floating toolbar. */
export function SelectedBar({
  color,
  onColor,
  onText,
  onDelete,
  onDone,
}: {
  color: string;
  onColor: (c: string) => void;
  onText?: () => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  return (
    <View style={[styles.bar, { direction: layoutDir() }]} accessibilityLabel={t('ویرایش رسم انتخاب‌شده')}>
      <View style={styles.swatches}>
        {DRAW_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => onColor(c)}
            accessibilityRole="radio"
            accessibilityState={{ checked: c === color }}
            accessibilityLabel={t('رنگ {color}', { color: c })}
            hitSlop={3}
            style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}
          />
        ))}
      </View>
      <View style={styles.divider} />
      {onText ? (
        <Pressable onPress={onText} accessibilityRole="button" accessibilityLabel={t('ویرایش متن')} hitSlop={4} style={styles.iconButton}>
          <Icon name="pencil" size={17} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      ) : null}
      <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('حذف رسم')} hitSlop={4} style={styles.iconButton}>
        <Icon name="trash" size={17} color={colors.bearText} strokeWidth={2.4} />
      </Pressable>
      <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel={t('بستن ویرایش')} hitSlop={4} style={styles.iconButton}>
        <Icon name="check" size={17} color={colors.bullText} strokeWidth={2.8} />
      </Pressable>
    </View>
  );
}

/** Asks for the words of a text, note or callout. */
export function TextPrompt({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  const ok = text.trim().length > 0;
  return (
    <View style={[styles.bar, styles.prompt, { direction: layoutDir() }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('متن رو بنویس…')}
        placeholderTextColor={colors.faint}
        autoFocus
        maxLength={80}
        onSubmitEditing={() => ok && onSubmit(text.trim())}
        returnKeyType="done"
        accessibilityLabel={t('متن رسم')}
        style={[styles.input, { textAlign: textStart(), writingDirection: textStart() === 'left' ? 'ltr' : 'rtl' }]}
      />
      <Pressable
        onPress={() => ok && onSubmit(text.trim())}
        accessibilityRole="button"
        accessibilityLabel={t('ثبت متن')}
        accessibilityState={{ disabled: !ok }}
        hitSlop={6}
        style={[styles.barButton, styles.barDone, !ok && { opacity: 0.5 }]}
      >
        <Txt w={900} size={12.5} color={colors.bullInk}>
          {t('ثبت')}
        </Txt>
      </Pressable>
      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel={t('لغو')} hitSlop={6} style={styles.barButton}>
        <Txt w={900} size={12.5} color={colors.text}>
          {t('لغو')}
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  clip: {
    overflow: 'hidden',
  },
  label: {
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  labelPlain: {
    backgroundColor: 'rgba(9,13,21,0.55)',
  },
  tag: {
    position: 'absolute',
    height: 18,
    paddingLeft: 5,
    borderRadius: 3,
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: 'rgba(23,31,49,0.96)',
  },
  barButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.raised,
  },
  barDone: {
    backgroundColor: colors.bull,
    borderColor: colors.bull,
  },
  swatches: {
    flexDirection: 'row',
    gap: 7,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: '#fff',
  },
  divider: {
    width: 1.5,
    height: 22,
    backgroundColor: colors.line,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
    outlineWidth: 0,
  },
});
