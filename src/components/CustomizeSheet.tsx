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
  const topGap = isCompact ? 8 : Math.max(48, Math.round(height * 0.08));
  const sheetMax = Math.max(280, height - topGap - kb);
  return (
    <View style={[styles.overlayContainer, { paddingBottom: kb }]} pointerEvents="box-none">
      <Pressable style={styles.overlay} onPress={props.onClose} />
      <View
        style={[
          styles.sheet,
          {
            maxHeight: sheetMax,
            paddingBottom: kb > 0 ? 8 : insets.bottom,
          },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <CustomizeContent {...props} fillHeight={false} />
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
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2a3648',
  },
});
