import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useBreakpoint } from '../breakpoints';
import { useKeyboardOverlap } from './useKeyboardOverlap';

const ANIM_DURATION = 220;
const TABLET_DIALOG_MAX_WIDTH = 500;

export interface ResponsiveModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Tablet dialog's max-width. Ignored on phone, where the sheet always spans full width. */
  maxWidth?: number;
  /** Tap-outside-to-dismiss. Set false for a modal that must be dismissed via an explicit
   *  in-content button (e.g. a payment step that shouldn't be lost to a stray backdrop tap). */
  dismissOnBackdropPress?: boolean;
  style?: ViewStyle;
  /** Stacking order against other absolutely-positioned layers — other ResponsiveModal instances,
   *  or anything else rendered on top of the screen (a hardware-alert banner, a session-timeout
   *  overlay). Omit to fall back to render order, which is fine as long as only one of these is
   *  ever visible at a time; pass it when a caller needs a specific modal to guaranteed-win (or
   *  lose) against another that might show up unpredictably. */
  zIndex?: number;
}

/**
 * Phone: bottom sheet, full width, slides up from off-screen.
 * Tablet: centered dialog capped at `maxWidth`, fades in.
 * Both read useSafeAreaInsets() directly — this renders as an absolutely-positioned overlay
 * layer (same convention as the app's existing ad hoc modals), so it sits outside any screen's
 * own SafeAreaView and would otherwise sit the phone sheet under the home indicator, or let the
 * tablet dialog get pinned into a notch/corner at extreme aspect ratios.
 */
export function ResponsiveModal({
  visible,
  onClose,
  children,
  maxWidth = TABLET_DIALOG_MAX_WIDTH,
  dismissOnBackdropPress = true,
  style,
  zIndex,
}: ResponsiveModalProps) {
  const { isSplit, height: windowHeight } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardOverlap();

  // Stays mounted through the exit animation — `visible` flips to false the instant the caller
  // decides to close, but the sheet/dialog needs one more animated frame before it can unmount.
  const [rendered, setRendered] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: ANIM_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (rendered) {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIM_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!rendered) return null;

  const sheetMax = isSplit
    ? Math.max(280, windowHeight - insets.top - insets.bottom - 48 - kb)
    : Math.min(windowHeight - kb, Math.max(280, Math.round(windowHeight * 0.92) - kb));
  const sheetPadBottom = isSplit ? 0 : (kb > 0 ? 8 : insets.bottom + 12);
  const bodyMax = Math.max(240, sheetMax - sheetPadBottom);
  const sheetTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] });

  const body = (
    <ScrollView
      style={{ maxHeight: bodyMax, width: '100%' }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      bounces={false}
    >
      {children}
    </ScrollView>
  );

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, zIndex != null && { zIndex }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdropPress ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      {isSplit ? (
        <Animated.View
          style={[
            styles.tabletCenterWrap,
            { paddingTop: insets.top, paddingBottom: insets.bottom + kb, paddingLeft: insets.left, paddingRight: insets.right },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.tabletDialog, { maxWidth, maxHeight: sheetMax, opacity: progress }, style]}>
            {body}
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.phoneSheetWrap, kb > 0 && { bottom: kb }]} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.phoneSheet,
              {
                paddingBottom: sheetPadBottom,
                paddingLeft: insets.left,
                paddingRight: insets.right,
                maxHeight: sheetMax,
                transform: [{ translateY: sheetTranslateY }],
              },
              style,
            ]}
          >
            {body}
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.overlayStrong,
    zIndex: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabletCenterWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1,
  },
  tabletDialog: {
    width: '100%',
    maxHeight: '100%',
    backgroundColor: colors.screenBg,
    borderWidth: 1,
    borderColor: colors.borderGold18,
    borderRadius: 22,
    overflow: 'hidden',
  },
  phoneSheetWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  phoneSheet: {
    width: '100%',
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderGold18,
    overflow: 'hidden',
  },
});
