/** Paleta y tokens visuales. Hay dos paletas (oscura/clara); el tema activo lo da useTheme. */

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  primaryDark: string;
  text: string;
  textMuted: string;
  danger: string;
  warning: string;
  accent: string;
};

export const darkColors: Palette = {
  bg: '#0B1120',
  surface: '#111A2E',
  surfaceAlt: '#1B2740',
  border: '#243049',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  danger: '#F87171',
  warning: '#FBBF24',
  accent: '#38BDF8',
};

export const lightColors: Palette = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEFF7',
  border: '#D6DEEB',
  primary: '#16A34A',
  primaryDark: '#15803D',
  text: '#0F172A',
  textMuted: '#566174',
  danger: '#DC2626',
  warning: '#B45309',
  accent: '#0284C7',
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
