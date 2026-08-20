import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BanknoteIcon, CheckIcon, GiftIcon, SmartphoneIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface PayButtonProps {
  kind: 'cash' | 'gcash' | 'gift_card';
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}

const LABELS: Record<PayButtonProps['kind'], string> = {
  cash: 'Cash',
  gcash: 'GCash',
  gift_card: 'Gift Card',
};

export function PayButton({ kind, active, onPress, compact }: PayButtonProps) {
  const iconColor = active ? colors.goldLight : colors.textMuted;
  const iconSize = compact ? 18 : 20;
  return (
    <Pressable
      onPress={() => { tapLight(); onPress(); }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        {
          backgroundColor: active ? colors.chipBg : colors.cardBg,
          borderColor: active ? 'rgba(184,147,90,0.45)' : colors.borderGold12,
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
          { backgroundColor: active ? 'rgba(184,147,90,0.16)' : 'rgba(36,51,80,0.5)' },
        ]}
      >
        {kind === 'cash' && <BanknoteIcon size={iconSize} color={iconColor} />}
        {kind === 'gcash' && <SmartphoneIcon size={iconSize} color={iconColor} />}
        {kind === 'gift_card' && <GiftIcon size={iconSize} color={iconColor} />}
        {active && (
          <View style={styles.checkBadge}>
            <CheckIcon size={10} color={colors.screenBg} />
          </View>
        )}
      </View>
      <Text
        style={[styles.label, compact && styles.labelCompact, { color: active ? colors.goldBrightText : colors.textSecondary }]}
        numberOfLines={2}
      >
        {LABELS[kind]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  baseCompact: {
    minWidth: 76,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    textAlign: 'center',
    lineHeight: 15,
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
});
