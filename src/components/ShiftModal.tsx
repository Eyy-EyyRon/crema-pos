import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { peso0 } from '../format';
import { AlertCircleIcon, BanknoteIcon } from '../icons';
import { tapLight, tapMedium, warning } from '../lib/haptics';
import { AppText } from '../responsive/AppText';
import { ResponsiveModal } from '../responsive/ResponsiveModal';
import { colors, fonts } from '../theme';

// Cash-drawer shift gate — same `cash_drawer_shifts` table/flow as
// CafePOS/app/pos/index.tsx: a barista counts and enters their starting
// float before the register opens, and reconciles an ending count when they
// clock out. Full-screen (not a dismissible modal) since a barista can't
// ring anything up without an open shift.

export function OpenShiftModal({
  visible,
  onSubmit,
}: {
  visible: boolean;
  onSubmit: (startingCash: number) => Promise<string | void>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const n = Number(value);
    if (!value || isNaN(n) || n < 0) {
      warning();
      setError('Enter a valid starting amount.');
      return;
    }
    tapMedium();
    setBusy(true);
    setError('');
    const err = await onSubmit(n);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    // No onClose of its own — a barista can't ring anything up without an open shift, so this
    // must never be dismissible. dismissOnBackdropPress is hardcoded false (not tied to `busy`,
    // since it should never be true regardless of state) and onClose is a deliberate no-op.
    <ResponsiveModal visible={visible} onClose={() => {}} dismissOnBackdropPress={false}>
      <View style={s.content}>
        <View style={s.icon}>
          <BanknoteIcon size={26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <AppText variant="h2">Open Cash Drawer</AppText>
        <AppText variant="body" style={s.sub}>Count the starting cash in the drawer before you start taking orders.</AppText>

        <View style={s.inputRow}>
          <Text style={s.peso}>₱</Text>
          <TextInput
            value={value}
            onChangeText={(t) => { setValue(t.replace(/[^0-9.]/g, '')); if (error) setError(''); }}
            placeholder="Starting cash"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={s.input}
            editable={!busy}
            autoFocus
          />
        </View>

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <AppText variant="caption" style={s.errorText}>{error}</AppText>
          </View>
        )}

        <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.screenBg} /> : <Text style={s.btnText}>Open Shift</Text>}
        </Pressable>
      </View>
    </ResponsiveModal>
  );
}

export function CloseShiftModal({
  visible,
  startingCash,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  startingCash: number;
  onSubmit: (endingCash: number) => Promise<string | void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const n = Number(value);
    if (!value || isNaN(n) || n < 0) {
      warning();
      setError('Enter the actual cash counted in the drawer.');
      return;
    }
    tapMedium();
    setBusy(true);
    setError('');
    const err = await onSubmit(n);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <ResponsiveModal visible={visible} onClose={onCancel} dismissOnBackdropPress={!busy}>
      <View style={s.content}>
        <View style={s.icon}>
          <BanknoteIcon size={26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <AppText variant="h2">Close Shift</AppText>
        <AppText variant="body" style={s.sub}>Count the actual cash in the drawer now. This closes your shift and logs you out.</AppText>

        <View style={s.startingCashRow}>
          <Text style={s.startingCashLabel}>Starting Cash</Text>
          <Text style={s.startingCashValue}>{peso0(startingCash)}</Text>
        </View>

        <View style={s.inputRow}>
          <Text style={s.peso}>₱</Text>
          <TextInput
            value={value}
            onChangeText={(t) => { setValue(t.replace(/[^0-9.]/g, '')); if (error) setError(''); }}
            placeholder="Ending cash"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={s.input}
            editable={!busy}
            autoFocus
          />
        </View>

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <AppText variant="caption" style={s.errorText}>{error}</AppText>
          </View>
        )}

        <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.screenBg} /> : <Text style={s.btnText}>Close Shift &amp; Log Out</Text>}
        </Pressable>
        <Pressable style={s.cancelBtn} onPress={() => { tapLight(); onCancel(); }} disabled={busy}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </ResponsiveModal>
  );
}

const s = StyleSheet.create({
  content: {
    padding: 26,
    alignItems: 'center',
  },
  icon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(184,147,90,0.12)',
    borderWidth: 1, borderColor: colors.borderGold25,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  startingCashRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    backgroundColor: 'rgba(184,147,90,0.08)', borderWidth: 1, borderColor: colors.borderGold14,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14,
  },
  startingCashLabel: { fontSize: 12, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
  startingCashValue: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.goldLight },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
    backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.borderGold14,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  peso: { fontSize: 16, fontFamily: fonts.sansExtraBold, color: colors.textMuted },
  input: { flex: 1, color: colors.textPrimary, fontSize: 16, fontFamily: fonts.sansBold, padding: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-start' },
  errorText: { color: colors.danger },
  btn: {
    width: '100%', backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnText: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.screenBg },
  cancelBtn: { paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
});
