import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Lock } from 'lucide-react-native';
import { chapters, chapterDone, chapterUnlocked, levelRecord, levelUnlocked, nextCampaignLevel, levelsIn, LAB_LEVELS, labLevel, type Chapter } from '@tileloop/core';
import { IconButton, Press, Pulse } from '../src/components/ui';
import { useProgress } from '../src/hooks/stores';
import { alpha, homePalette, isLight, mix, type, useNight, usePalette } from '../src/theme';

// `npm run start:all` sets this, so every level can be opened for testing
const UNLOCK_ALL = process.env.EXPO_PUBLIC_UNLOCK_ALL === '1';

function World({ ch, index }: { ch: Chapter; index: number }) {
  const router = useRouter();
  const progress = useProgress();
  const { width } = useWindowDimensions();
  const open = UNLOCK_ALL || chapterUnlocked(progress, ch.id);
  const done = chapterDone(progress, ch.id);
  const here = nextCampaignLevel(progress);
  const pal = usePalette(ch.palette);
  const ink = pal.line;
  const inner = Math.min(width, 560) - 32 - 32;
  const dot = Math.floor((inner - 4 * 12) / 5);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(400)} style={[s.world, { backgroundColor: pal.bg }]}>
      <View style={s.head}>
        <Text style={[type.heading, { color: ink }]}>{ch.title}</Text>
        <Text style={[type.label, { color: alpha(ink, 0.55) }]}>{open ? `${done}/${levelsIn(ch.id)}` : ''}</Text>
      </View>
      {open ? (
        <View style={s.grid}>
          {Array.from({ length: levelsIn(ch.id) }, (_, i) => {
            const level = i + 1;
            const unlocked = UNLOCK_ALL || levelUnlocked(progress, ch.id, level);
            const rec = levelRecord(progress, ch.id, level);
            const current = here.chapter === ch.id && here.level === level;
            // a solved cell is pastel day or night, so its number keeps the dark ink
            const bg = rec ? pal.fills[i % pal.fills.length] : current ? ink : alpha(ink, 0.06);
            const fg = rec ? ch.palette.line : current ? pal.bg : alpha(ink, unlocked ? 0.7 : 0.25);
            return (
              <Pulse key={level} on={current}>
                <Press
                  disabled={!unlocked}
                  onPress={() => router.push({ pathname: '/play', params: { mode: 'campaign', chapter: ch.id, level } })}
                  testID={`level-${ch.id}-${level}`}
                  label={`Level ${level}`}
                  style={[s.cell, { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: bg }]}
                >
                  <Text style={[type.heading, { fontSize: 17, color: fg }]}>{level}</Text>
                </Press>
              </Pulse>
            );
          })}
        </View>
      ) : (
        <View style={s.locked}>
          <Lock color={alpha(ink, 0.4)} size={16} strokeWidth={2.2} />
          <Text style={[type.label, { color: alpha(ink, 0.45) }]}>Finish 10 levels of {chapters[index - 1].title}</Text>
        </View>
      )}
    </Animated.View>
  );
}

/** Test boards on Atlas tilings (stars, isotoxal tiles). Only in `start:all`. */
function Lab() {
  const router = useRouter();
  const pal = usePalette(chapters[3].palette);
  return (
    <View style={[s.world, { backgroundColor: pal.bg }]}>
      <View style={s.head}>
        <Text style={[type.heading, { color: pal.line }]}>Lab</Text>
      </View>
      <View style={[s.grid, { gap: 8 }]}>
        {Array.from({ length: LAB_LEVELS }, (_, i) => (
          <Press
            key={i}
            onPress={() => router.push({ pathname: '/play', params: { mode: 'lab', level: i + 1 } })}
            testID={`lab-${i + 1}`}
            label={labLevel(i + 1).name}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: alpha(pal.line, 0.07) }}
          >
            <Text style={[type.label, { color: pal.line }]}>
              {i + 1} · {labLevel(i + 1).name}
            </Text>
          </Press>
        ))}
      </View>
    </View>
  );
}

export default function Levels() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const home = usePalette(homePalette);
  const ink = home.line;
  // a neutral surround, a shade darker than the worlds at night so they stand out
  const page = useNight() ? mix(home.bg, '#000000', 0.35) : '#FAF8F5';
  return (
    <View style={{ flex: 1, backgroundColor: page }}>
      <StatusBar style={isLight(page) ? 'dark' : 'light'} />
      <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
        <IconButton onPress={() => router.back()} tint={ink} label="Back" testID="back">
          <ChevronLeft color={ink} size={24} strokeWidth={2.4} />
        </IconButton>
        <Text style={[type.heading, { color: ink }]}>Levels</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12, alignSelf: 'center', width: '100%', maxWidth: 560 }}>
        {chapters.map((ch, i) => (
          <World key={ch.id} ch={ch} index={i} />
        ))}
        {UNLOCK_ALL && <Lab />}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  world: { borderRadius: 26, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4, paddingHorizontal: 2 },
});
