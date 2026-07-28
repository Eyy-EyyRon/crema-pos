import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SearchIcon } from '../icons';
import { colors } from '../theme';

export function SearchBar({
  value,
  onChangeText,
  variant = 'phone',
  placeholder = 'Search menu…',
}: {
  value: string;
  onChangeText: (v: string) => void;
  variant?: 'phone' | 'tablet';
  placeholder?: string;
}) {
  const tablet = variant === 'tablet';
  return (
    <View style={[styles.wrap, tablet && styles.wrapTablet]}>
      <View style={[styles.bar, tablet && { paddingVertical: 11, paddingHorizontal: 14 }]}>
        <SearchIcon size={tablet ? 16 : 15} color={colors.textLabel} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { fontSize: tablet ? 14 : 13.5 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  wrapTablet: {
    paddingHorizontal: 26,
    paddingTop: 2,
    paddingBottom: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    padding: 0,
  },
});
