# TileLoop React / React Native + TypeScript Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate TileLoop from Svelte/SvelteKit/Capacitor to a TypeScript monorepo with a shared framework-agnostic core, a React (Vite + Motion) web app verified by Playwright, and an Expo React Native app (Moti) — removing dead code along the way.

**Architecture:** Turborepo + npm workspaces. `packages/core` holds all game logic + Zustand state as typed TS with injected platform deps (Rng, Clock, Storage, loadTileSvg). `apps/web` (React + Vite + Motion + Tailwind) and `apps/native` (Expo + react-native-svg + Moti + NativeWind) each own their UI over the same core.

**Tech Stack:** TypeScript, Turborepo, Zustand, React 18, Vite, React Router, framer-motion (Motion), Tailwind 4, Playwright, Vitest, Expo, Expo Router, react-native-svg, Moti/Reanimated, NativeWind, AsyncStorage.

**Spec:** `docs/superpowers/specs/2026-06-14-tileloop-react-migration-design.md`

**Conventions for every task:** work on branch `migrate/react-native-typescript`. Commit after each task with a descriptive message ending in the `Co-Authored-By` trailer. Run the task's verification before committing. Source-of-truth for behavior is the existing Svelte code under `src/` (kept until P5 cutover).

---

## Phase 0 — Monorepo scaffold

### Task 0.1: Stand up the workspace
**Files:** Create `package.json` (root), `turbo.json`, `tsconfig.base.json`, `.gitignore` (update), `packages/core/package.json`, `apps/web/package.json`, `apps/native/package.json`.

- [ ] Move the legacy app aside so the new tree is clean: `git mv src src_legacy` and `git mv static static_legacy` (keeps it readable/runnable as reference until P5; `static_legacy/tilesets` is the asset source).
- [ ] Root `package.json`: `private: true`, `workspaces: ["packages/*", "apps/*"]`, `packageManager` npm, scripts: `"dev": "turbo dev"`, `"build": "turbo build"`, `"test": "turbo test"`, `"lint": "turbo lint"`, `"typecheck": "turbo typecheck"`. Dev deps: `turbo`, `typescript`, `@types/node`.
- [ ] `turbo.json`: pipelines for `build` (dependsOn `^build`), `test`, `typecheck`, `lint`, `dev` (cache false, persistent).
- [ ] `tsconfig.base.json`: `strict: true`, `moduleResolution: "Bundler"`, `target: "ES2022"`, `lib: ["ES2022", "DOM"]`, `esModuleInterop`, `skipLibCheck`, path alias `@tileloop/core` → `packages/core/src`.
- [ ] Verify: `npm install` succeeds and `npx turbo run typecheck` runs (no packages yet = no-op OK).
- [ ] Commit: `chore: scaffold turborepo workspace`.

### Task 0.2: Core package skeleton
**Files:** Create `packages/core/package.json` (name `@tileloop/core`, type module, exports `./src/index.ts`), `packages/core/tsconfig.json` (extends base), `packages/core/src/index.ts` (empty barrel), `packages/core/vitest.config.ts`.

- [ ] Add dev deps to core: `vitest`, `typescript`. Add dep: `zustand`.
- [ ] `package.json` scripts: `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`.
- [ ] Add a trivial `src/index.ts` exporting `export const CORE_VERSION = '0.0.1';` and a smoke test `src/index.test.ts` asserting it.
- [ ] Verify: `npm run test -w @tileloop/core` passes; `npm run typecheck -w @tileloop/core` passes.
- [ ] Commit: `chore: scaffold @tileloop/core package`.

### Task 0.3: Web app skeleton (Vite + React + TS + Tailwind 4)
**Files:** Create `apps/web/` via Vite react-ts template structure: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `tailwind.config` via `@tailwindcss/vite`, `playwright.config.ts`, `tests/smoke.spec.ts`.

