import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useBreakpoint } from '../breakpoints';

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
  const { isTablet, height: windowHeight } = useBreakpoint();
  const insets = useSafeAreaInsets();

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

  // Starts a full window-height below the viewport rather than a hardcoded offset — guarantees
  // the sheet is genuinely off-screen at progress=0 regardless of how tall its content ends up.
  const sheetTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] });

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

      {isTablet ? (
        <Animated.View
          style={[
            styles.tabletCenterWrap,
            { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.tabletDialog, { maxWidth, opacity: progress }, style]}>
            <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              {children}
            </KeyboardAvoidingView>
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View style={styles.phoneSheetWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.phoneSheet,
              {
                paddingBottom: insets.bottom + 12,
                paddingLeft: insets.left,
                paddingRight: insets.right,
                transform: [{ translateY: sheetTranslateY }],
              },
              style,
            ]}
          >
            <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              {children}
            </KeyboardAvoidingView>
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
  kav: {
    maxHeight: '100%',
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
    maxHeight: '92%',
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderGold18,
    overflow: 'hidden',
  },
});
