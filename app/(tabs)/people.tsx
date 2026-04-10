import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';
import { colors, typography, spacing } from '@/src/theme/tokens';

export default function PeopleScreen() {
  const { colors: themeColors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        <Users size={48} color={colors.gold} />
        <Text style={[styles.title, { color: themeColors.text }]}>People</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
  },
  subtitle: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
  },
});
