import { useWindowDimensions } from 'react-native';

export const breakpoints = {
  phone: 0,
  phoneLarge: 480,
  tablet: 768,
  tabletLarge: 1024,
} as const;

export type BreakpointKey = keyof typeof breakpoints;

// A phone rotated to landscape can exceed `breakpoints.tablet` on width alone while only being
// ~330-430px tall — that's not a tablet, it's a phone lying sideways. A real tablet or an
// unfolded foldable clears this height in any orientation, so pairing the width check with a
// height floor is what actually distinguishes the two, not width alone.
export const TABLET_MIN_HEIGHT = 500;

export interface Breakpoint {
  width: number;
  height: number;
  /** True only when both the width breakpoint AND the height floor are cleared. */
  isTablet: boolean;
  isLandscape: boolean;
  bp: BreakpointKey;
}

function resolveBp(width: number): BreakpointKey {
  if (width >= breakpoints.tabletLarge) return 'tabletLarge';
  if (width >= breakpoints.tablet) return 'tablet';
  if (width >= breakpoints.phoneLarge) return 'phoneLarge';
  return 'phone';
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= breakpoints.tablet && height >= TABLET_MIN_HEIGHT,
    isLandscape: width > height,
    bp: resolveBp(width),
  };
}
