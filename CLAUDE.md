# CLAUDE.md

Loop is a mobile puzzle game on real tilings of the plane: turn (or flip) each tile until every line
meets a line on its neighbour. Expo + React Native app over a pure TypeScript core, in an npm
workspaces monorepo. Owner: Alessandro (AL).

The README is partly stale: "riso plates", "ten Books of fifteen plates", Expo SDK 52, the
`plugins/withPodsDeploymentTarget.js` plugin and the `apps/native/scripts/gen-*.mjs` generators all
describe an older version. Trust this file and the code. `.cursorrules` and `todo.md` date from the
SvelteKit/Capacitor version and do not apply.

## Working agreements

- Act as a ruthless mentor: push back when AL is wrong, say when you are unsure, no flattery.
- The Expo rewrite was committed on 2026-11-05 (`bce630c`..`bb258bf`). Commit only when AL asks.
  Back up anything uncommitted you overwrite (assets included) and check the copy before replacing it.
- Finish with fewer lines than you started where you can: search before writing, prefer a parameter
  to a fork, delete what a change supersedes. Report `+N/-M` lines with every finished task, and say
  in one sentence why when the count rose.
- AL often runs `expo start` on port 8081 to play on a phone. Never kill it; use another port.
- See it before reporting it: drive UI changes in Playwright and read the screenshots (see Testing).
- Never recreate a specific existing game. I Love Hue inspired the map and grids; nothing is copied.

## Layout

```
packages/core/src/          @tileloop/core, no UI; Metro and vitest import src/ directly
  game/puzzle.ts            engine: PuzzleSpec, buildPuzzle, tap, isSolved, solveSteps, restart
  game/symmetry.ts          turn order and mirror lines of an outline, computed from its geometry
  game/art.ts               tileArt (line drawing of a tile), strokeFor, inkIndex, outlinePoints
  game/levels.ts            chapters, sections, campaign/daily/endless/lab level defs, palettes
  game/progress.ts          persisted progress and settings, gates, recordSolve, markIntroSeen
  tiling/TilingGenerator.ts rule strings to polygon patches (ported from the Tiling Atlas)
  tiling/atlasPatch.ts      tileNode, patches from data/atlasTilings.ts
  tiling/split.ts           multi-scale (split square) boards
  data/atlasTilings.ts      cells exported from the Tiling Atlas; says "generated", but the export
                            script is in neither repo (checked 2026-11-05)
apps/native/
  app/                      expo-router screens: index (home), map, play, levels (all-levels list
                            and lab boards, from the map's list icon), settings (modal), _layout
  src/components/Board.tsx  the board renderer; BoardPicture for static thumbnails
  src/map/                  the rosette map: Rosette.tsx, layout.ts, frames.ts, emblem.ts
  src/theme.ts              alpha, mix, night/themed, useNight, usePalette, type scale
  src/feedback.ts           sounds (Kenney Interface Sounds, CC0) and haptics
```

`resources/`, `docs/superpowers/` (the June 2026 migration plan) and the root `*.py` scripts are
leftovers from the old version.

## Commands

```bash
npm install
npm start                               # Expo dev server
npm run start:all                       # every level open (EXPO_PUBLIC_UNLOCK_ALL=1) and --clear
npx vitest run --root packages/core     # 739 tests, about 3 s
npm run typecheck -w native             # tsc over the app
cd apps/native && EXPO_PUBLIC_UNLOCK_ALL=1 npx expo start --web --port 8094 --clear   # web, for Playwright
cd packages/core && npx vite-node /path/to/script.ts                                 # scratch scripts on the core
```

Metro caches the workspace core: restart with `--clear` after editing `packages/core`.

## The engine

A level is `(spec, seed)`: `buildPuzzle(spec, seed)` is deterministic, so a level is the same board
on every device. `LevelRef.mode` is `campaign`, `daily`, `endless` or `lab`.

Rule strings (`spec.rule`, resolved by `tilingFor` in puzzle.ts):

- TilingGenerator strings such as `4-3-3-3/m90/r(h7)/r(h5)`. A trailing `*` gives the dual (Laves)
  tiling: pentagons, kites, rhombi, florets. `DualPolygon` reports `n = 3` whatever its shape, so
  always take `n` from `vertices.length`. Duals need a larger generated patch (6x the tile count,
  2.2x for others) or boards come out as narrow strips.
- `atlas:<id>`: a cell from `data/atlasTilings.ts` (stars, isotoxal tiles).
- `split:<squares|triangles>:<share>:<salt>`: some tiles split into four half-size tiles.
- `{n}` in a section rule is replaced by the level number.

Tile symmetry comes from geometry (`outlineSymmetry`): `turns` is the rotation order (a rhombus has
2, so it turns half way). A shape with `turns === 1` and a mirror line `flips` (tap = mirror across
`axis`); one with neither is locked. `period` is the smallest turn that maps the pattern onto itself.

State is `σ = r^spin ∘ m^flip`. `edgeValue(t, e)` reads `conns[flip ? mirror[j] : j]` with
`j = e − spin·(n/turns)`. A mirror move sets `spin = −spin` and toggles `flip`. `spin` never wraps,
so animations always turn forward.

