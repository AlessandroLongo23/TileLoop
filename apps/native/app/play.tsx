import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut, ZoomIn, Easing } from 'react-native-reanimated';
import { ChevronLeft, RotateCcw, ArrowRight, Check } from 'lucide-react-native';
import {
  buildPuzzle,
  levelDef,
  tap,
  isSolved,
  solveSteps,
  startOf,
  restart,
  starsFor,
  recordSolve,
  chapters,
  markIntroSeen,
  introFor,
  levelsIn,
  levelUnlocked,
  openedBy,
  LAB_LEVELS,
  labLevel,
  type LevelDef,
  type LevelRef,
  type Progress,
  type Puzzle,
} from '@tileloop/core';
import Board from '../src/components/Board';
import { IconButton, Press, Dots } from '../src/components/ui';
import { useProgress } from '../src/hooks/stores';
import { alpha, isLight, type, usePalette } from '../src/theme';
import { play, playTap, haptic } from '../src/feedback';
import { setLastPlayed } from '../src/journey';

// `npm run start:all` opens every level
const UNLOCK_ALL = process.env.EXPO_PUBLIC_UNLOCK_ALL === '1';
// how long the cover takes to hide a solved board before the next one comes in
const COVER = 180;
// what Endless and the Daily may draw from: the sections the player has opened
const opened = (p: Progress) => (UNLOCK_ALL ? undefined : openedBy(p));

function refFromParams(p: Record<string, string | undefined>): LevelRef {
  if (p.mode === 'daily') return { mode: 'daily', date: p.date };
  if (p.mode === 'endless') return { mode: 'endless', level: Number(p.level ?? 1) };
  if (p.mode === 'lab') return { mode: 'lab', level: Number(p.level ?? 1) };
  return { mode: 'campaign', chapter: Number(p.chapter ?? 1), level: Number(p.level ?? 1) };
}

/** The level Next opens, or null when there is none open (a gate still needs dots): back to the map. */
function nextRef(ref: LevelRef, p: Progress): LevelRef | null {
  if (ref.mode === 'endless') return { mode: 'endless', level: (ref.level ?? 1) + 1 };
  if (ref.mode === 'lab') return ref.level! < LAB_LEVELS ? { mode: 'lab', level: ref.level! + 1 } : null;
  if (ref.mode !== 'campaign') return null;
  const n =
    ref.level! < levelsIn(ref.chapter!)
      ? { chapter: ref.chapter!, level: ref.level! + 1 }
      : ref.chapter! < chapters.length
        ? { chapter: ref.chapter! + 1, level: 1 }
        : null;
  return n && (UNLOCK_ALL || levelUnlocked(p, n.chapter, n.level)) ? { mode: 'campaign', ...n } : null;
}

