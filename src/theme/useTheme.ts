import { useColorScheme } from 'react-native';
import { colors, typography, spacing, radius, shadows } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  return {
    colors: { ...themeColors, navy: colors.navy, gold: colors.gold },
    typography,
    spacing,
    radius,
    shadows: isDark ? {} as typeof shadows : shadows,
    isDark,
  };
}

export type Theme = ReturnType<typeof useTheme>;
