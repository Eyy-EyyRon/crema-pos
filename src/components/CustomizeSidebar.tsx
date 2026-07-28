import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { CustomizeContent } from './CustomizeContent';

interface CustomizeSidebarProps extends Omit<React.ComponentProps<typeof CustomizeContent>, 'variant'> {}

export function CustomizeSidebar(props: CustomizeSidebarProps) {
  return (
    <View style={styles.overlayContainer}>
      <Pressable style={styles.overlay} onPress={props.onClose} />
      <View style={styles.sidebar}>
        <CustomizeContent {...props} variant="tablet" />
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
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 452,
    backgroundColor: colors.screenBg,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderGold20,
    overflow: 'hidden',
  },
});
