# TileLoop — Svelte → React / React Native Migration & TypeScript Cleanup

**Date:** 2026-06-14
**Status:** Approved design (pending spec review)

## 1. Goal

Migrate the entire TileLoop game from Svelte 5 / SvelteKit to React, replacing
Capacitor with a true React Native (Expo) app, using **Motion** (framer-motion)
for web animation and **Moti** (Reanimated) for native animation, with the whole
web app verified by **Playwright**. The migration is also a cleanup: the codebase
moves to **TypeScript** and **dead code is removed**.

Behavior-preserving: no gameplay or feature changes. Open items in `todo.md`
stay open.

## 2. Context — what TileLoop is today

An Infinity-Loop-style tiling puzzle. The player rotates regular-polygon tiles
(triangles/squares/hexagons) until every edge connection matches its neighbor;
matched edges light up and a solved board triggers a celebration.

Current stack (~10k LOC):

- **SvelteKit** (static adapter, Vercel) + **Svelte 5 runes**.
- **Game engine = plain JS classes**, coupled to Svelte only via `get(store)`
  config reads (22 call sites) and `svelte/store`. No `$app/*` imports in the
  engine. Files: `Vector`, `Polygon`(+`RegularPolygon`/`DualPolygon`/`StarPolygon`/
  `IsotoxalPolygon`), `Tiling`, `TilingGenerator` (1154 LOC), `Level`, `Effect`,
  plus `geometry`, `math`, `optimizing`, `levelLoader`, and `extensions.js`
  (Array/String prototype helpers used throughout the engine).
- **Rendering = DOM + SVG + CSS transforms.** `Tile.svelte` `fetch`es one of 372
  SVG files from `/static/tilesets/{tileset}/{sides}/{connections}.svg`, rewrites
  ids/viewBox/filters, positions it absolutely, and rotates via a CSS
  `transition-transform`. **p5.js is dead** — `Canvas.svelte` is 100% commented
  out and the p5 `show()/showIslamic()` methods are unreachable from the live app.
- **State = Svelte `writable` stores** + `svelte-capacitor-store` persistence
  (Capacitor Preferences on native, localStorage on web). Stores: `configuration`,
  `gameProgress` (694 LOC: campaign/chapters/levels, sessions, autosave),
  `gameAppearance` (tilesets per shape), `tilingRules` (901 LOC of rule data),
  `campaign`, `audio`, `data` (themes).
- **Routes:** `menu`, `campaign`, `play`, `levelEditor` (407 LOC),
  `tileEditor` (1412 LOC), `test` (scratch).
- **Audio:** `AudioPlayer` + Web Audio `sounds.js`; assets in `/static/sound`.
- **Mobile:** Capacitor → Android only.

## 3. Target architecture — monorepo with a shared core

Turborepo + npm workspaces. Only `core` is shared; React-DOM and React-Native
cannot share component code, so each app owns its UI layer over identical engine
+ state.

```
tileloop/
├── packages/
│   └── core/                      # TypeScript, framework-agnostic (no React/DOM/RN)
│       ├── src/geometry/          # Vector, geometry, math, constants (tolerance)
│       ├── src/tiling/            # Polygon family, Tiling, TilingGenerator, Level, Effect
│       ├── src/state/             # Zustand stores (typed) — see §6
│       ├── src/svg/               # prepareTileSvg(): id-namespace/viewBox/filter math
│       ├── src/platform/          # injected interfaces: Storage, Rng, Clock,
│       │                          #   loadTileSvg, soundEngine
│       ├── src/data/              # tilingRules, themes, chapter config as typed data
│       └── src/util/              # seq (ex-prototype helpers), optimizing, levelLoader
├── apps/
│   ├── web/                       # Vite + React 18 + React Router v6 + Motion + Tailwind 4
│   │   ├── public/tilesets/…      # 372 SVGs + sounds (static)
│   │   ├── src/                   # components, routes, hooks
│   │   └── tests/                 # Playwright E2E
│   └── native/                    # Expo + Expo Router + react-native-svg + Moti + NativeWind
│       └── assets/tilesets.gen.ts # build-generated SVG-string map (Metro-bundled)
├── turbo.json
└── package.json
```

