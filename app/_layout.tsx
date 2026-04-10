import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import {
  checkFaceIdAvailable,
  authenticateWithFaceId,
  getFaceIdPreference,
} from '@/src/lib/auth';
import { LoadingScreen } from '@/src/components/LoadingScreen';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [faceIdChecked, setFaceIdChecked] = useState(false);
  const [faceIdPassed, setFaceIdPassed] = useState(false);

  useEffect(() => {
    async function checkFaceId() {
      if (!session) {
        setFaceIdChecked(true);
        setFaceIdPassed(true);
        return;
      }

      const faceIdEnabled = await getFaceIdPreference();
      const faceIdAvailable = await checkFaceIdAvailable();

      if (faceIdEnabled && faceIdAvailable) {
        const success = await authenticateWithFaceId();
        setFaceIdPassed(success);
        if (!success) {
          useAuthStore.getState().setSession(null);
        }
      } else {
        setFaceIdPassed(true);
      }
      setFaceIdChecked(true);
    }

    if (!isLoading) {
      checkFaceId();
    }
  }, [session, isLoading]);

  useEffect(() => {
    if (isLoading || !faceIdChecked) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && faceIdPassed && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, faceIdChecked, faceIdPassed, segments]);

  if (isLoading || !faceIdChecked) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { setSession, setLoading } = useAuthStore();

  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGate>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </QueryClientProvider>
  );
}
