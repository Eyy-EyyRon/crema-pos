import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryRow } from '../components/CategoryRow';
import { MenuGrid } from '../components/MenuGrid';
import { MenuHeader } from '../components/Header';
import { SearchBar } from '../components/SearchBar';
import { peso } from '../format';
import { colors, fonts } from '../theme';
import { MenuItem } from '../types';
import { MenuItemStock } from '../useCremaPos';

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
}) {
  const showCartBar = cartCount > 0;
  return (
    <View style={styles.screen}>
      <MenuHeader queueCount={queueCount} onQueue={onQueue} orderTypeLabel={orderTypeLabel} onChangeType={onChangeType} userName={userName} onAccount={onAccount} />
      <SearchBar value={search} onChangeText={onSearch} />
      <CategoryRow categories={categories} active={selCat} onSelect={onSelectCat} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.gridScroll}>
        <MenuGrid items={items} cartQtyByMenuId={cartQtyByMenuId} stockByMenuId={stockByMenuId} onItemPress={onItemPress} variant="phone" fixedColumns={2} gap={13} />
      </ScrollView>
      {showCartBar && (
        <Pressable
          onPress={onViewOrder}
          style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`View order, ${cartCount} item${cartCount === 1 ? '' : 's'}, ${peso(cartTotal)}`}
        >
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCountCircle}>
              <Text style={styles.cartCountText}>{cartCount}</Text>
            </View>
            <Text style={styles.viewOrderText}>View Order</Text>
          </View>
          <Text style={styles.cartTotalText}>{peso(cartTotal)}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 92,
  },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    backgroundColor: colors.gold,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  cartCountText: {
    fontSize: 13,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  viewOrderText: {
    fontSize: 14,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
  cartTotalText: {
    fontSize: 15.5,
    fontFamily: fonts.sansExtraBold,
    color: colors.screenBg,
  },
});
