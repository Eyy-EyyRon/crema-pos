export const colors = {
  canvasBg: '#070d14',
  screenBg: '#0A121A',
  cardBg: '#0D1825',
  chipBg: '#111D2B',
  dockBg: '#0B141E',

  gold: '#B8935A',
  goldLight: '#D4AE78',
  goldBrightText: '#F5EFE4',

  borderGold12: 'rgba(184,147,90,0.12)',
  borderGold14: 'rgba(184,147,90,0.14)',
  borderGold18: 'rgba(184,147,90,0.18)',
  borderGold20: 'rgba(184,147,90,0.2)',
  borderGold25: 'rgba(184,147,90,0.25)',

  textPrimary: '#F0EDE8',
  textSecondary: '#B0BFD0',
  textMuted: '#8A9BB0',
  textLabel: '#4A6080',

  success: '#4DC882',
  successBg: 'rgba(26,122,74,0.14)',
  successBorder: 'rgba(77,200,130,0.4)',
  successBorder35: 'rgba(77,200,130,0.35)',
  successBg16: 'rgba(26,122,74,0.16)',

  danger: '#FF6B7A',

  divider: 'rgba(36,51,80,0.7)',

  heatHighBorder: 'rgba(139,32,32,0.55)',
  heatHighBg: 'rgba(139,32,32,0.14)',
  heatHighText: '#E05050',
  heatMedBorder: 'rgba(176,122,32,0.5)',
  heatMedBg: 'rgba(176,122,32,0.14)',
  heatMedText: '#F0B040',

  overlay: 'rgba(4,8,14,0.72)',
  overlayStrong: 'rgba(4,8,14,0.8)',

  // Aliases so components ported from CafePOS (PinPad, VoidModal) can use
  // their original token names without per-line rewrites — same colors,
  // just spelled differently in that codebase.
  text: '#F0EDE8',
  textDim: '#4A6080',
  errorLt: '#FF6B7A',
  successLt: '#4DC882',
  glassBorder: 'rgba(255,255,255,0.08)',
  biometricLt: '#5AC8FA',
};

export const catColors: Record<string, string> = {
  Coffee: '#3A6B8A',
  'Ice Cream': '#7A5030',
  'Cold Drinks': '#2C3E5C',
  Bakery: '#6B3A5C',
};

export const fonts = {
  serif: 'CormorantGaramond_600SemiBold',
  serifBold: 'CormorantGaramond_700Bold',
  serifMedium: 'CormorantGaramond_500Medium',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  sansExtraBold: 'DMSans_800ExtraBold',
};

export const TABLET_BREAKPOINT = 768;
