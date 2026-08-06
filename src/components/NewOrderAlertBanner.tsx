import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReceiptIcon } from '../icons';
import { colors, fonts } from '../theme';

const AUTO_DISMISS_MS = 4000;

// Visual half of the new-order alert (see lib/sound.ts::playNewOrderChime for the vibration
// half) — fires when another terminal/barista's order lands in the queue while this one isn't
// looking at it. Self-dismissing so it never needs its own close button.
export function NewOrderAlertBanner({
  alert,
  onDismiss,
}: {
  alert: { orderNo: string } | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [alert, onDismiss]);

  if (!alert) return null;

  return (
    <View style={[s.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <ReceiptIcon size={13} color={colors.screenBg} strokeWidth={2} />
      <Text style={s.text}>New order — {alert.orderNo}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.success,
    paddingBottom: 6,
  },
  text: {
    fontSize: 11.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
    letterSpacing: 0.2,
  },
});
