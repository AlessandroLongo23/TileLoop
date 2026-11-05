import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { Play, LayoutGrid, CalendarDays, Infinity as InfinityIcon, Settings, Check } from 'lucide-react-native';
import { buildPuzzle, nextCampaignLevel, chapters, chapterRules, todayKey, currentStreak, mulberry32, type Puzzle } from '@tileloop/core';
import { BoardPicture } from '../src/components/Board';
import { Press, Pulse } from '../src/components/ui';
import { useProgress } from '../src/hooks/stores';
import { alpha, homePalette, isLight, type, usePalette } from '../src/theme';

function Shortcut({ icon, label, onPress, color, testID }: { icon: React.ReactNode; label: string; onPress: () => void; color: string; testID: string }) {
  return (
    <Press onPress={onPress} testID={testID} label={label} style={{ alignItems: 'center', gap: 6, minWidth: 64 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(color, 0.08) }}>{icon}</View>
      <Text style={[type.small, { color: alpha(color, 0.7) }]}>{label}</Text>
    </Press>
  );
}

// A new mosaic every launch: any campaign tiling but the duals (they take most of a second to
// build), a fresh board, and an edge somewhere between a slow wave and a crumbled one. Its colours
// are `homePalette`, drawn per launch too.
const homeRules = [...new Set(chapters.flatMap((c) => chapterRules(c)))].filter((r) => !r.endsWith('*'));
const wave = 0.5 + 2.5 * Math.random();
const look = {
  first: Math.floor(Math.random() * homeRules.length),
  level: String(1 + Math.floor(Math.random() * 10)),
  seed: Math.floor(Math.random() * 2 ** 31),
  wave,
  jitter: Math.max(0.5, 3.5 - wave) * (0.5 + 0.5 * Math.random()),
};

/**
 * The launch's board, `count` tiles over a `w` x `h` box, tiles near `edge` pixels. Tilings differ
 * in tile size, so a board whose edges land outside 0.75..1.5 `edge` is built again at the count
 * that brings them in; one that comes out a strip (some rules grow one way) gives way to the next
 * tiling. Returns the board and its pixels per board unit (BoardPicture's cover scale).
 */
function launchBoard(w: number, h: number, count: number, edge: number): { p: Puzzle; s: number } {
  const build = (rule: string, tiles: number) => {
    const p = buildPuzzle({ rule, tiles, aspect: h / w }, look.seed);
    const [bw, bh] = [p.bounds.maxX - p.bounds.minX, p.bounds.maxY - p.bounds.minY];
    return { p, s: Math.max(w / bw, h / bh), shape: bh / bw / (h / w) };
  };
  for (let k = 0; ; k++) {
    const rule = homeRules[(look.first + k) % homeRules.length].replace('{n}', look.level);
    let b = build(rule, count);
    const fit = Math.min(1.5 * edge, Math.max(0.75 * edge, b.s));
    if (fit !== b.s) b = build(rule, Math.round(count * (b.s / fit) ** 2));
    if ((b.shape > 0.75 && b.shape < 1.4) || k === homeRules.length - 1) return b;
  }
}

/**
 * The board cut along an uneven line of whole tiles. A tile stays when its top sits below `top`
 * (board units) plus a dip: a slow wave along x, up to `wave` edges deep, and a jump of up to
 * `jitter` edges of its own. Tiles cut off from the body go, gaps shut in by tiles fill, and lines
 * that ran into a removed tile are dropped. Bounds stay those of the whole board, so it lines up.
 */
