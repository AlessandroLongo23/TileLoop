import { describe, it, expect } from 'vitest';
import { buildPuzzle, isSolved, tap, solveSteps, starsFor, edgeValue, startOf, restart, type Puzzle, type PuzzleSpec } from './puzzle';
import { tileArt, strokeFor } from './art';
import { atlasTilings } from '../data/atlasTilings';
import { campaignLevel, dailyLevel, endlessLevel, chapters, chapterRules, levelsIn, ENDLESS_BLOCK, SECTION_GATE, SECTION_LEVELS } from './levels';
import { levelUnlocked, sectionOpen, chapterUnlocked, nextCampaignLevel, type Progress } from './progress';

const campaign = chapters.flatMap((c) =>
  Array.from({ length: levelsIn(c.id) }, (_, i) => campaignLevel(c.id, i + 1)),
);
const others = [
  ...Array.from({ length: 30 }, (_, i) => dailyLevel(`2026-11-${String(i + 1).padStart(2, '0')}`)),
  ...Array.from({ length: 60 }, (_, i) => endlessLevel(i + 1)),
];
const all = [...campaign, ...others];
const build = (d: (typeof all)[number]) => buildPuzzle(d.spec, d.seed);

function pieces(p: Puzzle): number {
  const seen = new Set<number>();
  const stack = [0];
  while (stack.length) {
    const i = stack.pop()!;
    if (seen.has(i)) continue;
    seen.add(i);
    for (const nb of p.tiles[i].neighbors) if (nb) stack.push(nb.tile);
  }
  return p.tiles.length - seen.size + 1;
}

describe('puzzle', () => {
  it('is the same board for the same seed', () => {
    const a = build(campaign[20]);
    const b = build(campaign[20]);
    expect(a.tiles.map((t) => [t.n, t.spin, ...t.conns])).toEqual(b.tiles.map((t) => [t.n, t.spin, ...t.conns]));
  });

  it.each(all.map((d) => [JSON.stringify(d.ref), d] as const))('%s is a fair board', (_, d) => {
    const p = build(d);
    expect(p.tiles.length).toBe(d.spec.tiles);
    expect(pieces(p)).toBe(1);
    expect(isSolved(p)).toBe(false);
    expect(p.par).toBeGreaterThan(0);
    // every tile carries a line
    for (const t of p.tiles) expect(t.conns.some((v) => v > 0)).toBe(true);
    // links: same size (mirrors aside), one each way, no loops
    for (const t of p.tiles) {
      if (t.link === null) continue;
      const dst = p.tiles[t.link];
      if (!t.linkMirror) expect(dst.n).toBe(t.n);
      expect(dst.linkedFrom).toBe(t.id);
      const seen = new Set<number>();
      for (let c: number | null = t.id; c !== null; c = p.tiles[c].link) {
        expect(seen.has(c)).toBe(false);
        seen.add(c);
      }
    }
    // the computed solution solves it, in exactly par taps
    const steps = solveSteps(p);
    expect(steps.length).toBe(p.par);
    for (const s of steps) tap(p, s);
    expect(isSolved(p)).toBe(true);
    expect(solveSteps(p).length).toBe(0);
    for (const t of p.tiles) expect(tileArt(t).paths.length).toBeGreaterThan(0);
  });

  it.each(campaign.filter((_, i) => i % 7 === 0).map((d) => [JSON.stringify(d.ref), d] as const))(
    '%s: a tile drawn turned (or mirrored) shows its lines on the sides the rules say',
    (_, d) => {
      const p = build(d);
      for (const t of p.tiles) {
        const step = t.n / t.turns;
        const a = (2 * Math.PI) / t.turns;
        t.mids.forEach((m, j) => {
          // the board turns a tile's drawing by +360/turns degrees per step (y points down)
          const r = { x: m.x * Math.cos(a) - m.y * Math.sin(a), y: m.x * Math.sin(a) + m.y * Math.cos(a) };
          const k = (j + step) % t.n;
          expect(Math.hypot(r.x - t.mids[k].x, r.y - t.mids[k].y)).toBeLessThan(1e-6);
          if (t.axis !== null) {
            const u = { x: Math.cos(t.axis), y: Math.sin(t.axis) };
            const s = m.x * u.x + m.y * u.y;
            const q = t.mids[t.mirror![j]];
            expect(Math.hypot(2 * s * u.x - m.x - q.x, 2 * s * u.y - m.y - q.y)).toBeLessThan(1e-6);
          }
        });
      }
    },
  );

  it('a locked tile does not turn', () => {
    const p = build(campaign[40]);
    const locked = p.tiles.find((t) => t.locked);
    if (locked) expect(tap(p, locked.id)).toEqual([]);
  });

  it('gives stars against par', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(15, 10)).toBe(2);
    expect(starsFor(16, 10)).toBe(1);
  });
});

