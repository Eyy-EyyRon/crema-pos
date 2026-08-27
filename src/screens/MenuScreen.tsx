import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryRow } from '../components/CategoryRow';
import { MenuGrid } from '../components/MenuGrid';
import { MenuHeader } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { peso } from '../format';
import { colors, fonts } from '../theme';
import { MenuItem } from '../types';
import { MenuItemStock } from '../useCremaPos';
import { useBreakpoint } from '../breakpoints';

export function MenuScreen({
  items,
  cartQtyByMenuId,
  stockByMenuId,
  categories,
  selCat,
  onSelectCat,
  search,
  onSearch,
  onItemPress,
  queueCount,
  onQueue,
  orderTypeLabel,
  onChangeType,
  userName,
  onAccount,
  cartCount,
  cartTotal,
  onViewOrder,
  popupName,
}: {
  items: MenuItem[];
  cartQtyByMenuId: Record<string, number>;
  stockByMenuId: Record<string, MenuItemStock>;
  categories: string[];
  selCat: string;
  onSelectCat: (c: string) => void;
  search: string;
  onSearch: (v: string) => void;
  onItemPress: (id: string) => void;
  queueCount: number;
  onQueue: () => void;
  orderTypeLabel: string;
  onChangeType: () => void;
  userName: string;
  onAccount: () => void;
  cartCount: number;
  cartTotal: number;
  onViewOrder: () => void;
  popupName: string | null;
}) {
  const { isTablet, gutter, isCompact } = useBreakpoint();
  const showCartBar = cartCount > 0;
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <MenuHeader queueCount={queueCount} onQueue={onQueue} orderTypeLabel={orderTypeLabel} onChangeType={onChangeType} userName={userName} onAccount={onAccount} popupName={popupName} />
      <SearchBar value={search} onChangeText={onSearch} />
      <CategoryRow categories={categories} active={selCat} onSelect={onSelectCat} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.gridScroll, { paddingHorizontal: gutter, paddingBottom: showCartBar ? 88 : 24 }]}>
        <MenuGrid items={items} cartQtyByMenuId={cartQtyByMenuId} stockByMenuId={stockByMenuId} onItemPress={onItemPress} variant={isTablet ? 'tablet' : 'phone'} minTileWidth={isCompact ? 140 : 152} gap={isTablet ? 16 : 12} />
      </ScrollView>
      {showCartBar && (
        <Pressable
          onPress={onViewOrder}
          style={({ pressed }) => [styles.cartBar, { left: gutter, right: gutter, bottom: 12 + insets.bottom }, isTablet && styles.cartBarTablet, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`View order, ${cartCount} item${cartCount === 1 ? '' : 's'}, ${peso(cartTotal)}`}
        >
          <View style={styles.cartBarLeft}>
            <View style={[styles.cartCountCircle, isTablet && styles.cartCountCircleTablet]}>
              <Text style={[styles.cartCountText, isTablet && styles.cartCountTextTablet]}>{cartCount}</Text>
            </View>
            <Text style={[styles.viewOrderText, isTablet && styles.viewOrderTextTablet]}>View Order</Text>
          </View>
          <Text style={[styles.cartTotalText, isTablet && styles.cartTotalTextTablet]}>{peso(cartTotal)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  gridScroll: {
    paddingTop: 2,
  },
  cartBar: {
    position: 'absolute',
    backgroundColor: colors.gold,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartBarTablet: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  cartCountCircle: {
    backgroundColor: 'rgba(10,18,26,0.25)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountCircleTablet: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  cartCountText: {
    fontSize: 13,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  cartCountTextTablet: {
    fontSize: 14,
  },
  viewOrderText: {
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  viewOrderTextTablet: {
    fontSize: 15,
  },
  cartTotalText: {
    fontSize: 15.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  cartTotalTextTablet: {
    fontSize: 17,
  },
});
