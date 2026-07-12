import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
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
WebBrowser.maybeCompleteAuthSession();

async function handleAuthDeepLink(url: string) {
  if (!url) return;
  // PKCE code exchange
  const queryStr = url.split('?')[1]?.split('#')[0] ?? '';
  const code = new URLSearchParams(queryStr).get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }
  // Implicit / recovery tokens in fragment
  const hashStr = url.split('#')[1] ?? '';
  const hash = new URLSearchParams(hashStr);
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

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

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleAuthDeepLink(url));
    Linking.getInitialURL().then((url) => { if (url) handleAuthDeepLink(url); });
    return () => sub.remove();
  }, []);

  if (!soraLoaded || !monoLoaded) return <View style={styles.root} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppProvider>
        <View style={styles.root}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" />
            <Stack.Screen name="auth" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="transaction" />
            <Stack.Screen name="transactions" />
            <Stack.Screen name="bilan" />
            <Stack.Screen name="export" />
          </Stack>
        </View>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
