import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { peso0 } from '../format';
import { AlertCircleIcon, AlertTriangleIcon, XIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { REASON_CODES, ReasonCode } from '../lib/reasonCodes';
import { AppText } from '../responsive/AppText';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { colors, fonts } from '../theme';
import { Chip } from './Chip';
import { PinPad } from './PinPad';

// Manager-PIN-gated refund — mirrors cafe-web-dashboard's Transactions page refund flow (same
// arbitrary-amount-against-the-total MVP scope, same full-refund-restores-stock /
// partial-doesn't rule), just with a PIN entry step in place of the manager already being
// logged in, since this runs on a shared kiosk device.
export function RefundModal({
  visible,
  order,
  isOffline,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  order: { id: string; no: string; total: number } | null;
  isOffline: boolean;
  onClose: () => void;
  onSubmit: (amount: number, reasonCode: string, detail: string, pin: string) => Promise<{ error?: string }>;
}) {
  const [amount, setAmount] = useState('');
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    if (visible && order) {
      setAmount(order.total.toFixed(2));
      setReasonCode('');
      setReason('');
      setError('');
      setBusy(false);
    }
  }, [visible, order]);

  // HistoryScreen nulls `order` (refundTarget) in the same update that closes this modal, on both
  // the X button and a successful submit — see onClose={() => setRefundTarget(null)} and the
  // setRefundTarget(null) inside onSubmit's success branch. Without this cache, ResponsiveModal
  // would lose its content the instant `order` goes null and never get to play its exit
  // animation. Same fix as VoidModal's lastOrder.
  const [lastOrder, setLastOrder] = useState(order);
  useEffect(() => {
    if (order) setLastOrder(order);
  }, [order]);

  if (!lastOrder) return null;

  const isFull = Number(amount) === lastOrder.total;

  const handlePinComplete = async (pin: string) => {
    if (busy) return;
    if (isOffline) {
      setError('Manager PIN verification requires an internet connection');
      setResetTick((t) => t + 1);
      return;
    }
    if (!reasonCode) {
      setError('Select a reason');
      setResetTick((t) => t + 1);
      return;
    }
    if (reasonCode === 'other' && !reason.trim()) {
      setError('Add a detail for "Other"');
      setResetTick((t) => t + 1);
      return;
    }
    const n = Number(amount);
    if (!n || isNaN(n) || n <= 0 || n > lastOrder.total) {
      setError(`Enter an amount between ₱0.01 and ${peso0(lastOrder.total)}`);
      setResetTick((t) => t + 1);
      return;
    }
    setBusy(true);
    const res = await onSubmit(n, reasonCode, reason.trim(), pin);
    if (res.error) {
      setError(res.error);
      setResetTick((t) => t + 1);
    }
    setBusy(false);
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose} dismissOnBackdropPress={!busy}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.warnIcon}>
            <AlertTriangleIcon size={16} color={colors.heatMedText} strokeWidth={2} />
          </View>
          <View>
            <AppText variant="h2">Refund Order</AppText>
            <AppText variant="caption" style={s.subtitle}>{lastOrder.no}</AppText>
          </View>
        </View>
        <Pressable onPress={busy ? undefined : () => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <AppText variant="label" style={s.label}>Refund Amount (max {peso0(lastOrder.total)})</AppText>
        <View style={s.amountRow}>
          <Text style={s.peso}>₱</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); if (error) setError(''); }}
            keyboardType="decimal-pad"
            editable={!busy}
          />
        </View>
        {!isFull && !!amount && (
          <AppText variant="caption" style={s.partialNote}>Partial refund — ingredient stock will not be restored.</AppText>
        )}

        <AppText variant="label" style={[s.label, { marginTop: 14 }]}>Reason for Refund</AppText>
        <View style={s.reasonChips}>
          {REASON_CODES.map((r) => (
            <Chip key={r.code} label={r.label} active={reasonCode === r.code} onPress={() => { setReasonCode(r.code); if (error) setError(''); }} />
          ))}
        </View>
        <AppText variant="label" style={s.label}>Additional Details {reasonCode === 'other' ? '' : '(optional)'}</AppText>
        <TextInput
          style={s.input}
          placeholder="e.g. Customer complaint, wrong order…"
          placeholderTextColor={colors.textDim}
          value={reason}
          onChangeText={(t) => { setReason(t); if (error) setError(''); }}
          editable={!busy}
        />

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <AppText variant="caption" style={s.errorText}>{error}</AppText>
          </View>
        )}

        <View style={{ alignItems: 'center' }}>
          <AppText variant="body" style={s.panelDesc}>Manager enters their 4-digit PIN to process this refund.</AppText>
          <PinPad
            key={visible ? 1 : 0}
            keySize={52}
            gap={10}
            onComplete={handlePinComplete}
            onChangeLength={() => error && setError('')}
            disabled={busy || isOffline}
            error={!!error}
            resetSignal={resetTick}
          />
          {isOffline && <AppText variant="caption" style={s.offlineNote}>Manager PIN verification requires an internet connection</AppText>}
        </View>
      </ScrollView>
    </ResponsiveModal>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 22, marginBottom: 18 },
  body: { paddingHorizontal: 22, paddingBottom: 22 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warnIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.heatMedBg,
    borderWidth: 1, borderColor: 'rgba(176,122,32,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  subtitle: { marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },

  label: { marginBottom: 8 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  peso: { fontSize: 16, fontFamily: fonts.sansExtraBold, color: colors.textMuted },
  amountInput: { flex: 1, color: colors.textPrimary, fontSize: 16, fontFamily: fonts.sansBold, padding: 0 },
  partialNote: { color: colors.heatMedText, marginTop: 8 },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14, marginBottom: 18,
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  errorText: { color: colors.danger },

  panelDesc: { color: colors.textMuted, textAlign: 'center', marginBottom: 18 },
  offlineNote: { textAlign: 'center', color: colors.danger, marginTop: 10 },
});
