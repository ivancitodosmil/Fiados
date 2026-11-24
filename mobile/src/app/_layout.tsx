import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfigScreen } from '@/components/config-screen';
import { NegocioError } from '@/components/negocio-error';
import { SessionProvider, useSession } from '@/lib/session';
import { isConfigured } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_500Medium,
    Poppins_600SemiBold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady && !isConfigured) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {isConfigured ? (
        <SessionProvider>
          <ToastProvider>
            <RootStack />
          </ToastProvider>
        </SessionProvider>
      ) : (
        <ConfigScreen />
      )}
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { ready, session, negocio } = useSession();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: C.blanco }} />;
  if (session && !negocio) return <NegocioError />;

  const authed = !!session && !!negocio;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.blanco } }}>
      <Stack.Protected guard={authed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cliente/nuevo" />
        <Stack.Screen name="cliente/[id]/index" />
        <Stack.Screen name="cliente/[id]/editar" />
        <Stack.Screen name="cliente/[id]/qr" options={{ presentation: 'modal' }} />
        <Stack.Screen name="fiado/nuevo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="pago/nuevo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="apartado" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!authed}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
