import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { Button3D } from '@/components/Button3D';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ChallengesView } from '@/components/sim/ChallengesView';
import { InfoSheet } from '@/components/sim/InfoSheet';
import { LiveView } from '@/components/sim/LiveView';
import { ReplayView } from '@/components/sim/ReplayView';
import { StatsView } from '@/components/sim/StatsView';
import { ltr, pickNotice, type Notice } from '@/components/sim/text';
import { Toast } from '@/components/sim/Toast';
import { IconButton, Segment, simStyles } from '@/components/sim/ui';
import { useMarketFeed } from '@/components/sim/useMarketFeed';
import { Txt } from '@/components/Txt';
import { symbolsFor } from '@/lib/simulator';
import { START_BALANCE, useGame } from '@/store/game';
import { colors } from '@/theme';
import { usd } from '@/utils/format';
import { useColumnWidth } from '@/utils/layout';

type Mode = 'trade' | 'replay' | 'stats' | 'challenges';

const MODES: { value: Mode; label: string }[] = [
  { value: 'trade', label: 'معامله' },
  { value: 'replay', label: 'بازپخش' },
  { value: 'stats', label: 'آمار' },
  { value: 'challenges', label: 'چالش‌ها' },
];

export default function SimulatorScreen() {
  const market = useGame((s) => s.market);
  const simProcess = useGame((s) => s.simProcess);
  const resetSim = useGame((s) => s.resetSim);
  const resetReplay = useGame((s) => s.resetReplay);
  const columnWidth = useColumnWidth();
  const focused = useIsFocused();
  const specs = useMemo(() => symbolsFor(market), [market]);

  const [mode, setMode] = useState<Mode>('trade');
  const [notice, setNotice] = useState<(Notice & { id: number }) | null>(null);
  const [info, setInfo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const notify = (n: Notice) => setNotice((prev) => ({ ...n, id: (prev?.id ?? 0) + 1 }));

  // Prices keep moving (and orders keep filling) whichever tab of the simulator is open.
  const feed = useMarketFeed((moves, mids) => {
    const n = pickNotice(simProcess(moves, mids));
    if (n) notify(n);
  }, focused);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3800);
    return () => clearTimeout(t);
  }, [notice]);

  const chartWidth = columnWidth - 32 - 28;
  const resetsReplay = mode === 'replay';

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Txt display size={32} style={{ lineHeight: 44 }}>
            شبیه‌ساز
          </Txt>
          <View style={styles.virtual}>
            <Icon name="shield" size={13} color={colors.skyText} strokeWidth={2.8} />
            <Txt w={800} size={12} color={colors.skyText}>
              پول مجازی
            </Txt>
          </View>
        </View>
        <View style={styles.titleRow}>
          <IconButton icon="info" label="راهنمای شبیه‌ساز" onPress={() => setInfo(true)} size={44} />
          <IconButton
            icon="refresh"
            label={resetsReplay ? 'شروع دوباره‌ی حساب بازپخش' : 'شروع دوباره‌ی حساب آزمایشی'}
            onPress={() => setConfirmReset(true)}
            size={44}
          />
        </View>
      </View>

      <View style={styles.tabs}>
        <Segment label="بخش شبیه‌ساز" value={mode} onChange={setMode} options={MODES} />
      </View>

      <ScrollView key={mode} contentContainerStyle={simStyles.content} keyboardShouldPersistTaps="handled">
        {mode === 'trade' ? (
          <LiveView specs={specs} feed={feed} chartWidth={chartWidth} onNotice={notify} onInfo={() => setInfo(true)} />
        ) : mode === 'replay' ? (
          <ReplayView specs={specs} chartWidth={chartWidth} onNotice={notify} onInfo={() => setInfo(true)} />
        ) : mode === 'stats' ? (
          <StatsView width={columnWidth - 32} />
        ) : (
          <ChallengesView onNotice={notify} />
        )}
      </ScrollView>

      {notice ? <Toast key={notice.id} notice={notice} /> : null}

      <InfoSheet visible={info} onClose={() => setInfo(false)} />

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Txt w={900} size={19} center>
              {resetsReplay ? 'حساب بازپخش از اول شروع بشه؟' : 'حساب آزمایشی از اول شروع بشه؟'}
            </Txt>
            <Txt size={14} lh={1.8} color={colors.text2} center>
              {resetsReplay
                ? `بازپخش فعلی و معامله‌هاش پاک می‌شن و موجودی بازپخش به ${ltr(usd(START_BALANCE))} برمی‌گرده.`
                : `همه‌ی معامله‌ها و سفارش‌ها بسته می‌شن، موجودی به ${ltr(usd(START_BALANCE))} برمی‌گرده و چالش‌های نیمه‌کاره از اول شروع می‌شن.`}
            </Txt>
            <Button3D
              label="شروع دوباره"
              onPress={() => {
                if (resetsReplay) resetReplay();
                else resetSim();
                setConfirmReset(false);
              }}
              style={{ alignSelf: 'stretch' }}
            />
            <Button3D label="بی‌خیال" variant="secondary" size={17} onPress={() => setConfirmReset(false)} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  virtual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(90,176,255,0.5)',
  },
  tabs: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
    padding: 22,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
});