- [ ] Deps: `react`, `react-dom`, `react-router-dom`, `motion`, `@tileloop/core`, `lucide-react`, `zustand`, `tailwindcss@4`, `@tailwindcss/vite`. Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@playwright/test`.
- [ ] `vite.config.ts`: plugins `[react(), tailwindcss()]`; `server.port` 5173.
- [ ] `App.tsx` renders `<h1>TileLoop</h1>`; `index.css` has `@import "tailwindcss";`.
- [ ] `playwright.config.ts`: `webServer` runs `npm run dev`, baseURL `http://localhost:5173`, project chromium.
- [ ] `tests/smoke.spec.ts`: `await page.goto('/'); await expect(page.getByText('TileLoop')).toBeVisible();`
- [ ] Verify: `npm run dev -w web` serves; `npx playwright test -c apps/web` smoke passes.
- [ ] Commit: `chore: scaffold web app (vite+react+tailwind+playwright)`.

### Task 0.4: Native app skeleton (Expo + TS + NativeWind)
**Files:** Create `apps/native/` Expo Router template: `package.json`, `app.json`, `tsconfig.json`, `metro.config.js`, `babel.config.js`, `nativewind-env.d.ts`, `tailwind.config.js`, `global.css`, `app/_layout.tsx`, `app/index.tsx`.

- [ ] Deps: `expo`, `expo-router`, `react`, `react-native`, `react-native-svg`, `moti`, `react-native-reanimated`, `nativewind`, `@tileloop/core`, `lucide-react-native`, `zustand`, `@react-native-async-storage/async-storage`, `expo-audio`.
- [ ] Configure NativeWind (babel preset + metro `withNativeWind`) and Reanimated babel plugin. Configure Metro to resolve the workspace `@tileloop/core` (watchFolders + nodeModulesPaths).
- [ ] `app/index.tsx` renders `<Text className="text-xl">TileLoop</Text>`.
- [ ] Verify: `npx expo export -p web` (or `npx expo-doctor`) completes without resolution errors; `npm run typecheck -w native` passes. (Full device run is manual; document in apps/native/README.)
- [ ] Commit: `chore: scaffold expo native app (router+nativewind+moti)`.

---

## Phase 1 — Core (TypeScript engine + state)

> TDD: each engine module gets Vitest tests asserting behavior parity with the legacy code. Use a **fixed-seed Rng** so generation is deterministic in tests.

### Task 1.1: Platform interfaces + seeded Rng + Clock
**Files:** Create `packages/core/src/platform/types.ts`, `packages/core/src/platform/rng.ts`, `packages/core/src/platform/context.ts`, tests `rng.test.ts`.

- [ ] Define interfaces: `interface Rng { next(): number }` (returns [0,1)), `interface Clock { now(): number; iso(): string }`, `interface Storage { getItem(k): Promise<string|null>; setItem(k,v): Promise<void>; removeItem(k): Promise<void> }`, `type LoadTileSvg = (tileset: string, sides: number, connections: string) => Promise<string>`.
- [ ] `rng.ts`: `mulberry32(seed: number): Rng` (deterministic) and `systemRng: Rng` wrapping `Math.random`.
- [ ] `context.ts`: a module-level `platform` object `{ rng, clock, storage, loadTileSvg }` with a `configurePlatform(partial)` setter and sane web-less defaults (`systemRng`, real clock). Engine reads `platform.rng.next()` instead of `Math.random()`.
- [ ] Test: `mulberry32(42)` produces a fixed known sequence (snapshot first 5 values); two instances with same seed match.
- [ ] Verify: `vitest run rng`. Commit: `feat(core): platform context with seeded rng + clock`.

### Task 1.2: seq helpers (replace extensions.js prototype pollution)
**Files:** Create `packages/core/src/util/seq.ts`, test `seq.test.ts`. Source: `src_legacy/lib/utils/extensions.js`.

- [ ] Port every helper as a typed pure function operating on arrays/strings explicitly: `next`, `prev`, `rotate`, `compare`, `cycleToMinimumLexicographicalOrder`, `isAxialSymmetric`, `subarray`, `getSimmetries`, `palindrome` (fix the `palidrome` typo), `fromBase`, `cyclicallyInclude`, `simmetrize`, `pickRandom(arr, rng, weights?)`, `findSubsequenceStartingIndex`, `isEqual`, `isEqualOrChiral`, `sum`, `count(str, ch)`, `capitalize(str)`. `pickRandom` takes an `Rng` (no global `Math.random`).
- [ ] Tests (parity): `cycleToMinimumLexicographicalOrder([2,0,1])` → `[[0,1,2], false, 1]`; `simmetrize([0,1,2,3],1)` matches legacy output; `getSimmetries([1,1,1])` returns rotational entries; `capitalize('zen')==='Zen'`; `pickRandom([a],seededRng)` deterministic.
- [ ] Verify: `vitest run seq`. Commit: `feat(core): typed seq helpers replacing prototype extensions`.

