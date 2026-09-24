import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/Txt';
import { findTool, searchTools, TOOL_CATEGORIES, TOOLS, type ToolCategory, type ToolDef, type ToolId } from '@/lib/drawings';
import { colors, fonts } from '@/theme';
import { fa } from '@/utils/format';

import { ToolIcon } from './ToolIcon';

const COLUMNS = 3;
const GAP = 8;
const PAD = 14;
const MAX_W = 520;
const BORDER = 2;

/**
 * The drawing tools, TradingView style: search, category tabs and a grid of tools.
 * Sits over the chart (not a separate modal, so it also works inside full screen).
 */
export function ToolsSheet({
  width,
  height,
  active,
  count,
  onPick,
  onClose,
  onClearAll,
}: {
  width: number;
  height: number;
  /** The tool being placed, highlighted in the grid. */
  active: ToolId | null;
  /** Drawings on this symbol, for "remove all". */
  count: number;
  onPick: (id: ToolId) => void;
  onClose: () => void;
  onClearAll: () => void;
}) {
  const [category, setCategory] = useState<ToolCategory>(() => (active ? (findTool(active)?.category ?? 'lines') : 'lines'));
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState(false);

  const sheetW = Math.min(width, MAX_W);
  const tileW = Math.floor((sheetW - BORDER * 2 - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const list: ToolDef[] = query.trim() ? searchTools(query) : TOOLS.filter((t) => t.category === category);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={onClose} accessibilityLabel="بستن ابزارهای رسم" />
      <View style={[styles.sheet, { width: sheetW, maxHeight: Math.max(300, height * 0.86) }]} accessibilityViewIsModal>
        <View style={styles.grabber} />
        <View style={styles.head}>
          <Txt w={900} size={17} style={{ flex: 1 }}>
            ابزارهای رسم
          </Txt>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن" hitSlop={8} style={styles.close}>
            <Icon name="close" size={18} color={colors.text2} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <Icon name="search" size={17} color={colors.text3} strokeWidth={2.4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="جستجو: فیبوناچی، کانال، Trend…"
            placeholderTextColor={colors.faint}
            accessibilityLabel="جستجوی ابزار رسم"
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="پاک کردن جستجو" hitSlop={8}>
              <Icon name="close" size={15} color={colors.text3} strokeWidth={2.6} />
            </Pressable>
          ) : null}
        </View>

        {query.trim() ? null : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.tabsScroll}>
            {TOOL_CATEGORIES.map((c) => {
              const on = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [styles.tab, on && styles.tabOn, pressed && { opacity: 0.75 }]}
                >
                  <Txt w={800} size={12.5} color={on ? colors.skyInk : colors.text2}>
                    {c.label}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
          {list.map((t) => {
            const on = t.id === active;
            return (
              <Pressable
                key={t.id}
                onPress={() => onPick(t.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.name} (${t.en})`}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.tile, { width: tileW }, on && styles.tileOn, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
              >
                <ToolIcon tool={t.id} color={on ? colors.skyText : colors.text} />
                <Txt w={800} size={12} center numberOfLines={2} lh={1.35}>
                  {t.name}
                </Txt>
                <Txt mono w={700} size={9} color={colors.text3} center numberOfLines={1}>
                  {t.en}
                </Txt>
              </Pressable>
            );
          })}
          {list.length === 0 ? (
            <Txt w={700} size={13} color={colors.text3} center style={{ width: '100%', paddingVertical: 24 }}>
              ابزاری با این اسم پیدا نشد.
            </Txt>
          ) : null}
        </ScrollView>

        {count > 0 ? (
          <View style={styles.foot}>
            {confirm ? (
              <>
                <Txt w={800} size={12.5} color={colors.text2} style={{ flex: 1 }}>
                  {`همه‌ی ${fa(count)} رسم این نماد پاک بشه؟`}
                </Txt>
                <Pressable
                  onPress={() => {
                    setConfirm(false);
                    onClearAll();
                  }}
                  accessibilityRole="button"
                  style={[styles.footButton, styles.danger]}
                >
                  <Txt w={900} size={12.5} color={colors.bearInk}>
                    پاک کن
                  </Txt>
                </Pressable>
                <Pressable onPress={() => setConfirm(false)} accessibilityRole="button" style={styles.footButton}>
                  <Txt w={900} size={12.5}>
                    نه
                  </Txt>
                </Pressable>
              </>
            ) : (
              <>
                <Txt w={700} size={12} color={colors.text3} style={{ flex: 1 }}>
                  {`${fa(count)} رسم روی این نماد`}
                </Txt>
                <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" accessibilityLabel="حذف همه‌ی رسم‌های این نماد" style={styles.footButton}>
                  <Icon name="trash" size={15} color={colors.bearText} strokeWidth={2.4} />
                  <Txt w={900} size={12.5} color={colors.bearText}>
                    حذف همه
                  </Txt>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(5,8,15,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: BORDER,
    borderBottomWidth: 0,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    paddingTop: 8,
    paddingBottom: 10,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    marginHorizontal: PAD,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  input: {
    flex: 1,
    height: 40,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
    outlineWidth: 0,
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 10,
  },
  tabs: {
    gap: 6,
    paddingHorizontal: PAD,
  },
  tab: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surfaceDeep,
  },
  tabOn: {
    backgroundColor: colors.sky,
    borderColor: colors.sky,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: PAD,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tile: {
    minHeight: 94,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.lineSoft,
    backgroundColor: colors.raised,
  },
  tileOn: {
    borderColor: colors.sky,
    backgroundColor: colors.skySoft,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginHorizontal: PAD,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderColor: colors.lineSoft,
  },
  footButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.raised,
  },
  danger: {
    backgroundColor: colors.bear,
    borderColor: colors.bear,
  },
});
