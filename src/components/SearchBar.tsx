import React from 'react';
import { Platform, StyleSheet, TextInput, TextStyle, View } from 'react-native';
import { SearchIcon } from '../icons';
import { useBreakpoint } from '../breakpoints';
import { colors } from '../theme';

const webInputReset: TextStyle = Platform.OS === 'web'
  ? { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' }
  : {};

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
  const { gutter } = useBreakpoint();
  return (
    <View style={[styles.wrap, { paddingHorizontal: gutter }, tablet && styles.wrapTablet]}>
      <View style={[styles.bar, tablet && { paddingVertical: 11, paddingHorizontal: 14 }]}>
        <SearchIcon size={tablet ? 16 : 15} color={colors.textLabel} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, webInputReset, { fontSize: tablet ? 14 : 13.5 }]}
          underlineColorAndroid="transparent"
          selectionColor={colors.gold}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  wrapTablet: {
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
    width: '100%',
    minWidth: 0,
    color: colors.textPrimary,
    padding: 0,
    backgroundColor: 'transparent',
  },
});
