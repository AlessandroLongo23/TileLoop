# TileLoop — Web (React + Vite)

The React web build of TileLoop. Shares all game logic with `@tileloop/core` and
uses Motion (framer-motion) for animation, Tailwind 4 for styling, and Playwright
for end-to-end tests. Deploys to Vercel as a static SPA.

## Develop

```bash
# from the repo root
npm install
npm run dev -w web        # http://localhost:5173
```

## Verify

```bash
npm run typecheck -w web  # tsc
npm run build -w web      # tsc + vite build -> apps/web/dist
npm run test -w web       # Playwright e2e (auto-starts the dev server)
```

## Determinism / test hook

Level generation runs through an injected RNG. Set a seed before load to force a
reproducible board (used by the Playwright suite):

```js
window.__tileloop = { seed: 12345 };
```

When a seed is set (or in dev), `window.__tileloop.solve()` rotates every tile to
its canonical orientation to trigger a solve — used by the solve→win e2e test.

## Deploy (Vercel)

`vercel.json` at the repo root builds this workspace (`npm run build -w web`),
serves `apps/web/dist`, and rewrites client routes to `index.html` (real files
under `/assets`, `/tilesets`, `/sound` are served directly).
