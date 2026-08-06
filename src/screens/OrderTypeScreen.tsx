import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OrderTypeTile } from '../components/OrderTypeTile';
import { colors, fonts } from '../theme';

export function OrderTypeScreen({
  variant = 'phone',
  orderNumber,
  onSelectDineIn,
  onSelectTakeout,
}: {
  variant?: 'phone' | 'tablet';
  orderNumber: number;
  onSelectDineIn: () => void;
  onSelectTakeout: () => void;
}) {
  const orderLabel = `New Order · #${String(orderNumber).padStart(4, '0')}`;

  if (variant === 'tablet') {
    return (
      <View style={styles.tabletWrap}>
        <Text style={styles.brandTablet}>CREMA</Text>
        <Text style={styles.brandSubTablet}>COFFEE &amp; ICE CREAM</Text>
        <Text style={[styles.lbl, { marginTop: 34, marginBottom: 6 }]}>{orderLabel}</Text>
        <Text style={styles.titleTablet}>How are we serving this order?</Text>
        <View style={styles.tilesRowTablet}>
          <OrderTypeTile kind="dine-in" variant="tablet" onPress={onSelectDineIn} />
          <OrderTypeTile kind="takeout" variant="tablet" onPress={onSelectTakeout} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.phoneWrap}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>CREMA</Text>
        <Text style={styles.brandSub}>COFFEE &amp; ICE CREAM</Text>
      </View>
      <View style={styles.titleBlock}>
        <Text style={[styles.lbl, { textAlign: 'center', marginBottom: 4 }]}>{orderLabel}</Text>
        <Text style={styles.title}>How are we serving{'\n'}this order?</Text>
      </View>
      <View style={styles.tilesCol}>
        <OrderTypeTile kind="dine-in" variant="phone" onPress={onSelectDineIn} />
        <OrderTypeTile kind="takeout" variant="phone" onPress={onSelectTakeout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneWrap: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  brandBlock: {
    paddingTop: 28,
    paddingHorizontal: 26,
    paddingBottom: 6,
    alignItems: 'center',
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 2,
    color: colors.goldBrightText,
  },
  brandSub: {
    fontSize: 10,
    letterSpacing: 4,
    color: colors.gold,
    fontFamily: fonts.sansBold,
    marginTop: 2,
  },
  titleBlock: {
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  lbl: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.textLabel,
  },
  title: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  tilesCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 26,
    paddingBottom: 30,
  },
  tabletWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  brandTablet: {
    fontFamily: fonts.display,
    fontSize: 52,
    letterSpacing: 3,
    color: colors.goldBrightText,
  },
  brandSubTablet: {
    fontSize: 11,
    letterSpacing: 4.5,
    color: colors.gold,
    fontFamily: fonts.sansBold,
    marginTop: 4,
  },
  titleTablet: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: 34,
  },
  tilesRowTablet: {
    flexDirection: 'row',
    gap: 22,
  },
});
