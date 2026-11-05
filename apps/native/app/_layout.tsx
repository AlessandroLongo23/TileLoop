import { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { installNativePlatform } from '../src/platform/nativePlatform';
import { initAudio, syncMusic } from '../src/feedback';
import { homePalette, usePalette } from '../src/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const home = usePalette(homePalette);

  useEffect(() => {
    void installNativePlatform()
      .then(initAudio)
      .then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== 'web') return syncMusic();
    // browsers allow sound only after a gesture
    const start = () => {
      syncMusic();
      window.removeEventListener('pointerdown', start);
    };
    window.addEventListener('pointerdown', start);
    return () => window.removeEventListener('pointerdown', start);
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: home.bg }} />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 220, contentStyle: { backgroundColor: home.bg } }}>
      <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
