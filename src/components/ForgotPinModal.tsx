import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckCircleIcon, LockIcon, XIcon } from '../icons';
import { tapLight, tapMedium } from '../lib/haptics';
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

  if (!visible) return null;

  const handleSubmit = async () => {
    tapMedium();
    setBusy(true);
    const res = await onSubmit(note.trim());
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setSent(true);
  };

  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.icon}>
              <LockIcon size={16} color={colors.gold} strokeWidth={1.8} />
            </View>
            <Text style={s.title}>Forgot PIN</Text>
          </View>
          <Pressable onPress={busy ? undefined : () => { tapLight(); onClose(); }} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <XIcon size={15} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        </View>

        {sent ? (
          <View style={s.sentWrap}>
            <CheckCircleIcon size={30} color={colors.success} strokeWidth={1.8} />
            <Text style={s.sentTitle}>Request Sent</Text>
            <Text style={s.sentDesc}>A manager has been notified and will reset your PIN shortly.</Text>
            <Pressable style={s.doneBtn} onPress={() => { tapLight(); onClose(); }}>
              <Text style={s.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={s.desc}>
              This will notify a manager that <Text style={{ fontFamily: fonts.sansBold }}>{profileName}</Text> needs their PIN reset.
            </Text>
            <TextInput
              style={s.input}
              placeholder="Anything else the manager should know? (optional)"
              placeholderTextColor={colors.textDim}
              value={note}
              onChangeText={(t) => { setNote(t); if (error) setError(''); }}
              editable={!busy}
              multiline
            />
            {!!error && <Text style={s.errorText}>{error}</Text>}
            <Pressable style={[s.submitBtn, busy && { opacity: 0.5 }]} onPress={handleSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.screenBg} size="small" /> : <Text style={s.submitBtnText}>Notify Manager</Text>}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
    alignItems: 'center', justifyContent: 'center', padding: 24,
    backgroundColor: colors.overlayStrong,
  },
  card: {
    width: 380, maxWidth: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1, borderColor: colors.borderGold18,
    borderRadius: 22, padding: 22,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 30, height: 30, borderRadius: 9, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 16 },
  input: {
    backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderGold14,
    borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 14, marginBottom: 14,
    minHeight: 70, textAlignVertical: 'top',
  },
  errorText: { fontSize: 12, color: colors.danger, fontFamily: fonts.sansSemiBold, marginBottom: 12 },
  submitBtn: { backgroundColor: colors.gold, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  submitBtnText: { color: colors.screenBg, fontSize: 14, fontFamily: fonts.sansExtraBold },
  sentWrap: { alignItems: 'center', paddingVertical: 6 },
  sentTitle: { fontSize: 15, fontFamily: fonts.sansExtraBold, color: colors.textPrimary, marginTop: 12 },
  sentDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, marginTop: 6, marginBottom: 18 },
  doneBtn: { backgroundColor: colors.chipBg, paddingVertical: 13, paddingHorizontal: 32, borderRadius: 14 },
  doneBtnText: { color: colors.textPrimary, fontSize: 13.5, fontFamily: fonts.sansExtraBold },
});
