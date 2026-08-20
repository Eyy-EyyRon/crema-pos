import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BagIcon, CoffeeIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface TypeButtonProps {
  kind: 'dine-in' | 'takeout';
  active: boolean;
  onPress: () => void;
}

export function TypeButton({ kind, active, onPress }: TypeButtonProps) {
  const iconColor = active ? colors.goldLight : colors.textMuted;
  return (
    <Pressable
      onPress={() => { tapLight(); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: active ? colors.chipBg : colors.cardBg,
          borderColor: active ? 'rgba(184,147,90,0.35)' : colors.borderGold12,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${kind === 'dine-in' ? 'Dine-In' : 'Takeout'} order type`}
    >
      {kind === 'dine-in' ? <CoffeeIcon size={17} color={iconColor} /> : <BagIcon size={17} color={iconColor} />}
      <Text style={[styles.label, { color: active ? colors.goldBrightText : colors.textMuted }]} numberOfLines={1}>
        {kind === 'dine-in' ? 'Dine-In' : 'Takeout'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 132,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13.5,
    fontFamily: fonts.sansExtraBold,
    flexShrink: 1,
  },
});
