import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { peso0 } from '../format';
import { colors, fonts } from '../theme';

interface OptionChipProps {
  name: string;
  price: number;
  active: boolean;
  onPress: () => void;
}

export function OptionChip({ name, price, active, onPress }: OptionChipProps) {
  const showPrice = price !== 0;
  const priceStr = (price > 0 ? '+' : '') + peso0(price);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: active ? colors.chipBg : colors.cardBg,
          borderColor: active ? 'rgba(184,147,90,0.4)' : colors.borderGold12,
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? colors.goldBrightText : colors.textSecondary }]}>{name}</Text>
      {showPrice && (
        <Text style={[styles.price, { color: active ? colors.goldLight : colors.textMuted }]}>{priceStr}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
  },
  price: {
    fontSize: 11.5,
    fontFamily: fonts.sansBold,
  },
});
