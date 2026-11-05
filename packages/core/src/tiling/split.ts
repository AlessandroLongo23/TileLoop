import type { Pt } from '../game/puzzle';
import { tileNode, type TileNode } from './atlasPatch';

/**
 * Multi-scale boards, after Christopher Carlson's multi-scale Truchet tiles. Some tiles of a square or
 * triangle grid split into four half-size copies. Every whole tile counts its sides as two half-sides,
 * so it carries two line ends per side (at 1/4 and 3/4), and each one meets a small tile edge to edge.
 * Rule: `split:<squares|triangles>:<share split>:<salt>`.
 */
export function splitNodes(rule: string, want: number): TileNode[] {
  const [, kind, shareText, salt] = rule.split(':');
  const share = Number(shareText);
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const out: TileNode[] = [];
  const place = (corners: Pt[], key: string) => {
    const k = corners.length;
    const m = corners.map((c, i) => mid(c, corners[(i + 1) % k]));
    if (hash(`${key}:${salt}`) >= share) {
      // whole: corners and side midpoints, so each half-side is an edge of its own
      out.push(tileNode(corners.flatMap((c, i) => [c, m[i]])));
      return;
    }
    // split into four half-size copies
    for (let i = 0; i < k; i++) {
      const prev = m[(i - 1 + k) % k];
      if (k === 3) out.push(tileNode([corners[i], m[i], prev]));
      else out.push(tileNode([corners[i], m[i], centre(corners), prev]));
    }
    if (k === 3) out.push(tileNode(m));
  };

  if (kind === 'squares') {
    let r = 1;
    while ((2 * r + 1) ** 2 * (1 + 3 * share) < want) r++;
    for (let i = -r; i <= r; i++)
      for (let j = -r; j <= r; j++)
        place(
          [
            { x: i - 0.5, y: j - 0.5 },
            { x: i + 0.5, y: j - 0.5 },
            { x: i + 0.5, y: j + 0.5 },
            { x: i - 0.5, y: j + 0.5 },
          ],
          `${i},${j}`,
        );
  } else {
    const h = Math.sqrt(3) / 2;
    let r = 1;
    while (2 * (2 * r + 1) ** 2 * (1 + 3 * share) < want) r++;
    for (let k = -r; k <= r; k++)
      for (let i = -r; i <= r; i++) {
        const x = i + k / 2;
        const y = k * h;
        place([{ x, y }, { x: x + 1, y }, { x: x + 0.5, y: y + h }], `u${i},${k}`);
        place([{ x: x + 1, y }, { x: x + 1.5, y: y + h }, { x: x + 0.5, y: y + h }], `d${i},${k}`);
      }
  }
  return out;
}

const centre = (v: Pt[]): Pt => ({ x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length });

/** A number in [0, 1) from a string, so the same rule always splits the same tiles. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
