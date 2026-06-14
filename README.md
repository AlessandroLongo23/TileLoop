# TileLoop

An Infinity-Loop-style tiling puzzle: rotate regular-polygon tiles until every
edge connection matches its neighbour. Migrated from Svelte/SvelteKit/Capacitor
to a TypeScript monorepo with a shared core, a React web app, and a React Native
(Expo) app.

## Layout

```
packages/
  core/        @tileloop/core — framework-agnostic TypeScript: geometry, the
               tiling engine, Zustand state, static data, SVG prep, audio defs.
               Platform bits (rng, clock, storage, asset loading) are injected.
apps/
  web/         React + Vite + Motion (framer-motion) + Tailwind 4. Playwright
               e2e. Deploys to Vercel. Includes the level + tile editors.
  native/      Expo + Expo Router + react-native-svg + Moti + NativeWind.
               Shares @tileloop/core; AsyncStorage persistence.
```

## Develop

```bash
npm install

npm run dev -w web            # web game at http://localhost:5173
npm run start -w native       # Expo (choose a target)
```

## Verify

```bash
npm run typecheck             # turbo: all packages
npm run test                  # turbo: core (vitest) + web (playwright)

npm run build -w web          # web production build
npm run export:web -w native  # native web bundle (validates metro/nativewind)
npm run doctor -w native      # expo-doctor
```

The engine is deterministic under an injected seed (`window.__tileloop.seed` on
web), which is what makes the Playwright suite stable.

## Architecture notes

- **One shared core, two UI layers.** React-DOM and React-Native can't share
  components, so each app owns its UI over identical logic + state in `core`.
- **State** is Zustand (vanilla stores in `core`, `useStore` hooks in the apps),
  persisted via `persist` over an injected storage adapter (localStorage /
  AsyncStorage).
- **Tiles** are SVGs from `apps/web/public/tilesets`; web injects them with
  `dangerouslySetInnerHTML` + CSS, native bakes styling into the string and
  renders with `react-native-svg` (no CSS cascade) — both via `prepareTileSvg`.
- **Animation** is Motion on web and Moti (Reanimated) on native.

See `docs/superpowers/` for the design spec and implementation plan.

## Deploy

`vercel.json` builds the web app (`npm run build -w web` → `apps/web/dist`) as a
static SPA. Native builds use EAS / `expo run:*` (see `apps/native/README.md`).
