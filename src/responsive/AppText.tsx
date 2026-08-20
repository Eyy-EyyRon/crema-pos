import React, { forwardRef } from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { useBreakpoint } from '../breakpoints';

export type AppTextVariant = 'h1' | 'h2' | 'body' | 'caption' | 'label';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
}

// Discrete, breakpoint-aware type scale — deliberately NOT a linear scale() function
// (react-native-size-matters etc.). Each variant has its own hand-picked phone/tablet size pair,
// same principle as iOS/Material's named text styles: a tablet headline isn't "phone headline ×
// some ratio," it's its own considered value. Two breakpoints (phone/tablet) is all `useBreakpoint`
// distinguishes today, so that's all this scale needs — if a third tier is ever added there,
// extend PHONE_TYPE/TABLET_TYPE together with it, not with per-variant multipliers.
const PHONE_TYPE = StyleSheet.create({
  h1: { fontSize: 20, lineHeight: 26, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  h2: { fontSize: 16, lineHeight: 21, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fonts.sans, color: colors.textPrimary },
  caption: { fontSize: 12, lineHeight: 17, fontFamily: fonts.sans, color: colors.textMuted },
  label: {
    fontSize: 10, lineHeight: 13, fontFamily: fonts.sansExtraBold, color: colors.textLabel,
    letterSpacing: 1.8, textTransform: 'uppercase',
  },
});

const TABLET_TYPE = StyleSheet.create({
  h1: { fontSize: 24, lineHeight: 30, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  h2: { fontSize: 18, lineHeight: 24, fontFamily: fonts.sansExtraBold, color: colors.textPrimary },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.sans, color: colors.textPrimary },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fonts.sans, color: colors.textMuted },
  label: {
    fontSize: 11, lineHeight: 14, fontFamily: fonts.sansExtraBold, color: colors.textLabel,
    letterSpacing: 1.9, textTransform: 'uppercase',
  },
});

/**
 * Drop-in replacement for React Native's <Text> — same props, plus `variant`. Renders at a fixed
 * pixel size/line-height per variant, picked from PHONE_TYPE or TABLET_TYPE by useBreakpoint().
 * Anything passed via `style` is applied after the variant style, so overriding one field (e.g. a
 * one-off color) on a specific instance still works exactly like it would on a plain <Text>.
 */
export const AppText = forwardRef<Text, AppTextProps>(function AppText(
  { variant = 'body', style, ...rest },
  ref
) {
  const { isTablet } = useBreakpoint();
  const variantStyle: TextStyle = (isTablet ? TABLET_TYPE : PHONE_TYPE)[variant];

  return <Text ref={ref} {...rest} style={[variantStyle, style]} />;
});
