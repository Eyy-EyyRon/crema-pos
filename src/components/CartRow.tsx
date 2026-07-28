import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { peso0 } from '../format';
import { MinusIcon, PlusIcon, XIcon } from '../icons';
import { colors, fonts } from '../theme';
import { CartItem } from '../types';
import { Shot } from './Shot';

interface CartRowProps {
  item: CartItem;
  shotSize?: number;
  onInc: () => void;
  onDec: () => void;
  onRemove: () => void;
}

export function CartRow({ item, shotSize = 44, onInc, onDec, onRemove }: CartRowProps) {
  const hasMods = item.mods.length > 0;
  const modsStr = item.mods.join(' · ') + (item.note ? '  ✎ ' + item.note : '');
  return (
    <View style={styles.row}>
      <Shot label="·" style={{ width: shotSize, height: shotSize, borderRadius: 10, flexShrink: 0 }} />
      <View style={styles.mid}>
        <Text style={styles.name}>{item.name}</Text>
        {hasMods && <Text style={styles.mods}>{modsStr}</Text>}
        <Text style={styles.line}>{peso0(item.unit * item.qty)}</Text>
      </View>
      <View style={styles.right}>
        <Pressable onPress={onRemove} style={styles.removeBtn} hitSlop={8}>
          <XIcon size={14} color={colors.textLabel} strokeWidth={2} />
        </Pressable>
        <View style={styles.stepper}>
          <Pressable onPress={onDec} style={styles.stepBtn}>
            <MinusIcon size={12} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.qty}>{item.qty}</Text>
          <Pressable onPress={onInc} style={[styles.stepBtn, { backgroundColor: colors.gold }]}>
            <PlusIcon size={12} color={colors.screenBg} strokeWidth={3.2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.1)',
    borderRadius: 14,
    padding: 11,
    marginBottom: 9,
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13.5,
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
  },
  mods: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  line: {
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    color: colors.goldLight,
    marginTop: 5,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  removeBtn: {
    padding: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: 'rgba(184,147,90,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: {
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    minWidth: 14,
    textAlign: 'center',
  },
});
