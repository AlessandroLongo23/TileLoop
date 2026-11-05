import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, runOnJS, interpolateColor } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { ChevronLeft, List } from 'lucide-react-native';
import {
  chapters,
  chapterUnlocked,
  levelRecord,
  levelUnlocked,
  nextCampaignLevel,
  sectionOpen,
  sectionStars,
  SECTION_GATE,
  SECTION_LEVELS,
  type Chapter,
  type Palette,
  type Progress,
} from '@tileloop/core';
import { IconButton } from '../src/components/ui';
import { useProgress } from '../src/hooks/stores';
import { LinearGradient } from 'expo-linear-gradient';
import { isLight, mix, themed, useNight } from '../src/theme';
import { lastPlayed } from '../src/journey';
import { playTap, haptic } from '../src/feedback';
import { rosette, BAND, type Rosette } from '../src/map/layout';
import { RosetteView, Bead, type ChapterState } from '../src/map/Rosette';

// `npm run start:all` opens every level
const UNLOCK_ALL = process.env.EXPO_PUBLIC_UNLOCK_ALL === '1';
const ZOOM = { duration: 480, easing: Easing.out(Easing.cubic) };
/** How far the camera goes into a bead. */
const DEPTH = 7;
/** A touch takes the nearest bead this close. */
const HIT = 22;

const solvedKeys = (p: Progress) => new Set(Object.keys(p.campaign));

function stateOf(p: Progress, chs: Chapter[], i: number, geo: Rosette[]): ChapterState {
  const ch = chs[i];
  const open = chapterUnlocked(p, ch.id);
  const prev = chs[i - 1];
  const nextOpen = i + 1 < chapters.length && chapterUnlocked(p, ch.id + 1);
  // a dotted line carries on the dashes of the one above it
  const phase = prev ? (geo[i - 1].bottom - geo[i - 1].exit) % 6 : 0;
  return {
    open,
    sections: ch.sections.map((_, k) => {
      const sOpen = sectionOpen(p, ch.id, k);
      return {
        open: sOpen,
        beads: Array.from({ length: SECTION_LEVELS }, (_, j) => {
          const level = k * SECTION_LEVELS + j + 1;
          const rec = levelRecord(p, ch.id, level);
          return { look: rec ? 'solved' : !sOpen ? 'shut' : levelUnlocked(p, ch.id, level) ? 'next' : 'later', dots: rec?.stars ?? 0 };
        }),
        need: !sOpen && k > 0 && sectionOpen(p, ch.id, k - 1) ? SECTION_GATE - sectionStars(p, ch.id, k - 1) : null,
      };
    }),
    need: !open && prev && chapterUnlocked(p, prev.id) ? SECTION_GATE - sectionStars(p, prev.id, prev.sections.length - 1) : null,
    enter: i === 0 ? 'start' : open ? 'solid' : 'dotted',
    leave: i + 1 < chapters.length ? (nextOpen ? 'solid' : 'dotted') : null,
    phase,
    fade: !open,
  };
}