## 4. Technology mapping

| Concern        | Now (Svelte)            | Web (React)                       | Native (Expo)                 |
|----------------|-------------------------|-----------------------------------|-------------------------------|
| Framework      | SvelteKit               | React 18 + Vite                   | React Native + Expo           |
| Language       | JS                      | **TypeScript**                    | **TypeScript**                |
| Routing        | file-based              | React Router v6                   | Expo Router                   |
| State          | `svelte/store`          | Zustand (from `core`)             | Zustand (same)                |
| Persistence    | svelte-capacitor-store  | Zustand `persist` → localStorage  | Zustand `persist` → AsyncStorage |
| Styling        | Tailwind 4              | Tailwind 4                        | NativeWind                    |
| Tile render    | `{@html svg}`           | `dangerouslySetInnerHTML`         | `react-native-svg` `SvgXml`   |
| Animation      | CSS transitions         | **Motion** (framer-motion)        | **Moti** (Reanimated)         |
| Icons          | lucide-svelte           | lucide-react                      | lucide-react-native           |
| Audio          | Web Audio (`sounds.js`) | Web Audio (shared logic)          | expo-audio                    |
| Mobile shell   | Capacitor / Android     | —                                 | Expo (iOS + Android)          |
| Tests          | none                    | **Playwright E2E**                | Playwright (web) + Expo smoke |
| Deploy         | Vercel (static)         | Vercel (Vite build)               | EAS / Expo                    |

## 5. Decoupling the engine (the crux)

1. **Config inversion.** Engine classes currently call `get(configStore)`. In
   `core`, stores are **Zustand**; logic reads `configStore.getState()`,
   components use the `useStore` hook. `tolerance` and other consts move to
   `geometry/constants`.

2. **Determinism for tests.** The engine uses `Math.random()` and `Date.now()`
   for generation, ids, and shuffle. Route these through an injectable `Rng` and
   `Clock` (`core/platform`). Production injects real implementations; **Playwright
   injects a seeded `Rng`** so a known-solvable board renders deterministically —
   this is what makes "everything works in Playwright" verifiable, not flaky.
   A test hook (e.g. `?seed=` query / `window.__tileloop.seed`) sets the seed.

3. **Asset loading abstraction.** `loadTileSvg(tileset, sides, connections)` is
   injected per platform: web `fetch`es `/tilesets/…`; native reads a
   build-generated SVG-string map (`tilesets.gen.ts`) so Metro bundles all 372
   files. The id/viewBox/filter post-processing math lives once in `core/svg`.

4. **Prototype helpers → typed pure functions.** `extensions.js` (`pickRandom`,
   `simmetrize`, `cycleToMinimumLexicographicalOrder`, `rotate`, `getSimmetries`,
   `capitalize`, …) is reimplemented as a typed `core/util/seq` module with
   identical semantics. Call sites in the engine are updated during the TS port
   (no global `Array.prototype` augmentation). `pickRandom` takes the injected
   `Rng`.

## 6. State — Zustand stores (in `core`, typed)

One Zustand store per current Svelte store, same shape/semantics:

- `configStore` — tiling selection, scale, lineWidth, colorParams, tolerance-adjacent params.
- `gameProgressStore` — chapters/levels, stars, current session, current game state, autosave; **persisted**.
- `gameAppearanceStore` — per-shape tileset selection; **persisted**.
- `tilingRulesStore` / `data` — static rule + theme data (typed, mostly read-only).
- `campaignStore`, `audioStore` (music/sound/volume; **persisted**).

Persistence uses Zustand `persist` with a platform `Storage` adapter
(localStorage on web, AsyncStorage on native) — replacing
`svelte-capacitor-store` and `MobileStorageAdapter`. Existing localStorage keys
(`tileloop-*`) are read on first run for backward compatibility on web.

## 7. Rendering & animation details

- `<Tile>` (per platform) takes the same `node` from the engine. Web: processed
  SVG via `dangerouslySetInnerHTML` inside `motion.div`, `animate={{ rotate,
  scaleX }}` replacing the CSS transition. Native: `SvgXml` inside `MotiView`.
