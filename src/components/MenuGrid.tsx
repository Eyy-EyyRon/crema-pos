import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SearchIcon } from '../icons';
import { colors, fonts } from '../theme';
import { MenuItemStock } from '../useCremaPos';
import { MenuItem } from '../types';
import { MenuItemCard } from './MenuItemCard';
import { ResponsiveGrid } from '../responsive/ResponsiveGrid';

interface MenuGridProps {
  items: MenuItem[];
  cartQtyByMenuId: Record<string, number>;
  stockByMenuId?: Record<string, MenuItemStock>;
  onItemPress: (id: string) => void;
  variant?: 'phone' | 'tablet';
  fixedColumns?: number;
  minTileWidth?: number;
  gap?: number;
}

// Thin wrapper: MenuGrid owns the menu-specific bits (empty state, MenuItemCard, stock/qty
// lookups) and hands the column-count/tile-width math off to ResponsiveGrid — the same formula
// this file used to compute inline, now shared with any other grid in the app.
export function MenuGrid({
  items,
  cartQtyByMenuId,
  stockByMenuId,
  onItemPress,
  variant = 'phone',
  fixedColumns,
  minTileWidth = 158,
  gap = 15,
}: MenuGridProps) {
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <SearchIcon size={26} color={colors.textLabel} strokeWidth={1.8} />
        <Text style={styles.emptyTitle}>No items found</Text>
        <Text style={styles.emptySub}>Try a different search or category.</Text>
      </View>
    );
  }

  return (
    <ResponsiveGrid
      items={items}
      keyExtractor={(it) => it.id}
      minTileWidth={minTileWidth}
      gap={gap}
      columns={fixedColumns}
      renderItem={(it) => (
        <MenuItemCard
          item={it}
          qty={cartQtyByMenuId[it.id] || 0}
          variant={variant}
          onPress={() => onItemPress(it.id)}
          stock={stockByMenuId?.[it.id]}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 6,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: colors.textLabel,
  },
});
