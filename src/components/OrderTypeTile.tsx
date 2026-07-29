import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BagIcon, ChevronRightIcon, CoffeeIcon } from '../icons';
import { tapMedium } from '../lib/haptics';
import { colors, fonts } from '../theme';
import { Shot } from './Shot';

interface OrderTypeTileProps {
  kind: 'dine-in' | 'takeout';
  variant?: 'phone' | 'tablet';
  onPress: () => void;
}

export function OrderTypeTile({ kind, variant = 'phone', onPress }: OrderTypeTileProps) {
  const tablet = variant === 'tablet';
  const isDineIn = kind === 'dine-in';
  const title = isDineIn ? 'Dine-In' : 'Takeout';
  const subtitle = isDineIn ? 'Serve at the table · +5% service' : 'Grab and go · no service charge';
  const Icon = isDineIn ? CoffeeIcon : BagIcon;

  return (
    <Pressable onPress={() => { tapMedium(); onPress(); }} style={[styles.card, tablet && styles.cardTablet]}>
      <Shot label={isDineIn ? 'dine-in photo' : 'takeout photo'} style={{ height: tablet ? 140 : 112 }}>
        <View
          style={[
            styles.iconCircle,
            tablet
              ? { width: 50, height: 50, borderRadius: 15, left: 16, bottom: 14 }
              : { width: 46, height: 46, borderRadius: 14, left: 14, bottom: 12 },
          ]}
        >
          <Icon size={tablet ? 26 : 24} color={colors.goldLight} strokeWidth={1.7} />
        </View>
      </Shot>
      <View style={[styles.body, tablet && styles.bodyTablet]}>
        <View>
          <Text style={[styles.title, tablet && { fontSize: 19 }]}>{title}</Text>
          <Text style={[styles.subtitle, tablet && { fontSize: 12.5, marginTop: 3 }]}>{subtitle}</Text>
        </View>
        {!tablet && <ChevronRightIcon size={20} color={colors.textLabel} strokeWidth={2.2} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderGold20,
    backgroundColor: colors.cardBg,
  },
  cardTablet: {
    borderRadius: 22,
    width: 296,
  },
  iconCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(10,18,26,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderGold25,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  bodyTablet: {
    paddingVertical: 17,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
