import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangleIcon, CheckCircleIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
import { _registerCrossAlertListener, PendingCrossAlert } from '../lib/crossAlert';
import { colors, fonts } from '../theme';

// Renders whatever notify()/confirmAsync() (see lib/crossAlert.ts) currently has pending, on web
// only — on native those two go through the OS's own Alert.alert and this component never has
// anything to show. Mount once near the app root, outside any single screen, since a "Session
// Expired" notify can fire from background auth logic with no screen-specific context at all.
export function CrossAlertHost() {
  const [pending, setPending] = useState<PendingCrossAlert | null>(null);

  useEffect(() => {
    _registerCrossAlertListener(setPending);
    return () => _registerCrossAlertListener(null);
  }, []);

  if (!pending) return null;

  const dismiss = () => setPending(null);

  const handleAcknowledge = () => {
    tapLight();
    if (pending.kind === 'notify') pending.resolve();
    dismiss();
  };

  const handleCancel = () => {
    tapLight();
    if (pending.kind === 'confirm') pending.resolve(false);
    dismiss();
  };

  const handleConfirm = () => {
    tapMedium();
    if (pending.kind === 'confirm') pending.resolve(true);
    dismiss();
  };

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.icon}>
          {pending.kind === 'confirm'
            ? <CheckCircleIcon size={18} color={colors.gold} strokeWidth={1.8} />
            : <AlertTriangleIcon size={18} color={colors.gold} strokeWidth={1.8} />}
        </View>
        <Text style={s.title}>{pending.title}</Text>
        {!!pending.message && <Text style={s.message}>{pending.message}</Text>}
        {pending.kind === 'confirm' ? (
          <View style={s.row}>
            <Pressable style={s.cancelBtn} onPress={handleCancel} accessibilityRole="button" accessibilityLabel="Cancel">
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={s.confirmBtn} onPress={handleConfirm} accessibilityRole="button" accessibilityLabel={pending.confirmText}>
              <Text style={s.confirmBtnText}>{pending.confirmText}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={s.okBtn} onPress={handleAcknowledge} accessibilityRole="button" accessibilityLabel="OK">
            <Text style={s.okBtnText}>OK</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90,
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 380, maxWidth: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, padding: 22,
    alignItems: 'center',
  },
  icon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 16, fontFamily: fonts.sansExtraBold, color: colors.textPrimary, textAlign: 'center' },
  message: { fontSize: 13, color: colors.textMuted, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: colors.chipBg, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textPrimary, fontSize: 13.5, fontFamily: fonts.sansExtraBold },
  confirmBtn: { flex: 1, backgroundColor: colors.gold, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  confirmBtnText: { color: colors.screenBg, fontSize: 13.5, fontFamily: fonts.sansExtraBold },
  okBtn: { alignSelf: 'stretch', backgroundColor: colors.gold, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  okBtnText: { color: colors.screenBg, fontSize: 13.5, fontFamily: fonts.sansExtraBold },
});