/** A bead solved since the map was last seen: it fills in from the centre once the camera is back out. */
function Fresh({ delay, x, y, dots, pal, night }: { delay: number; x: number; y: number; dots: number; pal: Palette; night: boolean }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [delay, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.3 + 0.7 * o.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 10, top: y - 10, width: 20, height: 20 }, style]}>
      <Svg width={20} height={20} viewBox="-10 -10 20 20">
        <Bead p={{ x: 0, y: 0 }} look="solved" dots={dots} pal={pal} night={night} />
      </Svg>
    </Animated.View>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const progress = useProgress();
  const night = useNight();

  // every open chapter, and the first shut one peeking in below (in the colours of the one above)
  let lastOpen = 0;
  chapters.forEach((c, i) => chapterUnlocked(progress, c.id) && (lastOpen = i));
  const shown = chapters.slice(0, lastOpen + 2);
  const geo = useMemo(() => shown.map((ch) => rosette(ch, W)), [shown.length, W]); // eslint-disable-line react-hooks/exhaustive-deps
  const tops = useMemo(() => geo.reduce<number[]>((t, _, i) => [...t, i ? t[i - 1] + geo[i - 1].bottom - geo[i - 1].top : 0], []), [geo]);
  const own = useMemo(() => shown.map((ch) => themed(ch.palette, night)), [shown.length, night]); // eslint-disable-line react-hooks/exhaustive-deps
  const pals = own.map((p, i) => (i <= lastOpen ? p : own[lastOpen]));
  const states = useMemo(() => shown.map((_, i) => stateOf(progress, shown, i, geo)), [progress, geo]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => Object.values(progress.campaign).reduce((s, r) => s + r.stars, 0), [progress]);

  // Each chapter sits on its own colour, which turns into the next one's in the empty band between
  // them. The header takes the colour the map has right under it.
  const scrollY = useSharedValue(0);
  const [view, setView] = useState(0);
  const height = (i: number) => geo[i].bottom - geo[i].top;
  const stops = geo.flatMap((_, i) => [tops[i] + BAND, tops[i] + height(i) - BAND]);
  const bgs = pals.flatMap((p) => [p.bg, p.bg]);
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(scrollY.value, stops, bgs, 'RGB', { gamma: 1 }) }));
  const band = (i: number) => {
    const at = (j: number) => mix(pals[i].bg, pals[j].bg, 0.5);
    const h = height(i);
    return { colors: [i ? at(i - 1) : pals[i].bg, pals[i].bg, pals[i].bg, i + 1 < pals.length ? at(i + 1) : pals[i].bg] as const, locations: [0, BAND / h, 1 - BAND / h, 1] as const };
  };
  const pal = pals[view];
  const ink = pal.line;

  // The camera: z runs 0 (the map) to 1 (inside a bead). The bead moves to the middle of the screen
  // while the map grows round it; near the end the level's colour covers everything, and the level
  // opens on that same colour.
  const z = useSharedValue(0);
  const px = useSharedValue(W / 2);
  const py = useSharedValue(H / 2);
  const camera = useAnimatedStyle(() => {
    const k = Math.pow(DEPTH, z.value);
    return { transform: [{ translateX: -k * (px.value - W / 2) * z.value }, { translateY: -k * (py.value - H / 2) * z.value }, { scale: k }] };
  });
  const veilStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (z.value - 0.6) / 0.35)) }));
  const [veil, setVeil] = useState(pal.bg);

  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const frame = useRef<React.ComponentRef<typeof View>>(null);
  // Where the scroll view sits on screen, measured with the camera at rest (a measure taken while
  // zoomed in would include the zoom). Reused when coming back, while the camera is still inside a bead.
  const rest = useRef<{ x: number; y: number } | null>(null);
  /** Scroll offset that puts a chapter's medallion in the middle of the screen. */
  const mid = (i: number) => tops[i] - geo[i].top - (H - (rest.current?.y ?? 0)) / 2;
  const beadAt = (i: number, level: number) => geo[i].rings[Math.floor((level - 1) / SECTION_LEVELS)].beads[(level - 1) % SECTION_LEVELS];
  /** A bead's place in the scrolled content. */
  const inContent = (i: number, level: number) => {
    const b = beadAt(i, level);
    return { x: W / 2 + b.x, y: tops[i] - geo[i].top + b.y };
  };
  const aim = (i: number, level: number, then: () => void) => {
    const go = (o: { x: number; y: number }) => {
      const c = inContent(i, level);
      px.value = o.x + c.x;
      py.value = o.y + c.y - scrollY.value;
      then();
    };
    if (z.value > 0 && rest.current) return go(rest.current);
    frame.current?.measureInWindow((x, y) => {
      rest.current = { x, y };
      go(rest.current);
    });
  };

  const away = useRef<{ chapter: number; level: number; solved: Set<string> } | null>(null);
  const open = (chapter: number, level: number) => router.push({ pathname: '/play', params: { mode: 'campaign', chapter, level } });
  const enter = (i: number, level: number) => {
    const ch = shown[i];
    away.current = { chapter: ch.id, level, solved: solvedKeys(progress) };
    setVeil(own[i].bg);
    aim(i, level, () => {
      z.value = withTiming(1, ZOOM, (done) => {
        if (done) runOnJS(open)(ch.id, level);
      });
    });
  };

  function tapAt(i: number, e: GestureResponderEvent) {
    // the nearest bead to the touch, in the rosette's own coordinates (the web gives offsetX/Y)
    const n = e.nativeEvent as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
    const at = { x: (n.locationX ?? n.offsetX ?? 0) - W / 2, y: (n.locationY ?? n.offsetY ?? 0) + geo[i].top };
    let best = { d: HIT, level: 0 };
    geo[i].rings.forEach((ring, k) =>
      ring.beads.forEach((b, j) => {
        const d = Math.hypot(b.x - at.x, b.y - at.y);
        if (d < best.d) best = { d, level: k * SECTION_LEVELS + j + 1 };
      }),
    );
    if (!best.level) return;
    if (!UNLOCK_ALL && !levelUnlocked(progress, shown[i].id, best.level)) {
      haptic('soft');
      return;
    }
    playTap();
    haptic('tap');
    enter(i, best.level);
  }

  // open on the chapter you are playing
  const placed = useRef(false);
  const onContent = () => {
    if (placed.current) return;
    placed.current = true;
    const here = nextCampaignLevel(progress);
    const i = shown.findIndex((c) => c.id === here.chapter);
    if (i > 0) scroller.current?.scrollTo({ y: Math.max(0, mid(i)), animated: false });
  };
  const onScroll = (y: number) => {
    scrollY.value = y;
    // the header's colours: the chapter right under it
    const i = tops.findIndex((_, k) => k === tops.length - 1 || tops[k + 1] > y + BAND);
    if (i !== view) setView(i);
  };

  // dev only: open a level through the same camera move as a tap (screenshots and tests)
  useEffect(() => {
    if (!__DEV__) return;
    (globalThis as { __map?: unknown }).__map = {
      open: (chapter: number, level: number) => enter(Math.max(0, shown.findIndex((c) => c.id === chapter)), level),
    };
  });

  // back from a level: start inside the last bead played, pull out, then let new beads fill in
  const [fresh, setFresh] = useState<{ chapter: number; level: number }[]>([]);
  // fresh beads wait, drawn as they were, until their fill comes in on top
  const hidden = useMemo(() => {
    const m = new Map<number, Set<string>>();
    for (const { chapter, level } of fresh) m.set(chapter, (m.get(chapter) ?? new Set()).add(`${Math.floor((level - 1) / SECTION_LEVELS)}-${(level - 1) % SECTION_LEVELS}`));
    return m;
  }, [fresh]);
  const latest = useRef({ progress, shown, inContent, aim });
  latest.current = { progress, shown, inContent, aim };
  useFocusEffect(
    useCallback(() => {
      const was = away.current;
      if (!was) return;
      away.current = null;
      const { progress: now, shown: chs, inContent: place, aim: point } = latest.current;
      let i = chs.findIndex((c) => c.id === lastPlayed.chapter);
      let level = lastPlayed.level ?? was.level;
      if (i < 0) [i, level] = [chs.findIndex((c) => c.id === was.chapter), was.level];
      setFresh([...solvedKeys(now)].filter((k) => !was.solved.has(k)).map((k) => ({ chapter: +k.split('-')[0], level: +k.split('-')[1] })));
      // the bead may be off screen after a few levels in a row: bring it in first, under the veil
      const y = place(i, level).y;
      const vh = H - (rest.current?.y ?? 0);
      if (y < scrollY.value + 60 || y > scrollY.value + vh - 60) {
        const to = Math.max(0, y - vh / 2);
        scroller.current?.scrollTo({ y: to, animated: false });
        scrollY.value = to;
      }
      point(i, level, () => {
        z.value = withTiming(0, ZOOM);
      });
    }, [H, scrollY, z]),
  );
  useEffect(() => {
    if (!fresh.length) return;
    const t = setTimeout(() => setFresh([]), ZOOM.duration + fresh.length * 140 + 600);
    return () => clearTimeout(t);
  }, [fresh]);

  return (
    <Animated.View style={[{ flex: 1, overflow: 'hidden' }, bgStyle]}>
      <StatusBar style={isLight(pal.bg) ? 'dark' : 'light'} />
      <Animated.View style={[{ flex: 1 }, camera]}>
        <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
          <IconButton onPress={() => router.back()} tint={ink} label="Back" testID="back">
            <ChevronLeft color={ink} size={24} strokeWidth={2.4} />
          </IconButton>
          <View style={s.total} testID="dots">
            <View style={[s.dot, { backgroundColor: pal.fills[0], borderColor: ink }]} />
            <Text style={{ color: ink, fontSize: 24, fontWeight: '300', fontVariant: ['tabular-nums'] }}>{total}</Text>
          </View>
          {UNLOCK_ALL ? (
            <IconButton onPress={() => router.push('/levels')} tint={ink} label="All levels" testID="all-levels">
              <List color={ink} size={20} strokeWidth={2.2} />
            </IconButton>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
        <View ref={frame} collapsable={false} style={{ flex: 1 }}>
          <ScrollView
            ref={scroller}
            onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={onContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24, backgroundColor: pals[pals.length - 1].bg }}
          >
            {shown.map((ch, i) => (
              <View key={ch.id} style={{ width: W, height: height(i) }}>
                <LinearGradient {...band(i)} style={StyleSheet.absoluteFill} />
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <RosetteView id={ch.id} geo={geo[i]} state={states[i]} pal={pals[i]} night={night} width={W} hidden={hidden.get(ch.id)} />
                </View>
                {fresh.map(({ chapter, level }, n) => {
                  if (chapter !== ch.id) return null;
                  const b = beadAt(i, level);
                  const dots = levelRecord(progress, chapter, level)?.stars ?? 0;
                  return <Fresh key={`${chapter}-${level}`} delay={ZOOM.duration + n * 140} x={W / 2 + b.x} y={b.y - geo[i].top} dots={dots} pal={pals[i]} night={night} />;
                })}
                <Pressable style={StyleSheet.absoluteFill} onPress={(e) => tapAt(i, e)} testID={`chapter-${ch.id}`} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: veil }, veilStyle]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 6 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
});