### Task 1.3: geometry primitives — Vector, math, geometry, constants
**Files:** Create `packages/core/src/geometry/constants.ts` (`export const TOLERANCE = 0.01;` + `possibleAngles`, `possibleSides`, `offsets`), `geometry/Vector.ts`, `geometry/math.ts` (`map`, `isWithinTolerance`), `geometry/geometry.ts` (`sortPointsByAngleAndDistance`, `getClockwiseAngle`, `apothem`, `angleBetween`, `computeIntersection`), `geometry/optimizing.ts` (`getSpatialKey`). Tests `Vector.test.ts`, `geometry.test.ts`.

- [ ] Port `Vector` verbatim to TS (add types; keep static + instance methods identical). Drop nothing — it's all used.
- [ ] Port math/geometry/optimizing; replace `import { tolerance }` with `TOLERANCE` from constants. **Delete** the two large commented-out functions in geometry (`isTriangleOverlappingHexagon`, `isHexagonCoveredByTriangles`) — dead code.
- [ ] Tests: `Vector.rotate`, `mirror`, `fromPolar`, `distance`, `midpoint`; `isWithinTolerance` for number + point; `computeIntersection` of two lines.
- [ ] Verify: `vitest run Vector geometry`. Commit: `feat(core): geometry primitives (Vector, math, geometry)`.

### Task 1.4: config store (Zustand) + remove engine→Svelte coupling
**Files:** Create `packages/core/src/state/configStore.ts`. Source: `src_legacy/lib/stores/configuration.js`.

- [ ] Zustand store holding: `selectedTiling`, `scale` (60), `lineWidth` (1), `colorParams` ({a:180,b:0}), `islamicAngle` (90), `isDual`, `transformSteps`, `parameter`, plus exported consts `possibleAngles/possibleSides/offsets` (move to constants if not already). Provide `configStore.getState()` for engine reads and a `useConfig` selector hook export note (hook lives in apps, but store is core).
- [ ] Verify: `typecheck`. Commit: `feat(core): config store (zustand)`.

### Task 1.5: Polygon family
**Files:** Create `packages/core/src/tiling/Polygon.ts` (Polygon, RegularPolygon, DualPolygon, StarPolygon, IsotoxalPolygon), test `Polygon.test.ts`. Source: `src_legacy/lib/classes/Polygon.svelte.js`.

- [ ] Port classes to TS. Replace `get(lineWidth)/get(islamicAngle)/get(colorParams)` with `configStore.getState()`. Replace `tolerance` import with `TOLERANCE`.
- [ ] **Delete dead p5 rendering:** remove `show()` and `showIslamic()` (p5 `ctx` canvas methods — only called from the commented `Canvas.svelte` and `Tiling.show`). Keep `calculateHue` (used for color), `containsPoint`, `calculateVertices/Halfways/Centroid`, `rotate`, `mirror`, `clone`. Remove the unused `import { TheaterIcon } from 'lucide-svelte'`.
- [ ] Type `halfways` as `Array<Vector & { connections?: number; matched?: boolean }>` (or a `Halfway` type extending Vector) since the engine attaches `connections`/`matched`.
- [ ] Tests: a square (`n=4`) has 4 vertices/halfways; `rotate(1)` updates `svgTransform` and re-derives vertices; `containsPoint(centroid)` true; `mirror(false)` sets `mirrored` + `scaleX(-1)` without altering connection data; `mirror(true)` reflects connections.
- [ ] Verify: `vitest run Polygon`. Commit: `feat(core): polygon family (no p5)`.

