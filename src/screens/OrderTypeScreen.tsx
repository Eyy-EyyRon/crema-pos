import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrderTypeTile } from '../components/OrderTypeTile';
import { useBreakpoint } from '../breakpoints';
import { colors, fonts } from '../theme';

export function OrderTypeScreen({
  variant = 'phone',
  orderNumber,
  onSelectDineIn,
  onSelectTakeout,
}: {
  variant?: 'phone' | 'tablet';
  orderNumber: number;
  onSelectDineIn?: () => void;
  onSelectTakeout?: () => void;
}) {
  const orderLabel = `New Order · #${String(orderNumber).padStart(4, '0')}`;
  const { isLandscape, gutter, isCompact, isTablet, width } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const sideBySide = variant === 'tablet' || isLandscape;
  const tileVariant = variant === 'tablet' || isTablet ? 'tablet' : 'phone';
  const contentWidth = Math.min(width - gutter * 2, sideBySide ? 720 : 420);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: gutter,
          paddingTop: insets.top + (isCompact ? 8 : 16),
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.centerBlock}>
        <Text style={[styles.brand, (variant === 'tablet' || isTablet) && styles.brandTablet, isCompact && styles.brandCompact]}>
          CREMA
        </Text>
        <Text style={[styles.brandSub, (variant === 'tablet' || isTablet) && styles.brandSubTablet]}>
          COFFEE &amp; ICE CREAM
        </Text>
        <Text style={styles.lbl}>{orderLabel}</Text>
        <Text style={[styles.title, (variant === 'tablet' || isTablet) && styles.titleTablet, isCompact && styles.titleCompact]}>
          How are we serving this order?
        </Text>

        <View
          style={[
            styles.tiles,
            sideBySide ? styles.tilesRow : styles.tilesCol,
            { width: contentWidth, maxWidth: '100%' },
          ]}
        >
          {onSelectDineIn && (
            <View style={sideBySide ? styles.tileSlotRow : styles.tileSlot}>
              <OrderTypeTile kind="dine-in" variant={tileVariant} onPress={onSelectDineIn} />
            </View>
          )}
          {onSelectTakeout && (
            <View style={sideBySide ? styles.tileSlotRow : styles.tileSlot}>
              <OrderTypeTile kind="takeout" variant={tileVariant} onPress={onSelectTakeout} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  centerBlock: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 2,
    color: colors.goldBrightText,
    textAlign: 'center',
  },
  brandTablet: {
    fontSize: 52,
    letterSpacing: 3,
  },
  brandCompact: {
    fontSize: 32,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 4,
    color: colors.gold,
    fontFamily: fonts.sansBold,
    marginTop: 2,
    textAlign: 'center',
  },
  brandSubTablet: {
    fontSize: 11,
    letterSpacing: 4.5,
    marginTop: 4,
  },
  lbl: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textLabel,
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  titleTablet: {
    fontSize: 32,
    lineHeight: 38,
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 16,
    marginTop: 0,
  },
  tiles: {
    gap: 14,
    alignItems: 'center',
  },
  tilesCol: {
    flexDirection: 'column',
  },
  tilesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 16,
  },
  tileSlot: {
    width: '100%',
  },
  tileSlotRow: {
    flex: 1,
    minWidth: 0,
  },
});