function raggedTop(p: Puzzle, top: number, seed: number, { wave, jitter }: { wave: number; jitter: number }): Puzzle {
  const rng = mulberry32(seed * 977 + 13);
  const [a, b] = [rng.next() * 7, rng.next() * 7];
  const tops = p.tiles.map((t) => Math.min(...t.verts.map((v) => v.y)));
  const line = p.tiles.map((t) => {
    const w = (Math.sin(t.x * 0.9 + a) + 0.6 * Math.sin(t.x * 0.37 + b)) / 3.2 + 0.5;
    return top + wave * w + jitter * rng.next();
  });
  const flood = (seeds: boolean[], pass: (i: number) => boolean) => {
    const seen = seeds.map((s, i) => s && pass(i));
    const stack = seen.flatMap((s, i) => (s ? [i] : []));
    while (stack.length)
      for (const nb of p.tiles[stack.pop()!].neighbors)
        if (nb && !seen[nb.tile] && pass(nb.tile)) {
          seen[nb.tile] = true;
          stack.push(nb.tile);
        }
    return seen;
  };
  const deep = top + wave + jitter;
  const body = flood(tops.map((y) => y > deep), (i) => tops[i] > line[i]);
  const sky = flood(tops.map((y) => y < top), (i) => !body[i]);
  const kept = p.tiles.filter((t) => !sky[t.id]);
  const id = new Map(kept.map((t, i) => [t.id, i]));
  return {
    ...p,
    tiles: kept.map((t, i) => {
      const neighbors = t.neighbors.map((nb) => (nb && id.has(nb.tile) ? { tile: id.get(nb.tile)!, edge: nb.edge } : null));
      return { ...t, id: i, neighbors, conns: t.conns.map((v, e) => (neighbors[e] ? v : 0)) };
    }),
  };
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const progress = useProgress();
  const next = nextCampaignLevel(progress);
  const ch = chapters[next.chapter - 1];
  const pal = usePalette(homePalette);
  const ink = pal.line;
  const today = todayKey();
  const dailyDone = progress.daily.done.includes(today);
  const streak = currentStreak(progress, today);

  // a solved world drifting slowly under everything (`look`). It fills the lower half of the
  // screen: an ellipse of tiles shaped like that band, scaled up so its sides never show. Its top
  // is whole tiles at uneven heights (`raggedTop`).
  const bandTop = Math.round(height * 0.5);
  const band = height - bandTop;
  const artW = width * 1.6;
  const artH = band * 1.7;
  const edge = Math.min(64, Math.max(40, Math.min(width, height) / 8));
  const count = Math.round(Math.min(700, Math.max(90, (0.8 * artW * artH) / (edge * edge * 1.3))));
  const sizeClass = Math.round(count / 40);
  const mosaic = useMemo(
    () => {
      // the board's centre sits at the band's, so the band's top is band/2 above it (in pixels).
      // No tile rises more than 0.3 edges past that.
      const { p, s } = launchBoard(artW, artH, count, edge);
      return raggedTop(p, -band / 2 / s - 0.3, look.seed, look);
    },
    // rebuild only when the size class changes, not on every pixel of a window resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sizeClass],
  );
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 90000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [drift]);
  const driftStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${drift.value * 14 - 7}deg` }, { translateX: drift.value * 30 - 15 }] }));

  const play = () => router.push({ pathname: '/play', params: { mode: 'campaign', chapter: next.chapter, level: next.level } });

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <StatusBar style={isLight(pal.bg) ? 'dark' : 'light'} />
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', pointerEvents: 'none' }]}>
        <Animated.View style={[{ position: 'absolute', width: artW, height: artH, left: (width - artW) / 2, top: bandTop + (band - artH) / 2 }, driftStyle]}>
          <BoardPicture puzzle={mosaic} palette={pal} width={artW} height={artH} cover />
        </Animated.View>
      </View>

      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, alignItems: 'flex-end' }}>
        <Press onPress={() => router.push('/settings')} testID="settings" label="Settings" style={{ padding: 10 }}>
          <Settings color={alpha(ink, 0.6)} size={22} strokeWidth={2.2} />
        </Press>
      </View>

      <Animated.View entering={FadeInDown.duration(600)} style={[s.hero, { top: height * 0.13 }]}>
        <Text style={[type.title, { color: ink, fontSize: Math.min(84, width * 0.22) }]}>loop</Text>
        <Pulse on style={{ marginTop: height * 0.05 }}>
          <Press onPress={play} testID="play" label="Play">
            <View style={[s.play, { backgroundColor: ink }]}>
              <Play color={pal.bg} fill={pal.bg} size={32} style={{ marginLeft: 5 }} />
            </View>
          </Press>
        </Pulse>
        <Text style={[type.label, { color: alpha(ink, 0.6), marginTop: 16 }]}>
          {ch.title} · {next.level}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(250).duration(500)} style={[s.row, { bottom: insets.bottom + 20, backgroundColor: pal.bg, shadowColor: isLight(pal.bg) ? ink : '#000' }]}>
        <Shortcut testID="chapters" label="Levels" color={ink} onPress={() => router.push('/map')} icon={<LayoutGrid color={ink} size={21} strokeWidth={2.2} />} />
        <Shortcut
          testID="daily"
          label={dailyDone ? 'Done' : streak ? `${streak} days` : 'Daily'}
          color={ink}
          onPress={() => router.push({ pathname: '/play', params: { mode: 'daily', date: today } })}
          icon={dailyDone ? <Check color={ink} size={21} strokeWidth={2.4} /> : <CalendarDays color={ink} size={21} strokeWidth={2.2} />}
        />
        <Shortcut
          testID="endless"
          label="Endless"
          color={ink}
          onPress={() => router.push({ pathname: '/play', params: { mode: 'endless', level: progress.endless.level } })}
          icon={<InfinityIcon color={ink} size={22} strokeWidth={2.2} />}
        />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  play: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  row: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
