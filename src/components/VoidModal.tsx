import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircleIcon, AlertTriangleIcon, XIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
import { REASON_CODES, ReasonCode } from '../lib/reasonCodes';
import { pinPadMetrics, useBreakpoint } from '../breakpoints';
import { AppText } from '../responsive/AppText';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { colors, fonts } from '../theme';
import { QueueEntry } from '../types';
import { Chip } from './Chip';
import { PinPad } from './PinPad';

// Void an order from the queue — ported/adapted from CafePOS's
// app/pos/queue.tsx VoidModal: a manager can void it immediately with their
// PIN (right there at the register), or the barista can flag it for
// cafe-web-dashboard's manager/transactions void-approval queue to review
// later ('status: void_requested').
export function VoidModal({
  visible,
  order,
  isOffline,
  onClose,
  onFlagForManager,
  onPinSubmit,
  selfVoidEligible,
  onSelfVoid,
}: {
  visible: boolean;
  order: QueueEntry | null;
  isOffline: boolean;
  onClose: () => void;
  onFlagForManager: (reasonCode: string, detail: string) => Promise<{ error?: string }>;
  onPinSubmit: (pin: string, reasonCode: string, detail: string) => Promise<{ error?: string }>;
  /** When true, this caller (manager, or a senior barista under their own threshold) can void
   *  this specific order directly — skips the PIN/Flag tabs entirely. */
  selfVoidEligible?: boolean;
  onSelfVoid?: (reasonCode: string, detail: string) => Promise<{ error?: string }>;
}) {
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'pin' | 'flag'>('pin');
  const [resetTick, setResetTick] = useState(0);
  const { width } = useBreakpoint();
  const { keySize, gap } = pinPadMetrics(width);

  useEffect(() => {
    if (visible) { setReasonCode(''); setReason(''); setError(''); setBusy(false); setTab('pin'); }
  }, [visible]);

  // The caller nulls `order` in the same update that flips `visible` to false (see QueueScreen/
  // HistoryScreen/QueueModal — `onClose={() => setVoidTarget(null)}` drives both props at once).
  // ResponsiveModal needs a beat after `visible` goes false to play its exit animation, so this
  // holds onto the last real order through that beat instead of going blank the instant it's
  // nulled out from above.
  const [lastOrder, setLastOrder] = useState(order);
  useEffect(() => {
    if (order) setLastOrder(order);
  }, [order]);

  if (!lastOrder) return null;

  const validateReason = (): boolean => {
    if (!reasonCode) { setError('Select a reason'); return false; }
    if (reasonCode === 'other' && !reason.trim()) { setError('Add a detail for "Other"'); return false; }
    return true;
  };

  const handlePinComplete = async (pin: string) => {
    if (busy) return;
    if (!validateReason()) {
      setResetTick((t) => t + 1);
      return;
    }
    setBusy(true);
    // onPinSubmit (managerVoidOrder) handles the offline case itself, via a cached-PIN-hash
    // fallback — see lib/managerPinCache.ts — so there's no hard block here.
    const res = await onPinSubmit(pin, reasonCode, reason.trim());
    if (res.error) {
      setError(res.error);
      setResetTick((t) => t + 1);
    }
    setBusy(false);
  };

  const handleFlag = async () => {
    if (!validateReason()) return;
    // onFlagForManager (flagVoidOrder) queues offline automatically — no PIN involved, so
    // there's nothing here that needs a live connection.
    tapMedium();
    setBusy(true);
    const res = await onFlagForManager(reasonCode, reason.trim());
    if (res.error) setError(res.error);
    setBusy(false);
  };

  const handleSelfVoid = async () => {
    if (!validateReason() || !onSelfVoid) return;
    if (isOffline) { setError('Voiding requires an internet connection'); return; }
    tapMedium();
    setBusy(true);
    const res = await onSelfVoid(reasonCode, reason.trim());
    if (res.error) setError(res.error);
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
            <AppText variant="h2">Void Order</AppText>
            <AppText variant="caption" style={s.subtitle}>{lastOrder.no}</AppText>
          </View>
        </View>
        <Pressable onPress={busy ? undefined : () => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
          <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={s.body}>
        <AppText variant="label" style={s.label}>Reason for Void</AppText>
        <View style={s.reasonChips}>
          {REASON_CODES.map((r) => (
            <Chip key={r.code} label={r.label} active={reasonCode === r.code} onPress={() => { setReasonCode(r.code); if (error) setError(''); }} />
          ))}
        </View>
        <AppText variant="label" style={s.label}>Additional Details {reasonCode === 'other' ? '' : '(optional)'}</AppText>
        <TextInput
          style={s.input}
          placeholder="e.g. Duplicate entry, ticket rung up twice…"
          placeholderTextColor={colors.textDim}
          value={reason}
          onChangeText={(t) => { setReason(t); if (error) setError(''); }}
          editable={!busy}
        />

        {!selfVoidEligible && (
          <View style={s.tabs}>
            <Pressable style={[s.tab, tab === 'pin' && s.tabActive]} onPress={() => { tapLight(); setTab('pin'); }}>
              <Text style={[s.tabText, tab === 'pin' && s.tabTextActive]}>Manager PIN</Text>
            </Pressable>
            <Pressable style={[s.tab, tab === 'flag' && s.tabActive]} onPress={() => { tapLight(); setTab('flag'); }}>
              <Text style={[s.tabText, tab === 'flag' && s.tabTextActive]}>Flag Later</Text>
            </Pressable>
          </View>
        )}

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <AppText variant="caption" style={s.errorText}>{error}</AppText>
          </View>
        )}

        {selfVoidEligible ? (
          <View>
            <Pressable style={[s.flagBtn, busy && { opacity: 0.5 }]} onPress={handleSelfVoid} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.screenBg} size="small" /> : <Text style={s.flagBtnText}>Void This Order</Text>}
            </Pressable>
          </View>
        ) : tab === 'pin' ? (
          <View style={{ alignItems: 'center' }}>
            <AppText variant="body" style={s.panelDesc}>Manager enters their 4-digit PIN to void this order immediately.</AppText>
            <PinPad
              key={visible ? 1 : 0}
              keySize={keySize}
              gap={gap}
              onComplete={handlePinComplete}
              onChangeLength={() => error && setError('')}
              disabled={busy}
              error={!!error}
              resetSignal={resetTick}
            />
            {isOffline && <AppText variant="caption" style={s.offlineNote}>Offline — this void will be queued and confirmed once reconnected</AppText>}
          </View>
        ) : (
          <View>
            <View style={s.flagInfo}>
              <AlertTriangleIcon size={15} color={colors.heatMedText} strokeWidth={2} />
              <AppText variant="body" style={s.flagInfoText}>
                This order leaves the queue but stays pending until a manager reviews it in cafe-web-dashboard.
              </AppText>
            </View>
            <Pressable style={[s.flagBtn, busy && { opacity: 0.5 }]} onPress={handleFlag} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.screenBg} size="small" /> : <Text style={s.flagBtnText}>Flag for Manager Review</Text>}
            </Pressable>
            {isOffline && <AppText variant="caption" style={s.offlineNote}>Offline — this will sync once reconnected</AppText>}
          </View>
        )}
      </View>
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
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14, marginBottom: 18,
  },

  tabs: { flexDirection: 'row', backgroundColor: colors.canvasBg, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabActive: { backgroundColor: colors.chipBg },
  tabText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
  tabTextActive: { color: colors.textPrimary },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  errorText: { color: colors.danger },

  panelDesc: { color: colors.textMuted, textAlign: 'center', marginBottom: 18 },

  flagInfo: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.heatMedBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(176,122,32,0.25)', marginBottom: 16,
  },
  flagInfoText: { flex: 1, color: colors.heatMedText },
  flagBtn: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  flagBtnText: { color: colors.screenBg, fontSize: 14, fontFamily: fonts.sansExtraBold },
  offlineNote: { textAlign: 'center', color: colors.danger, marginTop: 10 },
});
