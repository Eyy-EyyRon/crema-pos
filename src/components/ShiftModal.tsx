import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { peso0 } from '../format';
import { AlertCircleIcon, BanknoteIcon } from '../icons';
import { tapLight, tapMedium, warning } from '../lib/haptics';
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

  if (!visible) return null;

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
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <View style={s.icon}>
          <BanknoteIcon size={26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <Text style={s.title}>Open Cash Drawer</Text>
        <Text style={s.sub}>Count the starting cash in the drawer before you start taking orders.</Text>

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
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.screenBg} /> : <Text style={s.btnText}>Open Shift</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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

  if (!visible) return null;

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
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <View style={s.icon}>
          <BanknoteIcon size={26} color={colors.gold} strokeWidth={1.6} />
        </View>
        <Text style={s.title}>Close Shift</Text>
        <Text style={s.sub}>Count the actual cash in the drawer now. This closes your shift and logs you out.</Text>

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
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Pressable style={[s.btn, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.screenBg} /> : <Text style={s.btnText}>Close Shift &amp; Log Out</Text>}
        </Pressable>
        <Pressable style={s.cancelBtn} onPress={() => { tapLight(); onCancel(); }} disabled={busy}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
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
  sub: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18, marginBottom: 20 },
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
  errorText: { fontSize: 12, color: colors.danger, fontFamily: fonts.sansSemiBold },
  btn: {
    width: '100%', backgroundColor: colors.gold, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnText: { fontSize: 14, fontFamily: fonts.sansExtraBold, color: colors.screenBg },
  cancelBtn: { paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
});
