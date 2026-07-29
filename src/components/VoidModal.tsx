import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircleIcon, AlertTriangleIcon, XIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { QueueEntry } from '../types';
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
}: {
  visible: boolean;
  order: QueueEntry | null;
  isOffline: boolean;
  onClose: () => void;
  onFlagForManager: (reason: string) => Promise<{ error?: string }>;
  onPinSubmit: (pin: string, reason: string) => Promise<{ error?: string }>;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'pin' | 'flag'>('pin');
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    if (visible) { setReason(''); setError(''); setBusy(false); setTab('pin'); }
  }, [visible]);

  if (!visible || !order) return null;

  const handlePinComplete = async (pin: string) => {
    if (busy) return;
    if (!reason.trim()) {
      setError('Enter a reason first');
      setResetTick((t) => t + 1);
      return;
    }
    setBusy(true);
    const res = await onPinSubmit(pin, reason.trim());
    if (res.error) {
      setError(res.error);
      setResetTick((t) => t + 1);
    }
    setBusy(false);
  };

  const handleFlag = async () => {
    if (!reason.trim()) { setError('Reason is required'); return; }
    if (isOffline) { setError('Cannot flag while offline'); return; }
    tapMedium();
    setBusy(true);
    const res = await onFlagForManager(reason.trim());
    if (res.error) setError(res.error);
    setBusy(false);
  };

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.warnIcon}>
              <AlertTriangleIcon size={16} color={colors.heatMedText} strokeWidth={2} />
            </View>
            <View>
              <Text style={s.title}>Void Order</Text>
              <Text style={s.subtitle}>{order.no}</Text>
            </View>
          </View>
          <Pressable onPress={busy ? undefined : () => { tapLight(); onClose(); }} style={s.closeBtn}>
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        <Text style={s.label}>Reason for Void</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Customer changed mind, Duplicate entry…"
          placeholderTextColor={colors.textDim}
          value={reason}
          onChangeText={(t) => { setReason(t); if (error) setError(''); }}
          editable={!busy}
        />

        <View style={s.tabs}>
          <Pressable style={[s.tab, tab === 'pin' && s.tabActive]} onPress={() => { tapLight(); setTab('pin'); }}>
            <Text style={[s.tabText, tab === 'pin' && s.tabTextActive]}>Manager PIN</Text>
          </Pressable>
          <Pressable style={[s.tab, tab === 'flag' && s.tabActive]} onPress={() => { tapLight(); setTab('flag'); }}>
            <Text style={[s.tabText, tab === 'flag' && s.tabTextActive]}>Flag Later</Text>
          </Pressable>
        </View>

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {tab === 'pin' ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={s.panelDesc}>Manager enters their 4-digit PIN to void this order immediately.</Text>
            <PinPad
              key={visible ? 1 : 0}
              keySize={52}
              gap={10}
              onComplete={handlePinComplete}
              onChangeLength={() => error && setError('')}
              disabled={busy}
              error={!!error}
              resetSignal={resetTick}
            />
          </View>
        ) : (
          <View>
            <View style={s.flagInfo}>
              <AlertTriangleIcon size={15} color={colors.heatMedText} strokeWidth={2} />
              <Text style={s.flagInfoText}>
                This order leaves the queue but stays pending until a manager reviews it in cafe-web-dashboard.
              </Text>
            </View>
            <Pressable style={[s.flagBtn, (busy || isOffline) && { opacity: 0.5 }]} onPress={handleFlag} disabled={busy || isOffline}>
              {busy ? <ActivityIndicator color={colors.screenBg} size="small" /> : <Text style={s.flagBtnText}>Flag for Manager Review</Text>}
            </Pressable>
            {isOffline && <Text style={s.offlineNote}>Flagging requires an internet connection</Text>}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40,
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 420, maxWidth: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, padding: 22,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warnIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.heatMedBg,
    borderWidth: 1, borderColor: 'rgba(176,122,32,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  subtitle: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.textMuted, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },

  label: { fontFamily: fonts.sansExtraBold, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.textLabel, marginBottom: 8 },
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
  errorText: { fontSize: 12, color: colors.danger, fontFamily: fonts.sansSemiBold },

  panelDesc: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 18 },

  flagInfo: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.heatMedBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(176,122,32,0.25)', marginBottom: 16,
  },
  flagInfoText: { flex: 1, fontSize: 13, color: colors.heatMedText, lineHeight: 19 },
  flagBtn: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  flagBtnText: { color: colors.screenBg, fontSize: 14, fontFamily: fonts.sansExtraBold },
  offlineNote: { textAlign: 'center', fontSize: 11, color: colors.danger, marginTop: 10, fontFamily: fonts.sansSemiBold },
});
