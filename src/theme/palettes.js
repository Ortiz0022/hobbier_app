import { colors as lightColors, card, input, sectionTitle, primaryButton, primaryButtonText } from './index';
import { TOKENS } from './designTokens';

export const darkPalette = Object.freeze({
  background: '#000000',
  secondary: '#18191C',
  card: '#222428',
  selected: '#303033',
  border: '#353535',
  text: '#F5F5F5',
  muted: '#A5A7AB',
  primary: '#35B5CB',
  accent: '#FF901C',
  onAccent: '#000000',
  inverse: '#F5F5F5',
  scrim: 'rgba(0, 0, 0, 0.7)',
  // Status colors retain their meaning with legible foregrounds on charcoal.
  danger: '#FF9696',
  dangerSurface: '#222428',
  success: '#85D6A6',
});

const darkColors = {
  ...lightColors,
  background: darkPalette.background,
  surface: darkPalette.card,
  surfaceMuted: darkPalette.selected,
  surfaceAccent: darkPalette.secondary,
  primary: darkPalette.primary,
  primaryDark: darkPalette.text,
  primarySoft: darkPalette.selected,
  accent: darkPalette.accent,
  accentSoft: darkPalette.accent,
  accentDark: darkPalette.accent,
  text: darkPalette.text,
  textMuted: darkPalette.muted,
  textFaint: darkPalette.muted,
  onPrimary: darkPalette.onAccent,
  danger: darkPalette.danger,
  dangerSoft: darkPalette.dangerSurface,
  success: darkPalette.success,
};
const darkTokenColors = {
  ...TOKENS.colors,
  primary: darkPalette.accent,
  active: darkPalette.primary,
  activeText: darkPalette.onAccent,
  inactiveBg: darkPalette.secondary,
  inactiveBorder: darkPalette.border,
  inactiveText: darkPalette.muted,
  textDark: darkPalette.text,
  textMuted: darkPalette.muted,
  white: darkPalette.text,
  segmentTrack: darkPalette.secondary,
  badgeInfoBg: darkPalette.selected,
  badgeInfoText: darkPalette.primary,
  badgeBg: darkPalette.selected,
  destructive: darkPalette.danger,
  badgePointsBg: darkPalette.selected,
  badgePointsText: darkPalette.accent,
  alertBg: darkPalette.dangerSurface,
  alertBorder: darkPalette.border,
  alertText: darkPalette.danger,
  danger: darkPalette.danger,
};
const darkTokens = {
  ...TOKENS,
  colors: darkTokenColors,
  iconTints: TOKENS.iconTints.map((_, index) => ({
    bg: darkPalette.selected,
    fg: index === 1 ? darkPalette.primary : darkPalette.accent,
  })),
};

const makeTheme = (mode) => {
  const isDark = mode === 'dark';
  const colors = isDark ? darkColors : lightColors;
  return Object.freeze({
    mode, isDark, palette: darkPalette, colors,
    TOKENS: isDark ? darkTokens : TOKENS,
    textInputProps: isDark ? {
      keyboardAppearance: 'dark',
      selectionColor: darkPalette.primary,
      placeholderTextColor: darkPalette.muted,
    } : {},
    // In light mode return exactly the existing values, including alpha colors.
    color: (original, role) => isDark ? darkPalette[role] : original,
    card: isDark ? { ...card, backgroundColor: colors.surface, borderColor: darkPalette.border } : card,
    input: isDark ? { ...input, backgroundColor: darkPalette.secondary, borderColor: darkPalette.border } : input,
    sectionTitle: isDark ? { ...sectionTitle, color: colors.text } : sectionTitle,
    primaryButton: isDark ? { ...primaryButton, backgroundColor: colors.primary } : primaryButton,
    primaryButtonText: isDark ? { ...primaryButtonText, color: colors.onPrimary } : primaryButtonText,
  });
};
export const themes = Object.freeze({ light: makeTheme('light'), dark: makeTheme('dark') });
