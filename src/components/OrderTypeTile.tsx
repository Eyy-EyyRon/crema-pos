import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BagIcon, ChevronRightIcon, CoffeeIcon } from '../icons';
import { tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';

interface OrderTypeTileProps {
  kind: 'dine-in' | 'takeout';
  variant?: 'phone' | 'tablet';
  onPress: () => void;
}

export function OrderTypeTile({ kind, variant = 'phone', onPress }: OrderTypeTileProps) {
  const tablet = variant === 'tablet';
  const isDineIn = kind === 'dine-in';
  const title = isDineIn ? 'Dine-In' : 'Takeout';
  const subtitle = isDineIn ? 'Serve at the table' : 'Grab and go';
  const Icon = isDineIn ? CoffeeIcon : BagIcon;

  return (
    <Pressable
      onPress={() => { tapMedium(); onPress(); }}
      style={({ pressed }) => [styles.card, tablet && styles.cardTablet, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
    >
      <View style={[styles.iconCircle, tablet && styles.iconCircleTablet]}>
        <Icon size={tablet ? 28 : 24} color={colors.goldLight} strokeWidth={1.7} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, tablet && styles.titleTablet]}>{title}</Text>
        <Text style={[styles.subtitle, tablet && styles.subtitleTablet]}>{subtitle}</Text>
      </View>
      <ChevronRightIcon size={tablet ? 22 : 20} color={colors.textLabel} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderGold20,
    backgroundColor: colors.cardBg,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardTablet: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 18,
    // Removed flex: 1 to prevent vertical stretching/overlapping in column layouts
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(184,147,90,0.1)',
    borderWidth: 1,
    borderColor: colors.borderGold25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCircleTablet: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  titleTablet: {
    fontSize: 19,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  subtitleTablet: {
    fontSize: 13,
    marginTop: 4,
  },
});
