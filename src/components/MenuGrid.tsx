import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { SearchIcon } from '../icons';
import { colors, fonts } from '../theme';
import { MenuItemStock } from '../useCremaPos';
import { MenuItem } from '../types';
import { MenuItemCard } from './MenuItemCard';

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
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const columns = fixedColumns ?? Math.max(1, Math.floor((width + gap) / (minTileWidth + gap)));
  const itemWidth = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;

  if (items.length === 0) {
    return (
      <View onLayout={onLayout} style={styles.empty}>
        <SearchIcon size={26} color={colors.textLabel} strokeWidth={1.8} />
        <Text style={styles.emptyTitle}>No items found</Text>
        <Text style={styles.emptySub}>Try a different search or category.</Text>
      </View>
    );
  }

  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {itemWidth &&
        items.map((it) => (
          <View key={it.id} style={{ width: itemWidth }}>
            <MenuItemCard
              item={it}
              qty={cartQtyByMenuId[it.id] || 0}
              variant={variant}
              onPress={() => onItemPress(it.id)}
              stock={stockByMenuId?.[it.id]}
            />
          </View>
        ))}
    </View>
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
