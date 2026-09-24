import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { ROUNDS, type DuelResult } from '@/lib/duel';
import { duelLink } from '@/lib/duelApi';
import { shareText } from '@/lib/shareImage';
import { colors } from '@/theme';
import { fa, usd } from '@/utils/format';

/** A duel waiting for a friend: its code, a share button and the creator's own scores. */
export function InviteCard({ code, mine, fresh }: { code: string; mine: DuelResult | null; fresh?: boolean }) {
  const [note, setNote] = useState<string | null>(null);

  const invite = async () => {
    const outcome = await shareText(`بیا با من دوئل تریدینگو بازی کن! سه راند: سؤال، پیش‌بینی نمودار و معامله. کد دوئل: ${code}`, duelLink(code));
    setNote(outcome === 'copied' ? 'لینک دعوت کپی شد؛ برای دوستت بفرستش.' : outcome === 'failed' ? `کد رو خودت بفرست: ${code}` : null);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Icon name="swords" size={36} color={colors.gold} strokeWidth={2.2} />
        <Txt display size={28} color={colors.gold}>
          {fresh ? 'دوئل ساخته شد!' : 'منتظر حریف'}
        </Txt>
        <Txt w={700} size={14} lh={1.8} color={colors.text2} center>
          لینک رو برای یه دوست بفرست. هر وقت بازی کنه، نتیجه‌ی دوئل همین‌جا و توی «دوئل‌های من» میاد.
        </Txt>
        <View style={styles.code} accessible accessibilityLabel={`کد دوئل ${code.split('').join(' ')}`}>
          <Txt mono w={900} size={30} color={colors.text} style={{ letterSpacing: 6 }}>
            {code}
          </Txt>
        </View>
      </View>
      {mine ? (
        <View style={styles.mine}>
          <Txt w={800} size={13} color={colors.text3}>
            امتیازهای تو
          </Txt>
          <View style={styles.scores}>
            {ROUNDS.map((r) => (
              <View key={r.key} style={styles.score}>
                <Txt mono w={900} size={15}>
                  {r.key === 'trade' ? usd(mine.trade.pnl, true) : r.key === 'quiz' ? fa(mine.quiz.points) : fa(mine.chart.points)}
                </Txt>
                <Txt w={700} size={11} color={colors.text3}>
                  {r.title}
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Button3D variant="gold" onPress={invite} accessibilityLabel="فرستادن دعوت دوئل">
        <View style={styles.row}>
          <Icon name="share" size={18} color={colors.goldInk} strokeWidth={2.6} />
          <Txt w={900} size={17} color={colors.goldInk}>
            فرستادن دعوت
          </Txt>
        </View>
      </Button3D>
      {note ? (
        <Txt w={800} size={13} color={colors.bullText} center>
          {note}
        </Txt>
      ) : null}
      <Button3D variant="secondary" label="دوئل‌های من" onPress={() => router.replace('/duel')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldCardLine,
    backgroundColor: colors.goldCard,
  },
  code: {
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    backgroundColor: colors.bg,
  },
  mine: {
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  scores: {
    flexDirection: 'row',
    gap: 8,
  },
  score: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
