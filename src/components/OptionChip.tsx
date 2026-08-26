import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { peso0 } from '../format';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface OptionChipProps {
  name: string;
  price: number;
  active: boolean;
  onPress: () => void;
  /** Linked to a depleted ingredient via modifier_recipes — stays visible but unselectable, same treatment as an out-of-stock menu item. */
  outOfStock?: boolean;
}

export function OptionChip({ name, price, active, onPress, outOfStock = false }: OptionChipProps) {
  const showPrice = price !== 0;
  const priceStr = (price > 0 ? '+' : '') + peso0(price);
  return (
    <Pressable
      onPress={() => { if (outOfStock && !active) return; tapLight(); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: active ? colors.chipBg : colors.cardBg,
          borderColor: active ? 'rgba(184,147,90,0.4)' : colors.borderGold12,
          opacity: outOfStock && !active ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: outOfStock && !active }}
      accessibilityLabel={outOfStock ? `${name}, out of stock` : showPrice ? `${name}, ${priceStr}` : name}
    >
      <Text style={[styles.label, { color: active ? colors.goldBrightText : colors.textSecondary }]}>{name}</Text>
      {outOfStock ? (
        <Text style={[styles.price, { color: colors.danger }]}>Out of stock</Text>
      ) : showPrice ? (
        <Text style={[styles.price, { color: active ? colors.goldLight : colors.textMuted }]}>{priceStr}</Text>
      ) : null}
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