describe('Atlas tilings (stars and isotoxal tiles)', () => {
  for (const t of atlasTilings)
    it(`${t.name} builds a connected board that its solution solves`, () => {
      const p = buildPuzzle({ rule: `atlas:${t.id}`, tiles: 24, density: 0.55, links: 0.1 }, 7);
      expect(p.tiles.length).toBe(24);
      expect(pieces(p)).toBe(1);
      expect(isSolved(p)).toBe(false);
      for (const id of solveSteps(p)) tap(p, id);
      expect(isSolved(p)).toBe(true);
      // a tile turns only into orientations its outline allows
      for (const x of p.tiles) expect(x.n % x.turns).toBe(0);
    });

  it('stars and isotoxal tiles have fewer turns than edges', () => {
    const turns = atlasTilings.flatMap((t) => buildPuzzle({ rule: `atlas:${t.id}`, tiles: 24 }, 1).tiles.map((x) => `${x.n}/${x.turns}`));
    expect(turns).toContain('8/4'); // four-point star, isotoxal octagon
    expect(turns).toContain('4/2'); // rhomb
  });
});

describe('new mechanics: every board can be solved', () => {
  const rules = ['4-4-0,4/r90/m(v2)', '6/r60/r(h1)', '6-4-3/m30/r(c2)', '3/r60/r(h2)', `atlas:${atlasTilings[0].id}`];
  const boards = (extra: Partial<PuzzleSpec>, count = 60) =>
    Array.from({ length: count }, (_, i) =>
      buildPuzzle({ rule: rules[i % rules.length], tiles: 10 + (i % 5) * 6, density: 0.55, ...extra }, 1000 + i),
    );
  const solves = (p: Puzzle) => {
    for (const id of solveSteps(p)) tap(p, id);
    return isSolved(p);
  };

  it('reverse links: the follower turns the other way, and every board solves', () => {
    const all = boards({ links: 0.25, reverse: 1 });
    const driver = all.flatMap((p) => p.tiles).find((t) => t.link !== null)!;
    expect(driver.linkDir).toBe(-1);
    for (const p of all) {
      expect(isSolved(p)).toBe(false);
      expect(solves(p)).toBe(true);
    }
  });

  it('reverse links: tapping a driver turns its follower back one step', () => {
    const p = boards({ links: 0.25, reverse: 1 }, 1)[0];
    const d = p.tiles.find((t) => t.link !== null)!;
    const f = p.tiles[d.link!];
    const before = f.spin;
    tap(p, d.id);
    expect(f.spin).toBe(before - 1);
  });

  for (const gears of [0.2, 1])
    it(`gears (${gears * 100}% of tiles): a tap turns the neighbours too, and every board solves`, () => {
      for (const p of boards({ gears })) {
        expect(p.tiles.some((t) => t.gear)).toBe(true);
        expect(isSolved(p)).toBe(false);
        expect(solves(p)).toBe(true);
      }
    });

  it('held followers: cannot be tapped, only their driver moves them, and every board solves', () => {
    const all = boards({ links: 0.25, passive: 1 });
    let held = 0;
    for (const p of all) {
      for (const t of p.tiles.filter((x) => x.passive)) {
        held++;
        expect(p.tiles[t.linkedFrom!].link).toBe(t.id);
        expect(t.link).toBe(null);
        expect(tap(p, t.id)).toEqual([]);
      }
      expect(isSolved(p)).toBe(false);
      expect(solves(p)).toBe(true);
    }
    expect(held).toBeGreaterThan(40);
  });

  it('mirrors: the driver flips its held partner across the partner\'s line, and every board solves', () => {
    const all = boards({ mirrors: 0.15 }, 80);
    let pairs = 0;
    for (const p of all) {
      for (const d of p.tiles.filter((x) => x.linkMirror)) {
        pairs++;
        const f = p.tiles[d.link!];
        expect(f.passive).toBe(true);
        expect(f.axis).not.toBe(null);
        const before = f.mirror!.map((_, e) => edgeValue(f, e));
        tap(p, d.id);
        // what showed on side e now shows on its mirror side
        f.mirror!.forEach((m, e) => expect(edgeValue(f, m)).toBe(before[e]));
        tap(p, d.id);
      }
      expect(solves(p)).toBe(true);
    }
    expect(pairs).toBeGreaterThan(80);
  });

  it('fixed hints: start in place, cannot be tapped, and each shows two line ends or more', () => {
    for (const p of boards({ fixed: 0.3 })) {
      const hints = p.tiles.filter((t) => t.locked && t.period > 1);
      expect(hints.length).toBeGreaterThan(0);
      for (const t of hints) {
        expect(t.conns.filter(Boolean).length).toBeGreaterThanOrEqual(2);
        t.conns.forEach((v, e) => expect(edgeValue(t, e)).toBe(v));
        expect(tap(p, t.id)).toEqual([]);
      }
      expect(solves(p)).toBe(true);
    }
  });

  it('restart puts every tile back, flips included', () => {
    const p = buildPuzzle({ rule: '6/r60/r(h1)', tiles: 20, density: 0.58, mirrors: 0.15 }, 3);
    const s = startOf(p);
    const before = p.tiles.map((t) => t.mids.map((_, e) => edgeValue(t, e)).join(''));
    for (const id of solveSteps(p)) tap(p, id);
    restart(p, s);
    expect(p.tiles.map((t) => t.mids.map((_, e) => edgeValue(t, e)).join(''))).toEqual(before);
  });
});

