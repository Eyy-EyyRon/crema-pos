import React from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { peso0 } from '../format';
import { PlusIcon } from '../icons';
import { catColors, colors, fonts } from '../theme';
import { MenuItem } from '../types';
import { Shot } from './Shot';

interface MenuItemCardProps {
  item: MenuItem;
  qty: number;
  variant?: 'phone' | 'tablet';
  onPress: () => void;
  /** True once the master-stock ingredients backing this item's recipe can no longer cover another unit. */
  unavailable?: boolean;
  /** Sellable units remaining when running low (null when not low / not recipe-tracked). */
  lowQty?: number | null;
}

export function MenuItemCard({ item, qty, variant = 'phone', onPress, unavailable = false, lowQty = null }: MenuItemCardProps) {
  const tablet = variant === 'tablet';
  const badgeBg = catColors[item.category] || '#2C3E5C';
  const stockPill = unavailable ? (
    <View style={[styles.stockBadge, styles.stockBadgeOut]}>
      <Text style={styles.stockBadgeText}>Out of Stock</Text>
    </View>
  ) : lowQty !== null ? (
    <View style={[styles.stockBadge, styles.stockBadgeLow]}>
      <Text style={styles.stockBadgeText}>{lowQty} left</Text>
    </View>
  ) : null;

  return (
    <Pressable onPress={onPress} disabled={unavailable} style={[styles.card, unavailable && styles.cardDisabled]}>
      {item.image_url ? (
        <View style={{ height: tablet ? 96 : 86, position: 'relative' as const, backgroundColor: '#101d2b', overflow: 'hidden' }}>
          <Image
            source={{ uri: item.image_url }}
            style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.55 }] }]}
            resizeMode="contain"
          />
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
          {qty > 0 && (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{qty}</Text>
            </View>
          )}
          {stockPill}
        </View>
      ) : (
        <Shot label="product" style={{ height: tablet ? 96 : 86, position: 'relative' as const }}>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
          {qty > 0 && (
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{qty}</Text>
            </View>
          )}
          {stockPill}
        </Shot>
      )}
      <View style={[styles.content, tablet && styles.contentTablet]}>
        <Text style={[styles.name, { minHeight: tablet ? 34 : 32, fontSize: tablet ? 13.5 : 13 }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.footerRow}>
          <Text style={[styles.price, { fontSize: tablet ? 14 : 13.5 }]}>{peso0(item.price)}</Text>
          <View style={[styles.addBtn, tablet && { width: 28, height: 28 }]}>
            <PlusIcon size={tablet ? 14 : 13} color={colors.goldLight} strokeWidth={3} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  stockBadge: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  stockBadgeOut: {
    backgroundColor: colors.overlayStrong,
    borderColor: 'rgba(255,107,122,0.4)',
  },
  stockBadgeLow: {
    backgroundColor: colors.heatMedBg,
    borderColor: colors.heatMedBorder,
  },
  stockBadgeText: {
    fontSize: 9,
    fontFamily: fonts.sansExtraBold,
    color: colors.textPrimary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 8.5,
    fontFamily: fonts.sansBold,
    color: colors.goldBrightText,
  },
  qtyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeText: {
    fontSize: 11,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  content: {
    paddingTop: 10,
    paddingHorizontal: 11,
    paddingBottom: 12,
  },
  contentTablet: {
    paddingTop: 11,
    paddingHorizontal: 12,
    paddingBottom: 13,
  },
  name: {
    fontFamily: fonts.sansBold,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    fontFamily: fonts.sansExtraBold,
    color: colors.goldLight,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.borderGold25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
