import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { ProChart, type ProLine } from '@/components/sim/ProChart';
import { CHART_SHIFT } from '@/lib/chartMath';
import { roomTime, type ChatChart, type ChatRoom, type ChatTopic } from '@/lib/chat';
import { findSymbol, type SymbolSpec } from '@/lib/simulator';
import { colors } from '@/theme';
import { fa } from '@/utils/format';

export const TOPIC_LOOK: Record<ChatTopic, { icon: IconName; color: string; ink: string }> = {
  general: { icon: 'chat', color: colors.sky, ink: colors.skyInk },
  beginners: { icon: 'bulb', color: colors.bull, ink: colors.bullInk },
  crypto: { icon: 'layers', color: colors.gold, ink: colors.goldInk },
  forex: { icon: 'swap', color: '#4FD1C5', ink: '#062B28' },
  technical: { icon: 'candles', color: '#FF8A7A', ink: '#3A0E08' },
  psychology: { icon: 'shield', color: '#A78BFA', ink: '#1E1240' },
};

export function TopicAvatar({ topic, size = 48 }: { topic: ChatTopic; size?: number }) {
  const look = TOPIC_LOOK[topic] ?? TOPIC_LOOK.general;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: look.color }]}>
      <Icon name={look.icon} size={size * 0.5} color={look.ink} strokeWidth={2.4} />
    </View>
  );
}

/** The first letter of a name on a colour picked from the name, for message authors. */
export function NameDot({ name, size = 32 }: { name: string; size?: number }) {
  const palette = [colors.sky, colors.bull, colors.gold, '#FF8A7A', '#A78BFA', '#4FD1C5', colors.flame];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette[h % palette.length] }]}>
      <Txt w={900} size={size * 0.45} color={colors.bg}>
        {name.trim().charAt(0) || '؟'}
      </Txt>
    </View>
  );
}

export function RoomRow({ room, onPress, onJoin }: { room: ChatRoom; onPress: () => void; onJoin?: () => void }) {
  const preview = room.last_author
    ? `${room.last_author}: ${room.last_kind === 'analysis' ? 'یه تحلیل با نمودار' + (room.last_body ? ` · ${room.last_body}` : '') : (room.last_body ?? '')}`
    : room.about;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`گروه ${room.title}`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <TopicAvatar topic={room.topic} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.titleLine}>
          <Txt w={900} size={15.5} numberOfLines={1} style={{ flexShrink: 1 }}>
            {room.title}
          </Txt>
          {room.official ? <Icon name="check" size={14} color={colors.sky} strokeWidth={3.2} /> : null}
          <View style={{ flex: 1 }} />
          {room.last_author ? (
            <Txt w={700} size={11.5} color={colors.text3}>
              {roomTime(room.last_message_at)}
            </Txt>
          ) : null}
        </View>
        <View style={styles.titleLine}>
          <Txt w={500} size={13} color={colors.text2} numberOfLines={1} style={{ flex: 1 }}>
            {preview}
          </Txt>
          {room.joined && room.unread > 0 ? (
            <View style={styles.unread}>
              <Txt w={900} size={11.5} color={colors.bullInk}>
                {fa(room.unread)}
              </Txt>
            </View>
          ) : null}
          {!room.joined && onJoin ? (
            <Pressable onPress={onJoin} accessibilityRole="button" accessibilityLabel={`عضویت در ${room.title}`} hitSlop={6} style={styles.join}>
              <Txt w={900} size={12.5} color={colors.bullText}>
                عضویت
              </Txt>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.titleLine}>
          <Icon name="users" size={13} color={colors.text3} strokeWidth={2.2} />
          <Txt w={700} size={11.5} color={colors.text3}>
            {`${fa(room.member_count)} عضو`}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

/** A symbol spec for a shared chart whose symbol this app version doesn't know. */
function specFor(chart: ChatChart): SymbolSpec {
  const known = findSymbol(chart.symbol);
  if (known) return known;
  const last = chart.candles[chart.candles.length - 1][3];
  return { id: chart.symbol, label: chart.label || chart.symbol, market: 'crypto', base: last, decimals: chart.decimals, vol: 1, spread: 0, contract: 1, sizes: [1], sizeUnit: '', step: 1, defaultStop: 1 };
}

const STILL_TOOLS = { ma: true, ma2: false, bands: false, rsi: false, volume: false };

/** A shared analysis drawn with the simulator's own chart: direction, entry, stop, target and levels. */
export function AnalysisChart({ chart, width, height = 190 }: { chart: ChatChart; width: number; height?: number }) {
  const lines: ProLine[] = (chart.levels ?? []).map((p) => ({ price: p, label: 'سطح', color: colors.gold, ink: colors.goldInk }));
  if (chart.tp != null) lines.push({ price: chart.tp, label: 'حد سود', color: colors.bull, ink: colors.bullInk });
  if (chart.entry != null) lines.push({ price: chart.entry, label: 'ورود', color: colors.text2, ink: colors.bg, solid: true });
  if (chart.sl != null) lines.push({ price: chart.sl, label: 'حد ضرر', color: colors.bear, ink: colors.bearInk });
  const badge = chart.side ? (
    <View style={[styles.side, { backgroundColor: chart.side === 'buy' ? colors.bull : colors.bear }]}>
      <Txt w={900} size={11.5} color={chart.side === 'buy' ? colors.bullInk : colors.bearInk}>
        {chart.side === 'buy' ? 'خرید' : 'فروش'}
      </Txt>
    </View>
  ) : null;
  return (
    <View style={styles.still}>
      <ProChart
        spec={specFor(chart)}
        candles={chart.candles}
        price={chart.candles[chart.candles.length - 1][3]}
        lines={lines}
        tools={STILL_TOOLS}
        width={width}
        height={height}
        title={chart.label || chart.symbol}
        badge={badge}
        interactive={false}
        initialCount={chart.candles.length + CHART_SHIFT}
        hidePrice={chart.entry != null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bull,
  },
  join: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.bullSheetLine,
    backgroundColor: colors.bullSheet,
  },
  still: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  side: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 7,
  },
});
