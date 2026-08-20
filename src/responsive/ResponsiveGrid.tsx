import React, { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface ResponsiveGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  /** Tiles never render narrower than this — the column count is derived from it, not the
   *  other way around, so the same component adapts to a phone, a tablet, a split-screen
   *  foldable, or a resized browser window without any breakpoint-specific column count. */
  minTileWidth?: number;
  gap?: number;
  style?: object;
  /** Skips the onLayout-driven formula and pins the column count — for a caller (e.g. a phone
   *  layout that always wants exactly 2 columns) that knows its column count ahead of time
   *  rather than deriving it from measured width. */
  columns?: number;
}

export function ResponsiveGrid<T>({
  items,
  renderItem,
  keyExtractor,
  minTileWidth = 160,
  gap = 12,
  style,
  columns: fixedColumns,
}: ResponsiveGridProps<T>) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  // +gap in the numerator accounts for the fact that N tiles only need (N-1) gaps between them,
  // not N — without it the formula under-counts columns by one at exact-fit widths.
  const columns = fixedColumns ?? Math.max(1, Math.floor((containerWidth + gap) / (minTileWidth + gap)));
  const tileWidth = containerWidth > 0
    ? (containerWidth - gap * (columns - 1)) / columns
    : undefined;

  return (
    <View onLayout={onLayout} style={[styles.grid, { gap }, style]}>
      {tileWidth != null &&
        items.map((item, index) => (
          <View key={keyExtractor(item, index)} style={{ width: tileWidth }}>
            {renderItem(item, index)}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
