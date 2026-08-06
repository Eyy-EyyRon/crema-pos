import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { peso0 } from '../format';
import { BanknoteIcon } from '../icons';
import { tapMedium } from '../lib/haptics';
import { ShiftCloseSummary } from '../useCremaPos';
import { colors, fonts } from '../theme';

// Shown right after the drawer is physically closed and before logout — the barista's own
// Z-report, sourced from the same get_cash_drawer_reconciliation() RPC the manager web
// dashboard already uses, so this isn't a manager-web-only view.
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

  const variance = summary.variance;
  const balanced = variance !== null && Math.abs(variance) < 0.01;

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.icon}>
          <BanknoteIcon size={26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <Text style={s.title}>Shift Summary</Text>
        <Text style={s.sub}>Here's how your drawer reconciled for this shift.</Text>

        <View style={s.rows}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Starting Cash</Text>
            <Text style={s.rowValue}>{peso0(summary.startingCash)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Cash Sales</Text>
            <Text style={s.rowValue}>{peso0(summary.cashSales)}</Text>
          </View>
          {summary.cashRefunds > 0 && (
            <View style={s.row}>
              <Text style={s.rowLabel}>Cash Refunds</Text>
              <Text style={[s.rowValue, { color: colors.danger }]}>− {peso0(summary.cashRefunds)}</Text>
            </View>
          )}
          <View style={[s.row, s.rowDivider]}>
            <Text style={s.rowLabel}>Expected Ending Cash</Text>
            <Text style={s.rowValue}>{peso0(summary.expectedEndingCash)}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Actual Ending Cash</Text>
            <Text style={s.rowValue}>{summary.actualEndingCash !== null ? peso0(summary.actualEndingCash) : '—'}</Text>
          </View>
        </View>

        <View style={[s.varianceBox, { backgroundColor: balanced ? colors.successBg16 : 'rgba(255,107,122,0.1)', borderColor: balanced ? colors.successBorder35 : 'rgba(255,107,122,0.3)' }]}>
          <Text style={[s.varianceLabel, { color: balanced ? colors.success : colors.danger }]}>
            {variance === null ? 'Variance unavailable' : balanced ? 'Balanced' : variance > 0 ? `Over by ${peso0(variance)}` : `Short by ${peso0(Math.abs(variance))}`}
          </Text>
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
  rows: { width: '100%', marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 4, paddingTop: 10 },
  rowLabel: { fontSize: 12.5, color: colors.textMuted, fontFamily: fonts.sansSemiBold },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontFamily: fonts.sansBold },
  varianceBox: {
    width: '100%', borderWidth: 1, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 20,
  },
  varianceLabel: { fontSize: 14, fontFamily: fonts.sansExtraBold },
  btn: {
    width: '100%', backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  btnText: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.screenBg },
});
