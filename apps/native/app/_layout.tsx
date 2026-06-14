import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { installNativePlatform } from '../src/platform/nativePlatform';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    installNativePlatform().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-900">
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#18181b' },
      }}
    />
  );
}
