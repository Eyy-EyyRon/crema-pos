import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBreakpoint } from '../breakpoints';
import { useKeyboardOverlap } from '../responsive/useKeyboardOverlap';
import { colors } from '../theme';
import { CustomizeContent } from './CustomizeContent';

interface CustomizeSheetProps extends React.ComponentProps<typeof CustomizeContent> {}

export function CustomizeSheet(props: CustomizeSheetProps) {
  const { isCompact, height } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardOverlap();

  // Ensure the top gap respects the notch on phones, and gives ample breathing room on tablets
  const topGap = isCompact
    ? Math.max(insets.top + 16, 48)
    : Math.max(80, Math.round(height * 0.1));

  const sheetMax = Math.max(280, height - topGap - kb);

  // Responsive constraint: Full width on phones, capped width on tablets/landscape
  const sheetMaxWidth = isCompact ? '100%' : 540;

  return (
    <View style={[styles.overlayContainer, { paddingBottom: kb }]} pointerEvents="box-none">
      <Pressable style={styles.overlay} onPress={props.onClose} />

      {/* Wrapper to handle horizontal centering on large screens */}
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            {
              maxHeight: sheetMax,
              maxWidth: sheetMaxWidth,
              // Add baseline bottom padding for tablets since they often have 0 bottom insets
              paddingBottom: kb > 0 ? 8 : Math.max(insets.bottom, isCompact ? 0 : 24),
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <CustomizeContent {...props} fillHeight={false} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  sheetWrapper: {
    width: '100%',
    alignItems: 'center', // Centers the sheet horizontally on tablets
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: colors.borderGold20,
    overflow: 'hidden',
    // Added shadow/elevation so the sheet pops from the background when centered on a tablet
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2a3648',
    opacity: 0.5, // Slight opacity makes handles look cleaner
  },
});