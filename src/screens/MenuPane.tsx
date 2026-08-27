import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CategoryRow } from '../components/CategoryRow';
import { MenuHeader } from '../components/Header';
import { MenuGrid } from '../components/MenuGrid';
import { SearchBar } from '../components/SearchBar';
import { useBreakpoint } from '../breakpoints';
import { colors } from '../theme';
import { MenuItem } from '../types';
import { MenuItemStock } from '../useCremaPos';

export function MenuPane({
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
  popupName: string | null;
}) {
  const { gutter, isCompact } = useBreakpoint();
  return (
    <View style={styles.pane}>
      <MenuHeader
        variant="tablet"
        queueCount={queueCount}
        onQueue={onQueue}
        orderTypeLabel={orderTypeLabel}
        onChangeType={onChangeType}
        userName={userName}
        onAccount={onAccount}
        popupName={popupName}
      />
      <SearchBar value={search} onChangeText={onSearch} variant="tablet" />
      <CategoryRow categories={categories} active={selCat} onSelect={onSelectCat} variant="tablet" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.gridScroll, { paddingHorizontal: gutter }]}>
        <MenuGrid items={items} cartQtyByMenuId={cartQtyByMenuId} stockByMenuId={stockByMenuId} onItemPress={onItemPress} variant="tablet" minTileWidth={isCompact ? 140 : 158} gap={isCompact ? 12 : 15} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.screenBg,
  },
  gridScroll: {
    paddingTop: 2,
    paddingBottom: 26,
  },
});