describe('dual tilings: shapes that turn halfway or flip over', () => {
  it('rhombi turn halfway round', () => {
    const p = buildPuzzle({ rule: '6-3-6/m30/r(v4)*', tiles: 24, density: 0.6 }, 1);
    expect(new Set(p.tiles.map((t) => `${t.n}/${t.turns}`))).toEqual(new Set(['4/2']));
  });

  for (const rule of ['4-3-3-3/m90/r(h7)/r(h5)*', '6-3-3-0,3,3-0,3-0,3/r60/r(h7)*', '3-0,3-0,6-0,0,3/r60/m(c1)*'])
    it(`${rule}: pentagons flip, regular cells turn, every board solves`, () => {
      for (let seed = 1; seed <= 15; seed++) {
        const p = buildPuzzle({ rule, tiles: 24, density: 0.56 }, seed);
        expect(pieces(p)).toBe(1);
        expect(p.tiles.some((t) => t.flips)).toBe(true);
        expect(p.tiles.some((t) => t.turns >= 3)).toBe(true);
        for (const t of p.tiles.filter((x) => x.flips)) expect(t.turns).toBe(1);
        const flipper = p.tiles.find((t) => t.flips && !t.locked)!;
        const was = flipper.flip;
        tap(p, flipper.id);
        expect(flipper.flip).toBe(1 - was);
        tap(p, flipper.id);
        for (const id of solveSteps(p)) tap(p, id);
        expect(isSolved(p)).toBe(true);
      }
    });
});

describe('Endless and Daily colours', () => {
  const endless = Array.from({ length: 200 }, (_, i) => endlessLevel(i + 1));
  const world = (d: (typeof endless)[number]) => chapters.find((c) => c.palette === d.palette)!;

  it('five levels in a row share one world, and its tilings', () => {
    for (let i = 0; i < endless.length; i++) {
      const w = world(endless[i]);
      expect(chapterRules(w).map((r) => r.replace('{n}', ''))).toContain(endless[i].spec.rule.replace(/:\d+$/, ':'));
      if (i % ENDLESS_BLOCK) expect(w).toBe(world(endless[i - 1]));
    }
  });

  it('the world changes between blocks, and the first round follows the campaign', () => {
    for (let b = 1; b < endless.length / ENDLESS_BLOCK; b++)
      expect(world(endless[b * ENDLESS_BLOCK])).not.toBe(world(endless[b * ENDLESS_BLOCK - 1]));
    expect(Array.from({ length: chapters.length }, (_, b) => world(endless[b * ENDLESS_BLOCK]).id)).toEqual(chapters.map((c) => c.id));
  });
});

