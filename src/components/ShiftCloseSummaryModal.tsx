import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { peso0 } from '../format';
import { BanknoteIcon } from '../icons';
import { tapMedium } from '../lib/haptics';
import { ShiftCloseSummary } from '../useCremaPos';
import { colors, fonts } from '../theme';

// Shown right after the drawer is physically closed and before logout — deliberately just a
// receipt of what the barista themselves already knew (their starting float, and the ending
// count they just entered), not the get_cash_drawer_reconciliation() reconciliation. Keeping
// expected/GCash/variance out of this view is the point: a barista who can see the expected
// number can just type it back instead of actually counting. That reconciliation stays
// manager-only, reviewed on cafe-web-dashboard's Staff page.
export function ShiftCloseSummaryModal({
  visible,
  summary,
  onDone,
}: {
  visible: boolean;
  summary: ShiftCloseSummary | null;
  onDone: () => void;
}) {
  if (!visible || !summary) return null;

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.icon}>
          <BanknoteIcon size={26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <Text style={s.title}>Shift Summary</Text>
        <Text style={s.sub}>Here's a record of your shift.</Text>

        <View style={s.rows}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Starting Cash</Text>
            <Text style={s.rowValue}>{peso0(summary.startingCash)}</Text>
          </View>
          <View style={[s.row, s.rowDivider]}>
            <Text style={s.rowLabel}>Actual Ending Cash</Text>
            <Text style={s.rowValue}>{peso0(summary.actualEndingCash)}</Text>
          </View>
        </View>

        <Pressable style={s.btn} onPress={() => { tapMedium(); onDone(); }} accessibilityRole="button" accessibilityLabel="Done, log out">
          <Text style={s.btnText}>Done — Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 55,
    alignItems: 'center', justifyContent: 'center', padding: 30,
    backgroundColor: colors.screenBg,
  },
  card: {
    width: 380, maxWidth: '100%',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, padding: 26, alignItems: 'center',
  },
  icon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(184,147,90,0.12)',
    borderWidth: 1, borderColor: colors.borderGold25,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  sub: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18, marginBottom: 18 },
  rows: { width: '100%', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 4, paddingTop: 10 },
  rowLabel: { fontSize: 12.5, color: colors.textMuted, fontFamily: fonts.sansSemiBold },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontFamily: fonts.sansBold },
  btn: {
    width: '100%', backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  btnText: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.screenBg },
});
