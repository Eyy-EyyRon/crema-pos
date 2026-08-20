import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircleIcon, TrashIcon, WifiOffIcon, XIcon } from '../icons';
import { peso0 } from '../format';
import { tapLight, tapMedium } from '../lib/haptics';
import { OutboxEntry } from '../lib/syncEngine';
import { supabase } from '../lib/supabase';
import { pinPadMetrics, useBreakpoint } from '../breakpoints';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { colors, fonts } from '../theme';
import { PinPad } from './PinPad';

// Manual visibility/remediation for the offline order outbox — previously fully automatic with
// no way for a barista to see a stuck entry or do anything about it besides waiting.
export function OutboxModal({
  visible,
  entries,
  onClose,
  onRetry,
  onDelete,
}: {
  visible: boolean;
  entries: OutboxEntry[];
  onClose: () => void;
  onRetry: (id: string) => Promise<{ error?: string }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<{ id: string; message: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [resetTick, setResetTick] = useState(0);
  const { width } = useBreakpoint();
  const { keySize, gap } = pinPadMetrics(width);

  const handleRetry = async (id: string) => {
    tapLight();
    setRetryingId(id);
    setRetryError(null);
    const res = await onRetry(id);
    if (res.error) setRetryError({ id, message: res.error });
    setRetryingId(null);
  };

  // Deleting discards an unsynced sale — same manager-PIN trust model as void/refund, not a
  // bare confirm dialog, since this is a destructive action a barista could otherwise use to
  // quietly make an inconvenient order disappear.
  const handlePinComplete = async (pin: string) => {
    if (pinBusy || !deleteTargetId) return;
    setPinBusy(true);
    const { data: managers, error } = await supabase.rpc('verify_manager_pin', { p_pin: pin });
    if (error) {
      setPinError(error.message || 'Could not verify manager PIN.');
      setResetTick((t) => t + 1);
      setPinBusy(false);
      return;
    }
    if (!managers?.[0]) {
      setPinError('Invalid manager PIN');
      setResetTick((t) => t + 1);
      setPinBusy(false);
      return;
    }
    await onDelete(deleteTargetId);
    setDeleteTargetId(null);
    setPinError('');
    setPinBusy(false);
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose} dismissOnBackdropPress={!pinBusy} maxWidth={400} zIndex={50}>
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.icon}>
              <WifiOffIcon size={16} color={colors.heatMedText} strokeWidth={2} />
            </View>
            <Text style={s.title}>Sync Status</Text>
          </View>
          <Pressable onPress={() => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {deleteTargetId ? (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={s.panelDesc}>Manager PIN required to discard this unsynced order.</Text>
            <PinPad
              key={deleteTargetId}
              keySize={keySize}
              gap={gap}
              onComplete={handlePinComplete}
              onChangeLength={() => pinError && setPinError('')}
              disabled={pinBusy}
              error={!!pinError}
              resetSignal={resetTick}
            />
            {!!pinError && (
              <View style={s.errorRow}>
                <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
                <Text style={s.errorText}>{pinError}</Text>
              </View>
            )}
            <Pressable onPress={() => { tapLight(); setDeleteTargetId(null); setPinError(''); }} style={s.cancelLink}>
              <Text style={s.cancelLinkText}>Cancel</Text>
            </Pressable>
          </View>
        ) : entries.length === 0 ? (
          <Text style={s.emptyText}>All orders are synced. Nothing pending.</Text>
        ) : (
          <View>
            {entries.map((e) => (
              <View key={e.id} style={s.entryCard}>
                <View style={s.entryHeader}>
                  <Text style={s.entryReceipt}>{e.orderData.receipt_number}</Text>
                  <Text style={s.entryTotal}>{peso0(e.orderData.total)}</Text>
                </View>
                <Text style={s.entrySummary}>
                  {e.displayItems.map((d) => `${d.qty}× ${d.name}`).join(', ')}
                </Text>
                {retryError?.id === e.id && <Text style={s.entryError}>{retryError.message}</Text>}
                <View style={s.entryActions}>
                  <Pressable
                    style={[s.retryBtn, retryingId === e.id && { opacity: 0.6 }]}
                    onPress={() => handleRetry(e.id)}
                    disabled={retryingId === e.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Retry order ${e.orderData.receipt_number}`}
                  >
                    {retryingId === e.id ? <ActivityIndicator size="small" color={colors.gold} /> : <Text style={s.retryText}>Retry</Text>}
                  </Pressable>
                  <Pressable
                    style={s.deleteBtn}
                    onPress={() => { tapMedium(); setDeleteTargetId(e.id); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete order ${e.orderData.receipt_number}`}
                  >
                    <TrashIcon size={13} color={colors.danger} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ResponsiveModal>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.heatMedBg,
    borderWidth: 1, borderColor: 'rgba(176,122,32,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 15, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  entryCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold12,
    borderRadius: 14, padding: 13, marginBottom: 10,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  entryReceipt: { fontSize: 13, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  entryTotal: { fontSize: 13, fontFamily: fonts.sansExtraBold, color: colors.goldLight },
  entrySummary: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  entryError: { fontSize: 11, color: colors.danger, marginTop: 6, fontFamily: fonts.sansSemiBold },
  entryActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  retryBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(184,147,90,0.1)', borderWidth: 1, borderColor: 'rgba(184,147,90,0.3)',
  },
  retryText: { fontSize: 12.5, fontFamily: fonts.sansBold, color: colors.gold },
  deleteBtn: {
    width: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
    backgroundColor: 'rgba(255,107,122,0.1)', borderWidth: 1, borderColor: 'rgba(255,107,122,0.3)',
  },
  panelDesc: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  errorText: { fontSize: 12, color: colors.danger, fontFamily: fonts.sansSemiBold },
  cancelLink: { marginTop: 14, paddingVertical: 8 },
  cancelLinkText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
});
