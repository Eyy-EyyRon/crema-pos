import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  fill?: boolean;
}

export function Chip({ label, active, onPress, fill }: ChipProps) {
  return (
    <Pressable
      onPress={() => { tapLight(); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        fill && styles.fill,
        active
          ? { backgroundColor: colors.gold, borderColor: colors.gold }
          : { backgroundColor: 'rgba(26,42,62,0.4)', borderColor: colors.borderGold12 },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.label,
          fill && styles.labelFill,
          active
            ? { color: colors.screenBg, fontFamily: fonts.sansBold }
            : { color: colors.textMuted, fontFamily: fonts.sansSemiBold },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  fill: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 96,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
  },
  labelFill: {
    textAlign: 'center',
  },
});
