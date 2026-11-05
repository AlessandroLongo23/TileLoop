# Loop

A loop-closing puzzle game set on real tilings of the plane. Turn each tile until every line
meets a line on its neighbour. The game is presented as a hand-printed atlas: each level is a
plate, solving it prints the plate in riso spot inks, and the campaign is ten Books of fifteen
plates, plus a daily plate and an endless appendix.

## Layout

```
packages/core   @tileloop/core: tiling generator, puzzle engine, levels, save data (TypeScript, no UI)
apps/native     the game: Expo + Expo Router for iOS, Android and the web
```

The core builds every level from a seed (`buildPuzzle(spec, seed)` in `packages/core/src/game`),
so a level is the same board on every device. It guarantees a connected board of the requested
size, no empty tiles, a scramble with every movable tile out of place, links that never form a
loop, and an exact par (the fewest taps to the built solution) for the registration marks.

## Develop

```bash
npm install
npm run start -w native        # Expo dev server (press w for web)
npx vitest run --root packages/core
npm run typecheck -w native
```

Metro does not always notice edits in `packages/core`; restart it with `--clear` after changing the core.

Assets are generated, not drawn: `node apps/native/scripts/gen-sounds.mjs` (sound effects) and
`node apps/native/scripts/gen-textures.mjs` (paper and bookcloth).

## Build

- Web: `npm run export:web -w native` → `apps/native/dist` (what `vercel.json` deploys).
- iOS simulator: `npx expo prebuild -p ios` in `apps/native`, then build `ios/Loop.xcworkspace`.
  The `plugins/withPodsDeploymentTarget.js` config plugin carries two fixes current Xcode needs
  with Expo SDK 52; both go away with an SDK upgrade, which store releases will require anyway.
