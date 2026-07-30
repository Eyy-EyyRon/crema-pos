import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOffIcon } from '../icons';
import { colors, fonts } from '../theme';

// A persistent, hard-to-miss signal that the tablet has lost connectivity —
// previously the only trace of this was an after-the-fact "Not synced yet"
// badge on individual queue tickets, easy to miss while actively ringing up
// orders.
export function OfflineBanner({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    // Deliberately normal flow, not absolutely positioned — it needs to push
    // the header below it down, not overlay on top of it. Full-screen modals
    // (all absolutely positioned to the root's true bounds) still correctly
    // cover the whole screen including this banner when they're open.
    <View style={[s.banner, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <WifiOffIcon size={12} color={colors.screenBg} strokeWidth={2.4} />
      <Text style={s.text}>Offline — orders will sync once reconnected</Text>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.heatMedText,
    paddingBottom: 6,
  },
  text: {
    fontSize: 11.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
    letterSpacing: 0.2,
  },
});