### Task 1.6: Tiling + TilingGenerator
**Files:** Create `packages/core/src/tiling/Tiling.ts`, `packages/core/src/tiling/TilingGenerator.ts`, test `TilingGenerator.test.ts`. Source: `src_legacy/lib/classes/Tiling.svelte.js`, `TilingGenerator.svelte.js` (1154 LOC).

- [ ] `Tiling.ts`: port the data container; **delete** the p5 `show()` method (dead). Keep node/anchor/transform fields.
- [ ] `TilingGenerator.ts`: port the generator. Replace `Math.random` → `platform.rng.next()`, `get(store)` → `configStore.getState()`, prototype helper calls → `seq.*`. Type the public method `generateFromRule(rule: string, transformSteps: number[]): Tiling`. Keep internal geometry math identical; narrow `any` allowed in the densest internals (document with `// FIXME: tighten types`).
- [ ] Tests (deterministic with `mulberry32`): `generateFromRule('4-4-0,4/r90/m(v2)', [1])` yields a Tiling with >0 nodes, all `n===4`; node centroids are finite; rerun with same seed → identical centroid set.
- [ ] Verify: `vitest run TilingGenerator`. Commit: `feat(core): tiling + generator (deterministic rng)`.

### Task 1.7: Level + Effect
**Files:** Create `packages/core/src/tiling/Level.ts`, test `Level.test.ts`. Source: `src_legacy/lib/classes/Level.svelte.js`.

- [ ] Port `Level` + `Effect`. Replace `get(scale)`→`configStore.getState().scale`, `Date.now()/Math.random()` (id) → `platform.clock.now()` + `platform.rng`, prototype helpers → `seq.*`, `tilingRules` import → core data (Task 1.8). Keep `removeOverflowingTiles/generateConnections/convertTilingToTiles/getTileType/addEffects/shuffle/checkIfSolved` semantics **exactly** (the mirror/canonicalization fix from commit `0f6f70a`/`7058d27` must be preserved — see comments in source).
- [ ] Tests (seeded): construct `new Level(rule, [1], 800, 800)`; `tiling.nodes.length > 0`; every node has `tileType` like `"4/0110"`; **solve-detection round-trip** — after `convertTilingToTiles` but before `shuffle`, `checkIfSolved()` is true; after `shuffle()` with a non-zero turn it's false; rotating a node back to 0 turns restores solved. Regression test: a mirrored node still reaches solved (guards `0f6f70a`).
- [ ] Verify: `vitest run Level`. Commit: `feat(core): level + effect with solve detection`.

### Task 1.8: Static data — tilingRules, themes, chapter config
**Files:** Create `packages/core/src/data/tilingRules.ts`, `data/themes.ts`, `data/campaign.ts`. Source: `src_legacy/lib/stores/tilingRules.js` (901 LOC), `data.js`, `campaign.ts` constants.

- [ ] Port `tilingRules` as typed exported data (`interface TilingRuleGroup { name; rules: { name; rulestring; cr; ... }[] }`). Port `themes` (`themes['default'].colors[gameMode]`). Move `CHAPTERS_COUNT`/`LEVELS_PER_CHAPTER` here.
- [ ] Verify: `typecheck`; a test asserts `tilingRules.flatMap(g=>g.rules).length > 0` and every rule has a non-empty `rulestring`.
- [ ] Commit: `feat(core): static tiling rules + themes + campaign config`.

### Task 1.9: SVG preparation util
**Files:** Create `packages/core/src/svg/prepareTileSvg.ts`, test `prepareTileSvg.test.ts`. Source: the SVG string-munging in `src_legacy/lib/components/Tile.svelte` (loadSvg) + the derived style math.

- [ ] Pure function `prepareTileSvg(raw: string, opts: { tileset; nodeId; scale; scalePolygon; }): string` — performs the id namespacing (`pathMask`, `redGradient`, `gradientStop2` offset), `viewBox`/width/height rewrite, and `<filter>` stripping. Also export `tileStyleParams(node, scale)` returning `{ scalePolygon, lineStrokeWidth, borderStrokeWidth, startRotation, transforms }` (the math from Tile.svelte `onMount`/`calculateStartRotation`/`calculateOffset`).
- [ ] Tests: feeding a sample SVG namespaces ids uniquely per `nodeId`; `tileStyleParams` for `n=4` returns expected `scalePolygon = 2/(2*sin(pi/4))`.
- [ ] Verify: `vitest run prepareTileSvg`. Commit: `feat(core): tile svg preparation + style math`.

