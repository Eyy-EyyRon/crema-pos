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

// Split (menu + order dock) is useful on a landscape phone or a small tablet as soon as there is
// room for both panes — lower than TABLET_MIN_HEIGHT so a 390px-tall landscape phone still gets
// the two-pane POS, without pretending it's a tablet for type sizes.
export const SPLIT_MIN_WIDTH = 700;
export const SPLIT_MIN_HEIGHT = 380;

export const DOCK_MIN_WIDTH = 300;
export const DOCK_MAX_WIDTH = 460;

export interface Breakpoint {
  width: number;
  height: number;
  /** True only when both the width breakpoint AND the height floor are cleared. */
  isTablet: boolean;
  isLandscape: boolean;
  /** Two-pane POS (menu + dock). True on tablets and on wide landscape phones. */
  isSplit: boolean;
  /** Short viewport (phone landscape, split-screen) — tighten vertical chrome. */
  isCompact: boolean;
  bp: BreakpointKey;
  /** Horizontal page padding that steps up with width. */
  gutter: number;
  /** Order-dock width as a fraction of the window, clamped. */
  dockWidth: number;
}

function resolveBp(width: number): BreakpointKey {
  if (width >= breakpoints.tabletLarge) return 'tabletLarge';
  if (width >= breakpoints.tablet) return 'tablet';
  if (width >= breakpoints.phoneLarge) return 'phoneLarge';
  return 'phone';
}

export function gutterFor(width: number): number {
  if (width >= breakpoints.tabletLarge) return 28;
  if (width >= breakpoints.tablet) return 24;
  if (width >= breakpoints.phoneLarge) return 20;
  return 16;
}

export function dockWidthFor(width: number): number {
  const ideal = Math.round(width * 0.36);
  const cap = Math.min(DOCK_MAX_WIDTH, Math.round(width * 0.46));
  return Math.min(Math.max(ideal, DOCK_MIN_WIDTH), cap);
}

/** Key size/gap for the 3×4 PIN grid so it stays inside the live window width. */
export function pinPadMetrics(width: number, horizontalPad = 56): { keySize: number; gap: number } {
  const gap = width < 360 ? 7 : width < 480 ? 9 : 12;
  const usable = Math.max(120, Math.min(width, 440) - horizontalPad);
  const keySize = Math.min(56, Math.max(38, Math.floor((usable - gap * 2) / 3)));
  return { keySize, gap };
}

export function resolveLayout(width: number, height: number): Breakpoint {
  return {
    width,
    height,
    isTablet: width >= breakpoints.tablet && height >= TABLET_MIN_HEIGHT,
    isLandscape: width > height,
    isSplit: width >= SPLIT_MIN_WIDTH && height >= SPLIT_MIN_HEIGHT,
    isCompact: height < TABLET_MIN_HEIGHT,
    bp: resolveBp(width),
    gutter: gutterFor(width),
    dockWidth: dockWidthFor(width),
  };
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();
  return resolveLayout(width, height);
}
