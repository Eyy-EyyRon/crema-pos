import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '../breakpoints';
import { peso0 } from '../format';
import { BanknoteIcon } from '../icons';
import { tapMedium } from '../lib/haptics';
import { ShiftCloseSummary } from '../useCremaPos';
import { colors, fonts } from '../theme';

// Shown right after the drawer is physically closed and before logout. Starting cash,
// expected total, GCash, and variance stay off this screen so the barista has to count
// honestly. Reconciliation is manager-only on cafe-web-dashboard's Staff page.
export function ShiftCloseSummaryModal({
  visible,
  summary,
  onDone,
}: {
  visible: boolean;
  summary: ShiftCloseSummary | null;
  onDone: () => void;
}) {
  const { isTablet, isCompact, width, gutter } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const narrow = width < 360;
  const padH = isCompact ? Math.max(14, gutter) : isTablet ? 32 : narrow ? 16 : 22;
  const padV = isCompact ? 16 : isTablet ? 28 : 22;
  const iconBox = isCompact ? 44 : isTablet ? 64 : 56;
  const cardMax = Math.min(isTablet ? 460 : 400, width - gutter * 2);

  if (!visible || !summary) return null;

  return (
    <View
      style={[
        s.overlay,
        {
          paddingTop: insets.top + (isCompact ? 12 : 24),
          paddingBottom: insets.bottom + (isCompact ? 12 : 24),
          paddingHorizontal: gutter,
        },
      ]}
    >
      <View style={[s.card, { width: cardMax, maxWidth: '100%', paddingHorizontal: padH, paddingVertical: padV }]}>
        <View style={[s.icon, { width: iconBox, height: iconBox, borderRadius: iconBox / 2, marginBottom: isCompact ? 10 : 16 }]}>
          <BanknoteIcon size={isCompact ? 20 : isTablet ? 30 : 26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <Text style={[s.title, isTablet && s.titleTablet, isCompact && { fontSize: 16 }]}>Shift Summary</Text>
        <Text style={[s.sub, isCompact && { marginBottom: 12 }]}>Here's the count you just entered.</Text>

        <View style={[s.rows, isCompact && { marginBottom: 16 }]}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Cash counted</Text>
            <Text style={[s.rowValue, narrow && { fontSize: 12 }]}>{peso0(summary.actualEndingCash)}</Text>
          </View>
        </View>

        <Pressable
          style={[s.btn, { paddingVertical: isCompact ? 12 : 15 }]}
          onPress={() => { tapMedium(); onDone(); }}
          accessibilityRole="button"
          accessibilityLabel="Done, log out"
        >
          <Text style={[s.btnText, { fontSize: isTablet ? 15 : narrow ? 12.5 : 14 }]} numberOfLines={2}>
            {narrow ? 'Done —\nLog Out' : 'Done — Log Out'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.screenBg,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, alignItems: 'center',
  },
  icon: {
    backgroundColor: 'rgba(184,147,90,0.12)',
    borderWidth: 1, borderColor: colors.borderGold25,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontFamily: fonts.sansExtraBold, color: colors.textPrimary, textAlign: 'center' },
  titleTablet: { fontSize: 22 },
  sub: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18, marginBottom: 18 },
  rows: { width: '100%', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowLabel: { flexShrink: 1, fontSize: 12.5, color: colors.textMuted, fontFamily: fonts.sansSemiBold },
  rowValue: { flexShrink: 0, fontSize: 13, color: colors.textPrimary, fontFamily: fonts.sansBold },
  btn: {
    width: '100%', backgroundColor: colors.gold, borderRadius: 14,
    paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  btnText: { fontFamily: fonts.sansExtraBold, color: colors.screenBg, textAlign: 'center' },
});