### Task 1.10: Game state stores (Zustand + persist) and session/progress API
**Files:** Create `packages/core/src/state/persist.ts` (storage adapter factory), `state/gameProgressStore.ts`, `state/gameSettingsStore.ts`, `state/gameSessionStore.ts`, `state/gameAppearanceStore.ts`, `state/audioStore.ts`, plus `state/progressApi.ts` (the function layer). Source: `gameProgress.js`, `gameAppearance.js`, `audio.js`.

- [ ] `persist.ts`: a Zustand `persist` storage that delegates to `platform.storage` (async). Web injects localStorage adapter; native injects AsyncStorage (in app entry).
- [ ] Recreate each store with the **same shape** as the legacy `objectStore`s: `campaignProgress` (with `createDefaultCampaignProgress`), `currentGameState`, `zen/timeAttack/precision` mode progress, `gameSettings`, `gameStats`, `currentGameSession` (non-persisted). Keep validation as TS types + a runtime guard where the legacy `validationStatement` mattered.
- [ ] `progressApi.ts`: port the function layer verbatim in behavior — `isLevelUnlocked`, `isChapterCompleted/Unlocked`, `completeLevel`, `saveCurrentGameState`, `clearCurrentGameState`, `updateGameModeProgress`, `getCurrentCampaignProgress`, `getCurrentModeProgress`, `startGameSession`, `endGameSession`, `advanceToNextLevel`, `getCurrentSession`, `getLevelProgress/getChapterProgress`. Replace `new Date().toISOString()` with `platform.clock.iso()`. Drop the `testMobileStorage` and Capacitor-specific `migrateLocalStorageToMobile`/`initializeGameStores` plumbing (replaced by zustand persist hydration); keep a `loadBackupProgress`-equivalent only if still needed (evaluate; the indexedDB backup is superseded by persist — note removal).
- [ ] `gameAppearanceStore`: `shapeStyles[triangle|square|hexagon].tileset`; persisted.
- [ ] `audioStore`: music/sound enabled + volume; persisted.
- [ ] Tests: `completeLevel(1,1,{stars:3})` marks 1-1 completed and unlocks 1-2 (inject a memory storage + fixed clock); `advanceToNextLevel` rolls chapter over after `LEVELS_PER_CHAPTER`.
- [ ] Verify: `vitest run progressApi`. Commit: `feat(core): zustand game state + progress/session api`.

### Task 1.11: Core barrel + audio engine logic
**Files:** Update `packages/core/src/index.ts` to export the public surface. Create `packages/core/src/audio/soundEngine.ts` (platform-agnostic sound descriptions) from `src_legacy/lib/utils/sounds.js`.

- [ ] Split `sounds.js`: the **what** (sound definitions/params like `stateChange`) into core as data + a `SoundEngine` interface; the **how** (Web Audio / expo-audio) stays in each app. Export the interface + the sound parameter presets.
- [ ] Barrel exports: geometry, tiling, state stores + hooks-less selectors, data, svg, platform, util.
- [ ] Verify: `npm run typecheck -w @tileloop/core` clean; `npm run test -w @tileloop/core` all green.
- [ ] Commit: `feat(core): public barrel + sound engine interface`.

---

## Phase 2 — Web app (player-facing game) + Playwright

> Each component task: create the `.tsx`, port markup/logic from the Svelte source, wire to core, add/extend a Playwright assertion. Svelte `$state`→`useState`, `$derived`→`useMemo`, `$effect`→`useEffect`, `$props`→props, stores via `useStore(store, selector)` (zustand). `{@html}`→`dangerouslySetInnerHTML`.

### Task 2.1: App shell, providers, routing, Tailwind theme
**Files:** `apps/web/src/main.tsx`, `src/App.tsx`, `src/routes/Root.tsx`, `src/platform/webPlatform.ts`, `src/index.css`. Source: `+layout.svelte`, `app.css`, `app.html`, `routes/+page.svelte`.

