import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
  useFonts as useSoraFonts,
} from '@expo-google-fonts/sora';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
  useFonts as useMonoFonts,
} from '@expo-google-fonts/space-mono';

import { AppProvider } from '@/context/AppContext';
import { C } from '@/constants/colors';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [soraLoaded] = useSoraFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
  const [monoLoaded] = useMonoFonts({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (soraLoaded && monoLoaded) {
      SplashScreen.hideAsync();
    }
  }, [soraLoaded, monoLoaded]);

  if (!soraLoaded || !monoLoaded) return null;

  return (
    <AppProvider>
      <View style={styles.root}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
