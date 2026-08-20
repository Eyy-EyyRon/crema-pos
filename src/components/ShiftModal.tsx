import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, TextStyle, View } from 'react-native';
import { useBreakpoint } from '../breakpoints';
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

function useShiftSheetLayout() {
  const { isTablet, isCompact, width, gutter } = useBreakpoint();
  const narrow = width < 360;
  const padH = isCompact ? Math.max(14, gutter) : isTablet ? 32 : narrow ? 16 : 22;
  const padV = isCompact ? 12 : isTablet ? 28 : 22;
  const iconBox = isCompact ? 44 : isTablet ? 64 : 56;
  const iconGlyph = isCompact ? 20 : isTablet ? 30 : 26;
  const fieldPadV = isCompact ? 10 : isTablet ? 14 : 12;
  const fieldFont = isTablet ? 17 : narrow ? 15 : 16;
  const btnFont = isTablet ? 15 : narrow ? 12.5 : 14;
  const btnPadV = isCompact ? 12 : isTablet ? 16 : 14;
  return {
    isTablet,
    isCompact,
    narrow,
    padH,
    padV,
    iconBox,
    iconGlyph,
    fieldPadV,
    fieldFont,
    btnFont,
    btnPadV,
    maxWidth: isTablet ? 460 : 420,
  };
}

// RN Web draws the browser's default focus ring around the native <input>. With autoFocus
// that ring is a tight blue square around the placeholder ("Starting cash" / "Ending cash")
// instead of following our gold field chrome. Kill the outline; the row border is the cue.
const webInputReset: TextStyle = Platform.OS === 'web'
  ? { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' }
  : {};

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
  const layout = useShiftSheetLayout();

  useEffect(() => {
    if (visible) {
      setValue('');
      setBusy(false);
      setError('');
    }
  }, [visible]);

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
    <ResponsiveModal visible={visible} onClose={() => {}} dismissOnBackdropPress={false} maxWidth={layout.maxWidth}>
      <ShiftSheetChrome layout={layout} title="Open Cash Drawer" subtitle="Count the starting cash in the drawer before you start taking orders.">
        <View style={[s.inputRow, { paddingVertical: layout.fieldPadV }]}>
          <Text style={[s.peso, { fontSize: layout.fieldFont }]}>₱</Text>
          <TextInput
            value={value}
            onChangeText={(t) => { setValue(t.replace(/[^0-9.]/g, '')); if (error) setError(''); }}
            placeholder="Starting cash"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[s.input, webInputReset, { fontSize: layout.fieldFont }]}
            editable={!busy}
            autoFocus
            underlineColorAndroid="transparent"
            selectionColor={colors.gold}
          />
        </View>

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <AppText variant="caption" style={s.errorText}>{error}</AppText>
          </View>
        )}

        <Pressable
          style={[s.btn, { paddingVertical: layout.btnPadV }, busy && { opacity: 0.7 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.screenBg} />
          ) : (
            <Text style={[s.btnText, { fontSize: layout.btnFont }]} numberOfLines={2}>
              Open Shift
            </Text>
          )}
        </Pressable>
      </ShiftSheetChrome>
    </ResponsiveModal>
  );
}

export function CloseShiftModal({
  visible,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  onSubmit: (endingCash: number) => Promise<string | void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const layout = useShiftSheetLayout();

  useEffect(() => {
    if (visible) {
      setValue('');
      setBusy(false);
      setError('');
    }
  }, [visible]);

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
    <ResponsiveModal visible={visible} onClose={onCancel} dismissOnBackdropPress={!busy} maxWidth={layout.maxWidth}>
      <ShiftSheetChrome
        layout={layout}
        title="Close Shift"
        subtitle="Count the cash in the drawer now — don't look up the float. This closes your shift and logs you out."
      >
        <View style={[s.inputRow, { paddingVertical: layout.fieldPadV }]}>
          <Text style={[s.peso, { fontSize: layout.fieldFont }]}>₱</Text>
          <TextInput
            value={value}
            onChangeText={(t) => { setValue(t.replace(/[^0-9.]/g, '')); if (error) setError(''); }}
            placeholder="Ending cash"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={[s.input, webInputReset, { fontSize: layout.fieldFont }]}
            editable={!busy}
            autoFocus
            underlineColorAndroid="transparent"
            selectionColor={colors.gold}
          />
        </View>

        {!!error && (
          <View style={s.errorRow}>
            <AlertCircleIcon size={13} color={colors.danger} strokeWidth={2} />
            <AppText variant="caption" style={s.errorText}>{error}</AppText>
          </View>
        )}

        <Pressable
          style={[s.btn, { paddingVertical: layout.btnPadV }, busy && { opacity: 0.7 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.screenBg} />
          ) : (
            <Text style={[s.btnText, { fontSize: layout.btnFont }]} numberOfLines={2}>
              {layout.narrow ? 'Close Shift &\nLog Out' : 'Close Shift & Log Out'}
            </Text>
          )}
        </Pressable>
        <Pressable style={[s.cancelBtn, layout.isCompact && { paddingVertical: 8 }]} onPress={() => { tapLight(); onCancel(); }} disabled={busy}>
          <Text style={[s.cancelText, layout.isTablet && { fontSize: 14 }]}>Cancel</Text>
        </Pressable>
      </ShiftSheetChrome>
    </ResponsiveModal>
  );
}

function ShiftSheetChrome({
  layout,
  title,
  subtitle,
  children,
}: {
  layout: ReturnType<typeof useShiftSheetLayout>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.content, { paddingHorizontal: layout.padH, paddingTop: layout.padV, paddingBottom: layout.isCompact ? 8 : layout.padV }]}>
      <View style={[s.icon, { width: layout.iconBox, height: layout.iconBox, borderRadius: layout.iconBox / 2, marginBottom: layout.isCompact ? 10 : 16 }]}>
        <BanknoteIcon size={layout.iconGlyph} color={colors.gold} strokeWidth={1.6} />
      </View>
      <AppText variant="h2" style={s.title}>{title}</AppText>
      <AppText
        variant="body"
        style={[s.sub, layout.isCompact && { marginTop: 4, marginBottom: 12 }, layout.isTablet && { fontSize: 15, lineHeight: 22 }]}
      >
        {subtitle}
      </AppText>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    backgroundColor: 'rgba(184,147,90,0.12)',
    borderWidth: 1,
    borderColor: colors.borderGold25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  sub: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold14,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  peso: {
    fontFamily: fonts.sansExtraBold,
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    color: colors.textPrimary,
    fontFamily: fonts.sansBold,
    padding: 0,
    backgroundColor: 'transparent',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  errorText: { color: colors.danger, flex: 1 },
  btn: {
    width: '100%',
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  btnText: {
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
    textAlign: 'center',
  },
  cancelBtn: { paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 13, fontFamily: fonts.sansSemiBold, color: colors.textMuted },
});
