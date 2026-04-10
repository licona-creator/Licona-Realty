import { Tabs } from 'expo-router';
import { useColorScheme, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  CalendarDays,
  Users,
  Briefcase,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { colors, typography } from '@/src/theme/tokens';

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.tabActive,
        tabBarInactiveTintColor: themeColors.tabInactive,
        tabBarLabelStyle: {
          fontFamily: typography.families.nav,
          fontSize: 10,
        },
        tabBarStyle: {
          backgroundColor: isDark ? 'transparent' : themeColors.tabBarBackground,
          borderTopColor: themeColors.tabBarBorder,
          borderTopWidth: 0.5,
          position: isDark ? 'absolute' : 'relative',
          ...Platform.select({
            ios: {
              paddingTop: 8,
            },
          }),
        },
        tabBarBackground: isDark
          ? () => (
              <BlurView
                intensity={80}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        tabBarItemStyle: {
          minHeight: 44,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ color }) => <Briefcase size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <MapPin size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
