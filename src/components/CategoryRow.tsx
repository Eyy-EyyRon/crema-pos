import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from './Chip';

export function CategoryRow({
  categories,
  active,
  onSelect,
  variant = 'phone',
}: {
  categories: string[];
  active: string;
  onSelect: (c: string) => void;
  variant?: 'phone' | 'tablet';
}) {
  const tablet = variant === 'tablet';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: tablet ? 26 : 20, gap: tablet ? 9 : 8 }]}
      style={styles.scroll}
    >
      {categories.map((c) => (
        <Chip key={c} label={c} active={active === c} onPress={() => onSelect(c)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    paddingVertical: 4,
  },
  row: {
    alignItems: 'center',
  },
});