- [ ] `webPlatform.ts`: `configurePlatform({ rng: systemRng, clock, storage: localStorageAdapter, loadTileSvg: fetchTileSvg })` where `fetchTileSvg` fetches `/tilesets/${tileset}/${sides}/${connections}.svg`. Add a test seam: if `window.__tileloop?.seed` is set, use `mulberry32(seed)`.
- [ ] Copy `static_legacy/tilesets` and `static_legacy/sound` into `apps/web/public/`. Port `app.css` globals + the `--vh` mobile viewport handling into `index.css`.
- [ ] React Router routes: `/` (redirect → `/menu`), `/menu`, `/campaign`, `/play`, later `/editor/level`, `/editor/tile`. Root renders `<AudioPlayer/>` + `<Outlet/>`. Hydrate stores on mount.
- [ ] Playwright: `app boots → /menu visible`.
- [ ] Commit: `feat(web): app shell, routing, platform wiring`.

### Task 2.2: UI primitives
**Files:** `apps/web/src/components/ui/{Button,Toggle,Checkbox,Input,Slider,Modal,LevelButton,LevelGrid,ChapterHeader,ColorPad}.tsx`. Source: `src_legacy/lib/components/ui/*`.

- [ ] Port each primitive (Tailwind classes carry over near-verbatim). `Modal` uses Motion `AnimatePresence` for enter/exit (replaces Svelte transitions).
- [ ] Playwright: a story route or the settings modal exercises Button/Toggle/Slider.
- [ ] Commit: `feat(web): ui primitives`.

### Task 2.3: Tile + LevelRenderer
**Files:** `apps/web/src/components/Tile.tsx`, `src/components/LevelRenderer.tsx`, `src/hooks/useTileSvg.ts`. Source: `Tile.svelte`, `LevelRenderer.svelte`.

- [ ] `useTileSvg(node, tileset)`: loads via `platform.loadTileSvg`, runs `prepareTileSvg` (core). `Tile.tsx`: `motion.div` positioned at `node.screenPosition`, `animate={{ rotate: startRotation°, scaleX: node.mirrored?-1:1 }}` with a 300ms tween (replaces CSS transition + the dead halfway-debug block, which is **not** ported). Style vars (stroke widths, gradient stop color) via inline style + the same `.tile-button` global CSS rules moved to a CSS module.
- [ ] `LevelRenderer.tsx`: container `onClick` hit-tests via `node.containsPoint` (core), calls rotate + solve check, plays sound, bumps `renderTrigger`. Editor connection overlay gated behind `isEditorMode` (built in P4 but prop-compatible now).
- [ ] Playwright: on `/play` (seeded) at least N `[data-tile]` elements render; clicking one changes its `transform`.
- [ ] Commit: `feat(web): tile + level renderer with motion`.

### Task 2.4: GameHeader + WinModal + celebration
**Files:** `apps/web/src/components/GameHeader.tsx`, `src/components/WinModal.tsx`. Source: `GameHeader.svelte`, `WinModal.svelte`.

- [ ] Port header (timer/moves/back). `WinModal`: the `celebrationStage` 0–5 sequence becomes a Motion variant timeline (staged via `useEffect` timeouts or `motion` `transition.delay`). Stars/stats/buttons animate in.
- [ ] Playwright: covered in 2.5 solve flow.
- [ ] Commit: `feat(web): game header + win celebration`.

### Task 2.5: Play route (the core loop)
**Files:** `apps/web/src/routes/Play.tsx`. Source: `routes/(app)/play/+page.svelte`.

- [ ] Port the full play controller: width/height from window, session from `currentGameSession`, `new Level(...)` from core, timer/moves, autosave, `tileClick` → solve → `handleLevelComplete` → celebration, `handleNextLevel`/`handlePlayAgain`, resize. Replace `goto` with `useNavigate`, `onMount` with `useEffect`.
- [ ] Playwright (the headline test): set `window.__tileloop.seed` to a value known to produce a small solvable board; start a campaign session; on `/play`, solve by rotating each tile to 0 turns (drive via exposed test helper `window.__tileloop.solve()` that rotates nodes to solution, OR compute clicks); assert WinModal appears with stats. Add `data-testid`s as needed.
- [ ] Commit: `feat(web): play route + solve→win e2e`.

