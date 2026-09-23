import { StyleSheet, View } from 'react-native';

import { CandleAnatomy } from '@/components/CandleAnatomy';
import { CandleChart } from '@/components/CandleChart';
import { CandleGlyph } from '@/components/CandleGlyph';
import { Mascot } from '@/components/Mascot';
import { RichText } from '@/components/RichText';
import { SpeechBubble } from '@/components/SpeechBubble';
import { Txt } from '@/components/Txt';
import type { ExampleRow, LearnStep } from '@/content';
import { colors } from '@/theme';
import { useColumnWidth } from '@/utils/layout';

import { DOT_COLOR, QuestionTag, TONE_COLOR } from './common';

/** A reading card that teaches one concept before the questions about it. */
export function LearnCard({ step, topic }: { step: LearnStep; topic: string }) {
  const chartWidth = useColumnWidth() - 32 - 28;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <QuestionTag label={`مفهوم جدید · ${topic}`} icon="bulb" />
        <Txt w={900} size={24} lh={1.6}>
          {step.title}
        </Txt>
      </View>

      <View style={styles.card}>
        <RichText text={step.body} size={16} lh={2} color="#DDE2EC" w={500} />
      </View>

      {step.visual?.kind === 'chart' && (
        <View style={[styles.card, { padding: 12, gap: 8 }]}>
          <Txt w={800} size={13} color={colors.text2}>
            {step.visual.symbol}
          </Txt>
          <CandleChart {...step.visual.chart} width={chartWidth} height={170} />
        </View>
      )}
      {step.visual?.kind === 'glyphs' && (
        <View style={[styles.card, styles.glyphRow]}>
          {step.visual.items.map((g) => (
            <View key={g.label} style={styles.glyph}>
              <CandleGlyph kind={g.glyph} size={64} />
              <Txt w={800} size={13} center color={colors.text2}>
                {g.label}
              </Txt>
            </View>
          ))}
        </View>
      )}
      {step.visual?.kind === 'anatomy' && (
        <View style={[styles.card, { paddingVertical: 20 }]}>
          <CandleAnatomy />
        </View>
      )}

      {step.example && (
        <View style={[styles.card, styles.example]} accessibilityLabel="مثال">
          <View style={styles.exampleTag}>
            <Txt w={900} size={12} color={colors.gold}>
              مثال
            </Txt>
          </View>
          {step.example.rows.map((row) => (
            <Row key={row.label} row={row} />
          ))}
          {step.example.result && (
            <>
              <View style={styles.divider} />
              <Row row={step.example.result} strong />
            </>
          )}
        </View>
      )}

      {step.tip && (
        <View style={styles.tipRow}>
          <Mascot mood="think" size={64} />
          <SpeechBubble style={{ flex: 1 }} background={colors.goldCard} border={colors.goldCardLine}>
            <Txt w={800} size={14} lh={1.8} color="#FFE3A3">
              {step.tip}
            </Txt>
          </SpeechBubble>
        </View>
      )}
    </View>
  );
}

function Row({ row, strong }: { row: ExampleRow; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        {row.dot && <View style={[styles.dot, { backgroundColor: DOT_COLOR[row.dot] }]} />}
        <Txt w={800} size={15} color={strong ? colors.text2 : colors.text}>
          {row.label}
        </Txt>
      </View>
      <Txt mono={row.mono} w={strong ? 900 : 800} size={strong ? 16 : 15} color={row.tone ? TONE_COLOR[row.tone] : colors.text}>
        {row.value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  glyphRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingVertical: 18,
  },
  glyph: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 140,
  },
  example: {
    backgroundColor: colors.surfaceDeep,
    gap: 10,
  },
  exampleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.goldSoft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
