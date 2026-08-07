import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BanknoteIcon, CheckIcon, GiftIcon, SmartphoneIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface PayButtonProps {
  kind: 'cash' | 'gcash' | 'gift_card';
  active: boolean;
  onPress: () => void;
  /** Tighter icon/padding/gap so 3 buttons fit a narrow row (e.g. the tablet order dock)
   *  without "Gift Card" wrapping to two lines. */
  compact?: boolean;
}

const LABELS: Record<PayButtonProps['kind'], string> = {
  cash: 'Cash',
  gcash: 'GCash',
  gift_card: 'Gift Card',
};

export function PayButton({ kind, active, onPress, compact }: PayButtonProps) {
  const iconColor = active ? colors.goldLight : colors.textMuted;
  const iconSize = compact ? 14 : 18;
  return (
    <Pressable
      onPress={() => { tapLight(); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        {
          backgroundColor: active ? colors.chipBg : colors.cardBg,
          borderColor: active ? 'rgba(184,147,90,0.35)' : colors.borderGold12,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${LABELS[kind]} payment method`}
    >
      <View
        style={[
          styles.iconWrap,
          compact && styles.iconWrapCompact,
          { backgroundColor: active ? 'rgba(184,147,90,0.14)' : 'rgba(36,51,80,0.5)' },
        ]}
      >
        {kind === 'cash' && <BanknoteIcon size={iconSize} color={iconColor} />}
        {kind === 'gcash' && <SmartphoneIcon size={iconSize} color={iconColor} />}
        {kind === 'gift_card' && <GiftIcon size={iconSize} color={iconColor} />}
      </View>
      <Text
        style={[styles.label, compact && styles.labelCompact, { color: active ? colors.goldBrightText : colors.textMuted }]}
        numberOfLines={1}
      >
        {LABELS[kind]}
      </Text>
      {active && (
        <View style={styles.checkWrap}>
          <CheckIcon size={compact ? 13 : 15} color={colors.goldLight} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  baseCompact: {
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 7,
    borderRadius: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 22,
    height: 22,
    borderRadius: 7,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
  },
  labelCompact: {
    fontSize: 11,
  },
  checkWrap: {
    marginLeft: 'auto',
  },
});
