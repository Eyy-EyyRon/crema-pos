import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../theme';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        active
          ? { backgroundColor: colors.gold, borderColor: colors.gold }
          : { backgroundColor: 'rgba(26,42,62,0.4)', borderColor: colors.borderGold12 },
      ]}
    >
      <Text
        style={[
          styles.label,
          active
            ? { color: colors.screenBg, fontFamily: fonts.sansBold }
            : { color: colors.textMuted, fontFamily: fonts.sansSemiBold },
        ]}
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
  },
  label: {
    fontSize: 13,
  },
});
