import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useBreakpoint } from '../breakpoints';
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
  const { gutter } = useBreakpoint();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: gutter, gap: tablet ? 9 : 8 }]}
      keyboardShouldPersistTaps="handled"
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
});
