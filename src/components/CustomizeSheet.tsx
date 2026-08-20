import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBreakpoint } from '../breakpoints';
import { colors } from '../theme';
import { CustomizeContent } from './CustomizeContent';

interface CustomizeSheetProps extends React.ComponentProps<typeof CustomizeContent> {}

export function CustomizeSheet(props: CustomizeSheetProps) {
  const { isCompact, height } = useBreakpoint();
  const topOffset = isCompact ? 8 : Math.max(48, Math.round(height * 0.08));
  return (
    <View style={styles.overlayContainer}>
      <Pressable style={styles.overlay} onPress={props.onClose} />
      <View style={[styles.sheet, { top: topOffset }]}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <CustomizeContent {...props} />
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
