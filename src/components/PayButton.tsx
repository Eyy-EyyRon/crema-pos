import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BanknoteIcon, CheckIcon, SmartphoneIcon } from '../icons';
import { tapLight } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface PayButtonProps {
  kind: 'cash' | 'gcash';
  active: boolean;
  onPress: () => void;
}

export function PayButton({ kind, active, onPress }: PayButtonProps) {
  const iconColor = active ? colors.goldLight : colors.textMuted;
  return (
    <Pressable
      onPress={() => { tapLight(); onPress(); }}
      style={[
        styles.base,
        {
          backgroundColor: active ? colors.chipBg : colors.cardBg,
          borderColor: active ? 'rgba(184,147,90,0.35)' : colors.borderGold12,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: active ? 'rgba(184,147,90,0.14)' : 'rgba(36,51,80,0.5)' },
        ]}
      >
        {kind === 'cash' ? <BanknoteIcon size={18} color={iconColor} /> : <SmartphoneIcon size={18} color={iconColor} />}
      </View>
      <Text style={[styles.label, { color: active ? colors.goldBrightText : colors.textMuted }]}>
        {kind === 'cash' ? 'Cash' : 'GCash'}
      </Text>
      {active && (
        <View style={styles.checkWrap}>
          <CheckIcon size={15} color={colors.goldLight} />
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
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
  },
  checkWrap: {
    marginLeft: 'auto',
  },
});