- `<LevelRenderer>` maps `level.tiling.nodes` → `<Tile>`, handles hit-testing
  (point-in-polygon already in engine) and click→rotate→solve-check.
- **Win celebration** (`celebrationStage` 0–5, staged timeouts) → Motion variants
  / Moti sequence driven by a small state machine.
- **Page transitions** (open TODO) added via `AnimatePresence` / Moti.
- Editor connection-point overlays port directly (absolute-positioned hit targets).

## 8. Testing — Playwright

Suite runs against the web preview server with a seeded RNG:

- App boots; menu renders; navigation between menu/campaign/play works.
- Start campaign → `play` renders N tiles (SVG present in DOM).
- Click a tile → its transform/rotation changes; move counter increments.
- Seeded solvable board → solve it → win modal appears with stats.
- Settings: toggle sound/music/autosave → persists across reload (localStorage).
- Appearance: switch tileset → tiles re-render with new set.
- Phase 4: level editor + tile editor core flows.

Engine also gets focused **unit tests** in `core` (solve detection, generation
determinism under a fixed seed, canonicalization/mirroring — guards the bug fixed
in commit `0f6f70a`).

## 9. Phasing (each ends at a verifiable milestone)

- **P0 — Scaffold.** Turborepo, npm workspaces, `core`/`web`/`native` skeletons,
  TS configs, Tailwind + NativeWind, Playwright config, Turbo pipelines, root
  scripts.
- **P1 — Core (TS).** Port + decouple engine and state into `core`; seedable
  `Rng`/`Clock`; `seq` helpers; Zustand stores; **unit tests green**.
- **P2 — Web game.** Player-facing routes (layout, menu, campaign, play,
  GameHeader, LevelRenderer/Tile, WinModal, GameSettings, AppearanceModal, audio,
  Sidebar, ui/* primitives) + Motion. **Playwright E2E green.** Deployable to Vercel.
- **P3 — Native game.** Expo app on the same `core`: react-native-svg tiles, Moti
  animation, NativeWind, AsyncStorage; generated tileset bundle; **builds + smoke
  on iOS/Android**.
- **P4 — Editors.** `levelEditor` + `tileEditor` (web first; native if practical);
  Playwright coverage of core editor flows.
- **P5 — Cleanup & cutover.** Remove all Svelte/SvelteKit/Capacitor/p5 code and
  deps; finalize Vercel + Expo config; update README/docs; delete `android/`,
  `build/`, `.svelte-kit/`.

## 10. Dead code removed (verified against references before deletion)

- `Canvas.svelte` (fully commented) and the `p5` dependency.
- Dead p5-canvas methods: `Polygon.show/showIslamic`, `Tiling.show` (only called
  from the commented p5 sketch — confirm no editor reference, then drop).
- Commented blocks (e.g. the halfway-debug block in `Tile.svelte`, `// configs`
  in layout), the scratch `test` route.
- `svelte-capacitor-store`, `@capacitor/*`, `MobileStorageAdapter`,
  `migrateLocalStorageToMobile` (replaced by Zustand persist + Storage adapter).

Each deletion is checked for live references first; anything that turns out to be
load-bearing is surfaced rather than removed.

## 11. Explicit non-goals

- No new gameplay/features; `todo.md` items stay open.
- No redesign of visuals beyond what the framework change requires.
- p5.js is not reintroduced.

## 12. Risks & mitigations

- **TilingGenerator (1154 LOC, dense geometry) typing** — type the data shapes
  and public surface; allow narrow `any` at the gnarliest internals rather than
  blocking on perfect types; lean on engine unit tests to prove behavior parity.
- **Native SVG fidelity** — `react-native-svg` `SvgXml` doesn't apply CSS cascade
  the way the DOM does; the web styling (stroke widths, gradient stops via CSS
  vars) is reproduced by injecting attributes into the SVG string in `core/svg`
  before handing it to `SvgXml`.
- **Determinism** — without seeded RNG the E2E tests would be flaky; the injected
  `Rng` is built in P1 so P2 tests are stable from the start.
- **Scope size** — phasing guarantees a shippable, Playwright-green web build at
  P2 even before native/editors land.