### Task 2.6: Menu + Campaign + Sidebar + Settings + Appearance + Audio
**Files:** `apps/web/src/routes/Menu.tsx`, `routes/Campaign.tsx`, `src/components/{Sidebar,GameSettings,AppearanceModal,AudioPlayer,TilingCard}.tsx`. Source: respective Svelte files.

- [ ] Port menu (mode selection → `startGameSession` → navigate `/play`), campaign (chapter/level grid from `campaignProgress`, lock state), Sidebar nav, GameSettings (toggles → `gameSettings` store), AppearanceModal (tileset per shape → `gameAppearance`), AudioPlayer (Web Audio impl of `SoundEngine`, music loop, respects `audioStore`), TilingCard (uses `dangerouslySetInnerHTML`).
- [ ] Playwright: menu→campaign→start level→/play; toggle sound in settings → reload → persists (localStorage); switch tileset → tiles re-render with new path.
- [ ] Commit: `feat(web): menu, campaign, settings, appearance, audio`.

### Task 2.7: Web E2E hardening + Vercel build
**Files:** `apps/web/tests/*.spec.ts`, `apps/web/vercel.json` (or root), `apps/web/README.md`.

- [ ] Flesh out the suite to cover §8 of the spec; ensure all green headless. Add `data-testid`s where selectors are brittle.
- [ ] `vite build` produces a static bundle; configure Vercel (`buildCommand`, `outputDirectory apps/web/dist`). Verify `vite preview` + `playwright test` against the preview build.
- [ ] Verify: `npx turbo run build test` green. Commit: `test(web): full e2e suite + vercel build`.

---

## Phase 3 — Native app (Expo)

### Task 3.1: Native platform wiring + tileset bundling
**Files:** `apps/native/src/platform/nativePlatform.ts`, `apps/native/scripts/gen-tilesets.mjs`, generated `apps/native/assets/tilesets.gen.ts`.

- [ ] `gen-tilesets.mjs`: read all 372 SVGs from `static_legacy/tilesets`, emit a typed map `{ "loop/4/0110": "<svg…>" }`. Wire as a prebuild script.
- [ ] `nativePlatform.ts`: `configurePlatform({ rng, clock, storage: asyncStorageAdapter, loadTileSvg: (t,s,c)=>tilesets[`${t}/${s}/${c}`] })`.
- [ ] Verify: typecheck; the generated map has 372 entries (assert in a node test).
- [ ] Commit: `feat(native): platform wiring + bundled tileset svgs`.

### Task 3.2: Native Tile + LevelRenderer (react-native-svg + Moti)
**Files:** `apps/native/src/components/Tile.tsx`, `LevelRenderer.tsx`.

- [ ] `Tile.tsx`: `MotiView` positioned absolutely, animating `rotate`/`scaleX`; renders the prepared SVG via `SvgXml`. Because RN has no CSS cascade, inject stroke/gradient attributes into the SVG string in `prepareTileSvg` (extend the core util with an `inlineStyles` option used by native).
- [ ] `LevelRenderer.tsx`: `Pressable`/touch hit-testing via `node.containsPoint`.
- [ ] Verify: `expo export -p web` renders tiles (smoke); typecheck.
- [ ] Commit: `feat(native): tile + level renderer (rn-svg + moti)`.

### Task 3.3: Native screens (Expo Router) + audio
**Files:** `apps/native/app/{_layout,index,menu,campaign,play}.tsx`, editors later; `src/components/*` ports; `src/audio/expoSound.ts`.

- [ ] Port menu/campaign/play/settings/appearance using RN primitives + NativeWind classes (mirror web structure). Audio via `expo-audio` implementing `SoundEngine`.
- [ ] Verify: `expo export` builds; manual device smoke documented in README (`npx expo run:ios` / `run:android`).
- [ ] Commit: `feat(native): screens + audio`.