Mechanics, as `PuzzleSpec` shares:

| field | mechanic |
|---|---|
| `fixed` | hints: tiles left solved and locked, spread out, each with 2+ line ends |
| `links`, `reverse` | a driver turns its follower (`linkDir` −1 turns it the other way) |
| `passive` | held followers: cannot be tapped, only their driver moves them |
| `mirrors` | a driver mirrors its held partner across the partner's mirror line nearest the driver; the partner's pattern must change under that mirror |
| `gears` | a tap turns the tile and all its neighbours |
| `doubles` | twin edges carry two lines, at 1/3 and 2/3 |

The scramble is taps from the solved state, so every board is solvable. `par` is
`solveSteps(...).length`; for held followers the solver brute-forces the smallest tap count that
satisfies both the driver's and the follower's congruence.

`tileArt` draws a tile: round-capped strokes leave each edge square to it, the stub ends in a ring
(a dot on small tiles). Neighbouring tiles' round caps overlap at the shared edge midpoint, which
matters for rendering (below).

## Content

10 chapters × 5 sections × 10 levels = 500 campaign levels. A section opens with 18 of the previous
section's 30 dots (`SECTION_GATE`); a chapter opens with 18 in the previous chapter's last section.
A section's first level can carry an intro card (`introFor`, key `chapter·100 + section`).

| # | chapter | what it adds |
|---|---|---|
| 1 | Squares | fixed hints, share falling from 0.3 to 0 across the sections |
| 2 | Honeycomb | hexagons |
| 3 | Triangles | triangles |
| 4 | Weave | mixed tilings from `ROOMY`, 4.8.8, 3-uniform mosaics |
| 5 | Pairs | links, reverse links, held followers |
| 6 | Twins | double lines |
| 7 | Turns | rhombille dual (half turns), isotoxal and star tilings |
| 8 | Mirrors | flipping pentagons, florets with rhombi, mirror links |
| 9 | Fractal | split squares |
| 10 | Gears | gears |

Endless plays blocks of 5 levels (`ENDLESS_BLOCK`) from random sections, capped at the section's
largest board. The Daily is one section picked by the date, on a board from the upper half of its
sizes. Both draw only from the sections the player has opened (`Opened`, `openedBy`; everything
under `start:all`), so players at the same progress share a Daily. Lab boards (`labLevel`) exercise one mechanic or tiling each; reach them from the
map's list icon under `npm run start:all`. Saves from before the 10×5 rework map onto the current
chapters, and intro cards show again once.

## Invariants the tests enforce

- Every campaign level builds, solves, and its solution takes exactly par taps.
- Every tile of every campaign level is at least 44 pt wide (2·inradius·scale) on a 390×844 phone,
  whose board area is about 358×600. This rule removed 12-gon wheels, twelve-point stars and split
  triangles from the campaign. Run the phone-size test on any new rule before using it. Endless and
  Daily boards are made on the fly, so `fingertip` (levels.ts) shrinks them until they pass
  (`narrowestTile`); the test checks 60 Endless levels and 30 Dailies too.
- Separate lines in one tile stay a line-width apart.

## Design decisions (AL's calls; do not re-open them)

- Home: a new mosaic every launch (any campaign tiling but the duals, which build too slowly) in a
  palette generated from the chapter palettes' OKLCH recipe (`world` in theme.ts). Its top is whole
  tiles at uneven heights (`raggedTop`), full opacity, no fade.

- The map is abstract: one rosette per chapter (medallion with the chapter emblem, five section
  frames on spokes, beads along each frame). AL rejected the illustrated island map.
- No thin triangles and no subdivided polygons (a triangle or square cut into slivers). New shapes
  should be different shapes outright: pentagons, kites, rhombi. Dual tilings are the main source.
- Fixed tiles are early-game hints and grow rarer.
- Shapes that fit one way only flip instead of turning. A fixed tile cannot be mirrored, which is
  why mirror links target held followers.
- Shading always means "you cannot tap this" (fixed or held).
- A solved board shows only its pattern: link marks fade as the colour ripple reaches each tile;
  mirror lines, gear outlines and shading sit under the ripple's fill.
- Theme: System / Day / Night in Settings, not on the map. Night turns a palette inside out:
  `bg = mix(line, #000, 0.45)`, `line = bg`, fills unchanged.

## Rendering lessons (apps/native)

- Each tile is its own small `Svg`. All fills are drawn before all lines, so a tile's colour never
  covers a neighbour's strokes.
- At rest a tile's lines are drawn already turned, with no view rotation: a rotated view is
  resampled and lands up to a pixel off its neighbours. A rotating copy stands in only during a
  turn; flips fold a copy across the mirror line the same way. Boxes snap to device pixels and
  transforms pivot on the tile's exact centre.
- Never fade a whole board with `opacity`. Each tile's layer gets the alpha separately, so the
  overlapping round caps at tile edges double up into visible dots. Phones show this; the web
  composites the group and hides it. To hide a board, fade a background-coloured cover over it
  (`COVER` in play.tsx).
