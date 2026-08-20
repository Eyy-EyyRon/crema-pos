import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircleIcon, LockIcon, XIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
import { AppText } from '../responsive/AppText';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { colors, fonts } from '../theme';

// Manager-approved PIN self-recovery: files a pin_reset_requests row (anon insert, no session
// needed) that emails managers, who then reset the PIN from the Staff page in the Web
// Dashboard. Deliberately not unattended self-service — PINs gate cash-drawer access.
export function ForgotPinModal({
  visible,
  profileName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  profileName: string;
  onClose: () => void;
  onSubmit: (note: string) => Promise<{ error?: string }>;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (visible) { setNote(''); setBusy(false); setError(''); setSent(false); }
  }, [visible]);

  const handleSubmit = async () => {
    tapMedium();
    setBusy(true);
    const res = await onSubmit(note.trim());
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setSent(true);
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose} dismissOnBackdropPress={!busy}>
      <View style={s.content}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.icon}>
              <LockIcon size={16} color={colors.gold} strokeWidth={1.8} />
            </View>
            <AppText variant="h2">Forgot PIN</AppText>
          </View>
          <Pressable onPress={busy ? undefined : () => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {sent ? (
          <View style={s.sentWrap}>
            <CheckCircleIcon size={30} color={colors.success} strokeWidth={1.8} />
            <AppText variant="h2" style={s.sentTitle}>Request Sent</AppText>
            <AppText variant="body" style={s.sentDesc}>A manager has been notified and will reset your PIN shortly.</AppText>
            <Pressable style={s.doneBtn} onPress={() => { tapLight(); onClose(); }}>
              <Text style={s.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <AppText variant="body" style={s.desc}>
              This will notify a manager that <Text style={{ fontFamily: fonts.sansBold }}>{profileName}</Text> needs their PIN reset.
            </AppText>
            <TextInput
              style={s.input}
              placeholder="Anything else the manager should know? (optional)"
              placeholderTextColor={colors.textDim}
              value={note}
              onChangeText={(t) => { setNote(t); if (error) setError(''); }}
              editable={!busy}
              multiline
            />
            {!!error && <AppText variant="caption" style={s.errorText}>{error}</AppText>}
            <Pressable style={[s.submitBtn, busy && { opacity: 0.5 }]} onPress={handleSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.screenBg} size="small" /> : <Text style={s.submitBtnText}>Notify Manager</Text>}
            </Pressable>
          </>
        )}
      </View>
    </ResponsiveModal>
  );
}

const s = StyleSheet.create({
  content: {
    padding: 22,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  desc: { color: colors.textMuted, marginBottom: 16 },
  input: {
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14, marginBottom: 14,
    minHeight: 70, textAlignVertical: 'top',
  },
  errorText: { color: colors.danger, marginBottom: 12 },
  submitBtn: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  submitBtnText: { color: colors.screenBg, fontSize: 14, fontFamily: fonts.sansExtraBold },
  sentWrap: { alignItems: 'center', paddingVertical: 6 },
  sentTitle: { marginTop: 12 },
  sentDesc: { color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  doneBtn: { backgroundColor: colors.chipBg, paddingVertical: 13, paddingHorizontal: 32, borderRadius: 14 },
  doneBtnText: { color: colors.textPrimary, fontSize: 13.5, fontFamily: fonts.sansExtraBold },
});