describe('multi-scale boards (split tiles)', () => {
  for (const rule of ['split:squares:0.25:1', 'split:squares:0.35:2', 'split:triangles:0.3:3'])
    it(`${rule}: whole and split tiles meet edge to edge, and the board solves`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const p = buildPuzzle({ rule, tiles: 30, density: 0.6 }, seed);
        expect(pieces(p)).toBe(1);
        const kinds = new Set(p.tiles.map((t) => `${t.n}/${t.turns}`));
        // whole tiles: 8 half-sides and 4 turns (squares) or 6 and 3 (triangles); split ones are plain
        expect(kinds).toEqual(rule.includes('squares') ? new Set(['8/4', '4/4']) : new Set(['6/3', '3/3']));
        // every inner edge has exactly one partner of the same length
        for (const t of p.tiles)
          t.neighbors.forEach((nb, e) => {
            if (!nb) return;
            const o = p.tiles[nb.tile];
            const len = (x: typeof t, i: number) => Math.hypot(x.verts[(i + 1) % x.n].x - x.verts[i].x, x.verts[(i + 1) % x.n].y - x.verts[i].y);
            expect(len(t, e)).toBeCloseTo(len(o, nb.edge), 6);
          });
        for (const id of solveSteps(p)) tap(p, id);
        expect(isSolved(p)).toBe(true);
      }
    });
});

describe('phone size', () => {
  // the play area on a 390 x 844 phone, less the header and footer
  const W = 358;
  const H = 600;
  it('every tile of every campaign level is at least 44 points wide (a fingertip)', () => {
    const narrow = campaign.flatMap((d) => {
      const p = build(d);
      const b = p.bounds;
      const s = Math.min(W / (b.maxX - b.minX + 0.2), H / (b.maxY - b.minY + 0.2), 150);
      // a tile's width: twice the distance from its centre to its nearest side
      const w = s * Math.min(...p.tiles.map((t) => 2 * Math.min(...t.verts.map((a, i) => {
        const c = t.verts[(i + 1) % t.n];
        return Math.abs((t.x - a.x) * (c.y - a.y) - (t.y - a.y) * (c.x - a.x)) / Math.hypot(c.x - a.x, c.y - a.y);
      }))));
      return w < 44 ? [`${d.ref.chapter}-${d.ref.level}: ${w.toFixed(0)}pt`] : [];
    });
    expect(narrow).toEqual([]);
  });
});

describe('tile drawings', () => {
  it('every tile of every level keeps its separate lines a line-width apart', () => {
    const boards = [
      ...all.map((d) => build(d)),
      ...Array.from({ length: 40 }, (_, i) => buildPuzzle({ rule: `split:${i % 2 ? 'triangles' : 'squares'}:0.3:${i}`, tiles: 30, density: 0.6 }, i)),
    ];
    const crowded = boards.flatMap((p) => p.tiles.filter((t) => tileArt(t, strokeFor(p)).crowded).map((t) => t.conns.join('')));
    expect(crowded).toEqual([]);
  });
});

describe('the journey', () => {
  const empty = (): Progress => ({ campaign: {}, daily: { streak: 0, last: null, done: [] }, endless: { level: 1 }, seenIntros: [] });
  const solve = (p: Progress, level: number, stars: number) => (p.campaign[`1-${level}`] = { stars, best: 1 });

  it('chapter 1 has five sections of ten levels, each growing towards its finale', () => {
    expect(levelsIn(1)).toBe(50);
    for (let s = 0; s < 5; s++) {
      const sizes = Array.from({ length: SECTION_LEVELS }, (_, i) => campaignLevel(1, s * SECTION_LEVELS + i + 1).spec.tiles);
      expect(sizes[9]).toBe(Math.max(...sizes)); // the finale is the biggest
      expect(sizes[7]).toBeLessThan(sizes[6]); // the breather
    }
  });

  it('levels open in order; the next section waits for 18 dots', () => {
    const p = empty();
    expect(levelUnlocked(p, 1, 1)).toBe(true);
    expect(levelUnlocked(p, 1, 2)).toBe(false);
    for (let l = 1; l <= 10; l++) solve(p, l, 1);
    expect(sectionOpen(p, 1, 1)).toBe(false); // 10 dots
    expect(nextCampaignLevel(p)).toEqual({ chapter: 1, level: 10 }); // replay for dots, latest first
    for (let l = 1; l <= 8; l++) solve(p, l, 2);
    expect(sectionOpen(p, 1, 1)).toBe(true); // 18 dots
    expect(levelUnlocked(p, 1, 11)).toBe(true);
    expect(nextCampaignLevel(p)).toEqual({ chapter: 1, level: 11 });
  });

  it('chapter 2 opens with the dots of chapter 1\'s last section', () => {
    const p = empty();
    for (let l = 1; l <= 50; l++) solve(p, l, 2);
    expect(chapterUnlocked(p, 2)).toBe(true);
    for (let l = 41; l <= 50; l++) solve(p, l, 1);
    expect(chapterUnlocked(p, 2)).toBe(false);
    expect(SECTION_GATE).toBe(18);
  });
});
