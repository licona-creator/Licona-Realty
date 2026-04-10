import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { typography } from '@/src/theme/tokens';

type Variant = 'heading' | 'body' | 'caption' | 'label';

interface ThemedTextProps extends TextProps {
  variant?: Variant;
}

const variantStyles: Record<Variant, { fontFamily: string; fontSize: number; colorKey: 'text' | 'textSecondary' | 'textTertiary' }> = {
  heading: {
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
    colorKey: 'text',
  },
  body: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    colorKey: 'text',
  },
  caption: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    colorKey: 'textSecondary',
  },
  label: {
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    colorKey: 'textSecondary',
  },
};

export function ThemedText({ variant = 'body', style, ...props }: ThemedTextProps) {
  const { colors } = useTheme();
  const config = variantStyles[variant];

  return (
    <Text
      style={[
        {
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          color: colors[config.colorKey],
        },
        style,
      ]}
      {...props}
    />
  );
}