- Building or mounting a board during an animation stalls it. The next level is built and mounted
  hidden (`waiting`) 600 ms after the score appears, once the last score dot has landed (540 ms).
  Boards are keyed by seed, so the same instance goes live on Next.
- Reanimated: `useAnimatedStyle` follows only the shared values its updater reads directly. A value
  read inside a helper worklet is not tracked and the style freezes. Read `.value` in the updater
  and pass plain numbers to helpers.
- The solve ripple runs on the UI thread from one clock (`bloomClock`); solving re-renders no tile.
- On the web Reanimated runs on the JS thread. The "easing not supported on web" warning comes from
  entering animations with an easing and is known.
- Use `pointerEvents` in `style`; react-native-web warns on the prop.

## Testing and verification

- Dev-only hooks: `globalThis.__loop` on play (`solve()`, `tap(id)`, `puzzle()`, `step()` returns
  taps left) and `globalThis.__map.open(chapter, level)` on the map.
- Test IDs: `board`, `board-v<version>`, `next`, `result`, `restart`, `back`, `level-title`, `moves`,
  `intro`, `intro-ok`, `settings`, `chapters`, `all-levels`.
- Deep links: `/play?mode=campaign&chapter=8&level=37`, `mode=lab&level=<n>`, `mode=endless&level=<n>`,
  `mode=daily&date=YYYY-MM-DD`.
- Playwright is not a Loop dependency. Borrow the Tiling Atlas install:
  `createRequire('/Users/alessandro/Desktop/Personal/TilingAtlas/package.json')`, then
  `require('playwright')`. Use a 390×844 viewport at 2x. Dismiss intro cards (`intro-ok`) on a
  section's first level. For transition work, log `requestAnimationFrame` gaps in the page.
- The iOS simulator could not be driven (headless, stuck on an "Open in Loop?" dialog). The Android
  emulator works; most features have not been checked on a physical phone.

## Android APK

`android/` and `ios/` are generated by prebuild and gitignored: change `app.json` or plugins, then
regenerate. Never hand-edit them.

```bash
cd apps/native
EXPO_NO_GIT_STATUS=1 CI=1 npx expo prebuild -p android --no-install   # env vars skip the dirty-tree prompt
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain
cp app/build/outputs/apk/release/app-release.apk ../../../dist/Loop-<version>.apk   # dist/ is gitignored
```

- This Mac has Temurin JDK 21 and `ANDROID_HOME=~/Library/Android/sdk`. The first build took
  23 minutes (Gradle, NDK and CMake downloads); arm64-only gives a 37 MB APK.
- Release is signed with the template debug keystore: fine for sideloading and updating over it.
  The Play Store needs a real upload key, not set up yet.
- Smoke test on the `Pixel_8` AVD:
  `emulator -avd Pixel_8 -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect`, wait for
  `adb shell getprop sys.boot_completed` = 1, `adb install -r <apk>`,
  `adb shell monkey -p com.tileloop.app -c android.intent.category.LAUNCHER 1`,
  `adb exec-out screencap -p > shot.png`, grep `adb logcat -d` for `FATAL|ReactNativeJS`,
  then `adb emu kill`.
- `userInterfaceStyle` must stay `automatic`, with `expo-system-ui` installed, or the System theme
  never goes dark on a phone. The splash has a dark background (`#191715`, chapter 1 at night).

## Icon

`assets/icon.png` (1024, RGB, full bleed), `adaptive-icon.png` (transparent Android foreground),
`monochrome-icon.png` (Android 13 themed icons, tiles at partial alpha). The design is a ring of
four quarter-arcs across a 2×2 board of squares, in chapter 1's palette (bg `#F4EDE4`, ink
`#2D2A26`, fills `#E9B872` and `#E39E6B`), drawn with `tileArt` at stroke 0.15. The foreground's
2×2 square is 432 px on the 1024 canvas (diagonal 611 px), inside Android's 66 dp safe circle
(626 px). The generator was a scratch script and was not kept: redraw with `tileArt` if needed.

## Finding new tilings

AL's Tiling Searcher lives in `../TilingAtlas/tools/searcher`. Other sessions develop it: use it,
do not edit it. `tools/searcher/tilesearch board.txt --k a b --threads 8` searches (`tileestimate`
estimates the cost first); the board format is in `../TilingAtlas/docs/searcher/board-format.md`;
`pnpm tsx scripts/tilesearch-cells.ts <runfolder> <out.json.gz>` (in TilingAtlas) exports cells.
Certificate indices repeat across result files, so pick tilings by full id. Before a dual rule goes
into Mirrors, check that its flipping tiles spread over the board (some duals put every pentagon
in rows along the edge) and that it passes the 44 pt test.

## Open items (2026-11-05)

- No difficulty scorer: difficulty comes from board size and mechanic shares only.
- Nobody has played the mirror-link levels yet.
- Twin-line and star boards look busy.
- The polyomino (merged-cell) family has not been mocked.
- The Mirrors rosette builds its geometry on first render (about 0.5 s on a phone, unmeasured).
- Next across a chapter boundary switches the background colour instantly.
- The README needs rewriting for the current game.
