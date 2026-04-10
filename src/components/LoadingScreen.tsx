import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';
import { colors } from '@/src/theme/tokens';

export function LoadingScreen() {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
