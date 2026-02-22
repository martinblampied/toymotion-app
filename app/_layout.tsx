import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Nunito_800ExtraBold, Nunito_900Black } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="camera" />
        <Stack.Screen name="playback" />
      </Stack>
    </>
  );
}