### Task 3.4: Native persistence + parity pass
- [ ] Confirm AsyncStorage persistence round-trips (settings/progress) via a dev screen or jest-expo test. Reconcile any RN/web divergence in shared core (should be none).
- [ ] Commit: `feat(native): persistence + parity`.

---

## Phase 4 — Editors

### Task 4.1: Level editor (web)
**Files:** `apps/web/src/routes/LevelEditor.tsx` + connection-overlay in `LevelRenderer`. Source: `routes/(app)/levelEditor/+page.svelte` (407 LOC).

- [ ] Port editor: place/edit connections via the unique-halfway overlay (already prop-stubbed in 2.3), re-canonicalization (preserve idempotency from commit `7058d27`), save/load levels.
- [ ] Playwright: open editor, add a connection, verify overlay updates; round-trip a saved level.
- [ ] Commit: `feat(web): level editor`.

### Task 4.2: Tile editor (web)
**Files:** `apps/web/src/routes/TileEditor.tsx`. Source: `routes/(app)/tileEditor/+page.svelte` (1412 LOC).

- [ ] Port the tile authoring tool (the largest single screen). Decompose into sub-components (toolbar, canvas/preview, connection grid, tileset export) rather than one mega-file. Wire to core SVG/geometry utils.
- [ ] Playwright: open tile editor, modify a tile, verify preview reflects change.
- [ ] Commit: `feat(web): tile editor`.

### Task 4.3: Editors on native (if practical)
- [ ] Assess feasibility; port if the touch UX maps cleanly, else document as native-deferred in README. Commit accordingly.

---

## Phase 5 — Cleanup & cutover

### Task 5.1: Delete legacy Svelte/Capacitor/p5
**Files:** remove `src_legacy/`, `static_legacy/` (after assets copied), `android/`, `build/`, `.svelte-kit/`, `svelte.config.js`, `vite.config.js` (root), `capacitor.config.json`, `jsconfig.json`, `MOBILE_SETUP.md`; drop `p5`, `svelte*`, `@capacitor/*`, `svelte-capacitor-store`, `lucide-svelte`, `@sveltejs/*`, `@tailwindcss/forms|typography` (if unused) from deps.

- [ ] Grep to confirm no remaining imports from `src_legacy`/`$lib`/`svelte`. Remove the legacy root `package.json` mobile scripts.
- [ ] Verify: `npx turbo run typecheck build test` green across all packages.
- [ ] Commit: `chore: remove legacy svelte/capacitor/p5 code`.

### Task 5.2: Docs, README, deploy config
- [ ] New root `README.md` (monorepo layout, dev/test/build commands per app), `apps/native/README.md` (Expo run/build), update `vercel.json` for `apps/web`. Port any still-relevant `todo.md` items.
- [ ] Commit: `docs: monorepo readme + deploy config`.

### Task 5.3: Final verification
- [ ] `npm install` clean; `turbo build` builds web + native(web export); `turbo test` (Vitest core + Playwright web) all green; `expo-doctor` clean. Record results in the PR description.
- [ ] Commit/PR: `feat: complete React/React Native + TypeScript migration`.

---

## Self-review notes
- **Spec coverage:** monorepo (0.x), core decouple + Rng/Clock/Storage/loadTileSvg (1.1,1.10,2.1,3.1), seq (1.2), Zustand stores + persist (1.4,1.10), engine port (1.3–1.7), data (1.8), SVG util (1.9), web game + Motion (2.x), Playwright + determinism (1.1,2.1,2.5,2.7), native + Moti (3.x), editors (4.x), dead-code removal (1.3,1.5,1.6,2.3,5.1), TS throughout, cleanup/cutover (5.x). All spec sections mapped.
- **Determinism** seam (`mulberry32` + `window.__tileloop.seed`) is introduced in 1.1 and consumed by the first E2E in 2.1/2.5, so web tests are stable from the start.
- **Types consistency:** `Rng.next()`, `Clock.now()/iso()`, `Storage.getItem/setItem/removeItem`, `LoadTileSvg`, `prepareTileSvg`/`tileStyleParams`, `configStore.getState()` names are used consistently across tasks.
