import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { settingsStore, progressStore, type Settings } from '@tileloop/core';
import { IconButton, Press, Toggle } from '../src/components/ui';
import { useSettings } from '../src/hooks/stores';
import { alpha, homePalette, isLight, type, usePalette } from '../src/theme';
import { syncMusic } from '../src/feedback';

const THEMES = [
  ['system', 'System'],
  ['day', 'Day'],
  ['night', 'Night'],
] as const;
const SEG = 66;

/** Day, night or the phone's own: three choices, a pill sliding to the one picked. */
function ThemeChoice({ value, onChange, color, bg }: { value: Settings['theme']; onChange: (v: NonNullable<Settings['theme']>) => void; color: string; bg: string }) {
  const i = Math.max(0, THEMES.findIndex(([v]) => v === (value ?? 'system')));
  const x = useSharedValue(i);
  useEffect(() => {
    x.value = withTiming(i, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [i, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * SEG }] }));
  return (
    <View style={s.row}>
      <Text style={[type.heading, { fontSize: 18, color }]}>Theme</Text>
      <View style={[s.track, { backgroundColor: alpha(color, 0.08) }]}>
        <Animated.View style={[s.pill, { backgroundColor: color }, pill]} />
        {THEMES.map(([v, name], k) => (
          <Press key={v} onPress={() => onChange(v)} testID={`theme-${v}`} label={name} style={s.seg}>
            <Text style={[type.label, { color: k === i ? bg : alpha(color, 0.7) }]}>{name}</Text>
          </Press>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [confirm, setConfirm] = useState(false);
  const pal = usePalette(homePalette);
  const ink = pal.line;
  const set = (patch: Partial<typeof settings>) => {
    settingsStore.getState().set({ ...settingsStore.getState().value, ...patch });
    syncMusic();
  };

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg, paddingTop: insets.top + 6, paddingHorizontal: 22 }}>
      <StatusBar style={isLight(pal.bg) ? 'dark' : 'light'} />
      <View style={s.bar}>
        <Text style={[type.heading, { color: ink, fontSize: 28 }]}>Settings</Text>
        <IconButton onPress={() => router.back()} tint={ink} label="Close" testID="close">
          <X color={ink} size={22} strokeWidth={2.4} />
        </IconButton>
      </View>
      <Toggle label="Sound" value={settings.sound} onChange={(v) => set({ sound: v })} color={ink} back={pal.bg} testID="toggle-sound" />
      <Toggle label="Music" value={settings.music} onChange={(v) => set({ music: v })} color={ink} back={pal.bg} testID="toggle-music" />
      <Toggle label="Vibration" value={settings.haptics} onChange={(v) => set({ haptics: v })} color={ink} back={pal.bg} testID="toggle-haptics" />
      <ThemeChoice value={settings.theme} onChange={(v) => set({ theme: v })} color={ink} bg={pal.bg} />
      <Press
        testID="reset"
        label="Reset progress"
        outer={{ marginTop: 28, alignSelf: 'flex-start' }}
        onPress={() => {
          if (!confirm) return setConfirm(true);
          progressStore.getState().set({ campaign: {}, daily: { streak: 0, last: null, done: [] }, endless: { level: 1 }, seenIntros: [] });
          setConfirm(false);
        }}
      >
        <Text style={[type.label, { color: '#C0392B', fontSize: 15 }]}>{confirm ? 'Tap again to erase everything' : 'Reset progress'}</Text>
      </Press>
      <Text style={[type.small, { color: alpha(ink, 0.4), position: 'absolute', left: 22, bottom: insets.bottom + 20 }]}>Sounds by Kenney (CC0)</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  track: { flexDirection: 'row', borderRadius: 16, padding: 3 },
  pill: { position: 'absolute', left: 3, top: 3, width: SEG, height: 28, borderRadius: 14 },
  seg: { width: SEG, height: 28, alignItems: 'center', justifyContent: 'center' },
});