export default function Play() {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress();

  const [ref, setRef] = useState<LevelRef>(() => refFromParams(params));
  useEffect(() => {
    if (ref.mode === 'campaign') setLastPlayed(ref.chapter!, ref.level!);
  }, [ref]);
  // not on progress: solving changes it, and the board must not be rebuilt under the player
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const def = useMemo(() => levelDef(ref, opened(progress)), [ref]);
  // The next level is built and laid out unseen while the player looks at the solved board, so Next
  // only has to show it: mounting a board in the same moment as the fade made the fade stall.
  const [ahead, setAhead] = useState<{ def: LevelDef; puzzle: Puzzle } | null>(null);
  const upcoming = ahead && ahead.def.seed !== def.seed ? ahead : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const puzzle = useMemo(() => (ahead?.def.seed === def.seed ? ahead.puzzle : buildPuzzle(def.spec, def.seed)), [def]);
  const start = useMemo(() => startOf(puzzle), [puzzle]);
  const [rewind, setRewind] = useState(0);
  const pal = usePalette(def.palette);
  const upcomingPal = usePalette(upcoming?.def.palette ?? def.palette);
  const [leaving, setLeaving] = useState(false);
  // the board the screen opened with comes in under the screen's own fade; later ones right after the cover
  const firstSeed = useRef(def.seed).current;

  const [version, setVersion] = useState(0);
  const [moves, setMoves] = useState(0);
  const [solvedFrom, setSolvedFrom] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [bump, setBump] = useState({ tile: -1, n: 0 });
  const [box, setBox] = useState({ w: 0, h: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const chapter = ref.mode === 'campaign' ? chapters[ref.chapter! - 1] : null;
  const card = ref.mode === 'campaign' ? introFor(ref.chapter!, ref.level!) : null;
  const intro = card && !progress.seenIntros.includes(card.key) ? card : null;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    play('appear', 0.35);
  }, [def.seed]);

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    solving.current = false;
    setLeaving(false);
    setBump((b) => ({ tile: -1, n: b.n }));
    setMoves(0);
    setSolvedFrom(null);
    setScore(null);
    setVersion((v) => v + 1);
  }

  // The winning turn plays out untouched: re-rendering every tile for the colour ripple (and saving)
  // in the same frame would make it stutter. Taps wait meanwhile, so the board cannot be undone.
  const solving = useRef(false);
  function onSolved(from: number, finalMoves: number) {
    const marks = starsFor(finalMoves, puzzle.par);
    solving.current = true;
    later(250, () => {
      setSolvedFrom(from);
      play('solve', 0.7);
      haptic('success');
    });
    later(880, () => setScore(marks));
    // not a cancellable timer: progress is saved even if the player leaves right away. The colour
    // ripple runs on the animation thread by then, so saving does not stall it.
    const save = { ...ref };
    setTimeout(() => recordSolve(save, finalMoves, marks), 400);
  }

  function onTap(id: number) {
    if (intro) return;
    if (solvedFrom !== null) {
      if (score !== null) goNext();
      return;
    }
    if (solving.current) return;
    const turned = tap(puzzle, id);
    setBump((b) => ({ tile: id, n: b.n + 1 }));
    if (!turned.length) {
      play('locked', 0.35);
      haptic('soft');
      return;
    }
    playTap();
    haptic('tap');
    const m = moves + 1;
    setMoves(m);
    setVersion((v) => v + 1);
    if (isSolved(puzzle)) onSolved(id, m);
  }

  // dev only: play the remaining taps through the normal path (screenshots and tests)
  useEffect(() => {
    if (!__DEV__) return;
    (globalThis as { __loop?: unknown }).__loop = {
      solve: () => {
        let m = moves;
        let lastTile = 0;
        for (const id of solveSteps(puzzle)) {
          tap(puzzle, id);
          lastTile = id;
          m++;
        }
        setMoves(m);
        setVersion((v) => v + 1);
        if (isSolved(puzzle)) onSolved(lastTile, m);
      },
      /** A tap on one tile, through the same path as a finger; and the board as it stands. */
      tap: (id: number) => onTap(id),
      puzzle: () => puzzle,
      /** The next solving tap, through the same path as a finger. Returns the taps left. */
      step: () => {
        const steps = solveSteps(puzzle);
        if (steps.length) onTap(steps[0]);
        return steps.length - 1;
      },
    };
  });

  // once the result has settled (the last score dot lands at 540 ms), so building the next board stalls nothing
  useEffect(() => {
    if (score === null || leaving || upcoming) return;
    const n = nextRef(ref, progress);
    if (!n) return;
    const t = setTimeout(() => {
      const d = levelDef(n, opened(progress));
      setAhead({ def: d, puzzle: buildPuzzle(d.spec, d.seed) });
    }, 600);
    return () => clearTimeout(t);
  }, [score, progress, ref, leaving, upcoming]);

  // A cover in the background colour fades in over the board, then the next level takes its place
  // unseen. Fading the board itself would fade each tile apart, and where two tiles' lines overlap
  // the overlap would show through as a dot.
  function goNext() {
    if (leaving) return;
    const n = nextRef(ref, progress);
    if (!n) return router.back();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLeaving(true);
    later(COVER, () => {
      setRef(n);
      reset();
    });
  }

  function again() {
    restart(puzzle, start);
    setRewind((r) => r + 1);
    reset();
  }

  const title = ref.mode === 'daily' ? 'Daily' : String(ref.level);
  const subtitle = chapter
    ? chapter.title
    : ref.mode === 'lab'
      ? labLevel(ref.level ?? 1).name
      : ref.mode === 'daily'
      ? new Date(`${ref.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
      : 'Endless';
  const ink = pal.line;

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style={isLight(pal.bg) ? 'dark' : 'light'} />
      <Row
        style={s.bar}
        left={
          <IconButton onPress={() => router.back()} tint={ink} label="Back" testID="back">
            <ChevronLeft color={ink} size={24} strokeWidth={2.4} />
          </IconButton>
        }
        center={
          <View style={{ alignItems: 'center' }}>
            <Text style={[type.heading, { color: ink }]} testID="level-title">
              {title}
            </Text>
            <Text style={[type.small, { color: alpha(ink, 0.5) }]}>{subtitle}</Text>
          </View>
        }
        right={
          <IconButton onPress={again} tint={ink} label="Restart" testID="restart">
            <RotateCcw color={ink} size={19} strokeWidth={2.2} />
          </IconButton>
        }
      />

      <View style={s.boardBox} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {box.w > 0 &&
          [{ def, puzzle, pal }, upcoming && { ...upcoming, pal: upcomingPal }].map((b, i) => {
            if (!b) return null;
            const live = i === 0;
            // keyed by level, so the board laid out ahead is the same board once it is shown
            return (
              <View key={b.def.seed} style={[StyleSheet.absoluteFill, { pointerEvents: live ? 'auto' : 'none' }]}>
                <Board
                  puzzle={b.puzzle}
                  palette={b.pal}
                  width={box.w}
                  height={box.h}
                  version={live ? version : 0}
                  onTap={live ? onTap : undefined}
                  solvedFrom={live ? solvedFrom : null}
                  introKey={b.def.seed}
                  rewind={rewind}
                  bump={live ? bump : undefined}
                  waiting={!live}
                  lead={b.def.seed === firstSeed ? 170 : 40}
                />
              </View>
            );
          })}
        {leaving && <Animated.View entering={FadeIn.duration(COVER)} style={[StyleSheet.absoluteFill, { backgroundColor: pal.bg }]} />}
      </View>

      <Row
        style={s.foot}
        inward
        left={score !== null && <Dots count={score} color={ink} size={12} animate />}
        center={
          score === null ? (
            <Text style={[type.small, { color: alpha(ink, 0.5) }]} testID="moves">
              {moves} {moves === 1 ? 'move' : 'moves'} · par {puzzle.par}
            </Text>
          ) : (
            <Press onPress={goNext} testID="next" label="Next level">
              <Animated.View entering={ZoomIn.duration(240).easing(Easing.out(Easing.cubic))} style={[s.next, { backgroundColor: ink }]} testID="result">
                {nextRef(ref, progress) ? <ArrowRight color={pal.bg} size={26} strokeWidth={2.6} /> : <Check color={pal.bg} size={26} strokeWidth={2.6} />}
              </Animated.View>
            </Press>
          )
        }
        right={
          score !== null && (
            <Text style={[type.small, { color: alpha(ink, 0.5) }]}>
              {moves} {moves === 1 ? 'move' : 'moves'}
            </Text>
          )
        }
      />

      {intro && (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} style={[s.scrim, { backgroundColor: alpha(pal.bg, 0.86) }]} testID="intro">
          <Animated.View entering={ZoomIn.duration(260).easing(Easing.out(Easing.cubic))} style={{ alignItems: 'center', paddingHorizontal: 36 }}>
            <Text style={[type.heading, { color: ink, fontSize: 28, textAlign: 'center' }]}>{intro.title}</Text>
            <Text style={[type.label, { color: alpha(ink, 0.65), fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10, fontWeight: '500' }]}>
              {intro.body}
            </Text>
            <Press onPress={() => markIntroSeen(intro.key)} testID="intro-ok" label="Start" outer={{ marginTop: 28 }}>
              <View style={[s.next, { backgroundColor: ink }]}>
                <ArrowRight color={pal.bg} size={26} strokeWidth={2.6} />
              </View>
            </Press>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

/** Left, centre and right slots. The two sides share the leftover width equally, so the centre stays centred whatever they hold. */
function Row({ left, center, right, style, inward }: { left?: React.ReactNode; center: React.ReactNode; right?: React.ReactNode; style: object; inward?: boolean }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: inward ? 'flex-end' : 'flex-start', gap: 8 }}>{left}</View>
      {center}
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: inward ? 'flex-start' : 'flex-end', gap: 8 }}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { height: 60, paddingHorizontal: 14 },
  boardBox: { flex: 1, marginHorizontal: 12, marginVertical: 6 },
  foot: { height: 84, paddingHorizontal: 24, gap: 22 },
  next: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
