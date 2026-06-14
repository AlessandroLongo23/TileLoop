# TileLoop — Native (Expo)

React Native app (Expo Router + NativeWind + Moti + react-native-svg) that shares
all game logic with `@tileloop/core`. Replaces the old Capacitor/Android shell.

## Develop

```bash
# from the repo root
npm install

# generate the bundled tileset SVG map (P3)
npm run prebuild:tilesets -w native

# start Metro (choose a target in the CLI)
npm run start -w native

# run on a device/simulator
npm run ios -w native       # requires Xcode
npm run android -w native   # requires Android SDK
```

## Verify without a device

```bash
npm run typecheck -w native     # tsc
npm run doctor -w native        # expo-doctor (SDK/version checks)
npm run export:web -w native    # Metro web bundle (validates resolution + nativewind)
```

## Monorepo notes

- `metro.config.js` adds the repo root to `watchFolders` and both `node_modules`
  paths so `@tileloop/core` resolves from the workspace.
- NativeWind is pinned to `4.1.23` (with `react-native-css-interop@0.1.22`) for
  Expo SDK 52 / Reanimated 3.16 compatibility; newer css-interop requires
  `react-native-worklets` (Reanimated 4). These are also pinned via root
  `overrides` so a single hoisted copy resolves from `expo-router`.
