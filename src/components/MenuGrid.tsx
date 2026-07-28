import React, { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
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

  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {itemWidth &&
        items.map((it) => {
          const stock = stockByMenuId?.[it.id];
          return (
            <View key={it.id} style={{ width: itemWidth }}>
              <MenuItemCard
                item={it}
                qty={cartQtyByMenuId[it.id] || 0}
                variant={variant}
                onPress={() => onItemPress(it.id)}
                unavailable={stock?.unavailable}
                lowQty={stock?.lowQty ?? null}
              />
            </View>
          );
        })}
    </View>
  );
}
