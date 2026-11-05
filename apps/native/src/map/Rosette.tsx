import { memo } from 'react';
import Svg, { Circle, Path, G, Polygon, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import type { Palette, Pt } from '@tileloop/core';
import type { Rosette as Geo } from './layout';

export type Look = 'solved' | 'next' | 'later' | 'shut';
export interface SectionState {
  open: boolean;
  beads: { look: Look; dots: number }[];
  /** Dots still needed to open this section, shown in its frame when it is the next to open. */
  need: number | null;
}
export interface ChapterState {
  /** False draws a silhouette: no emblem, every frame dotted. */
  open: boolean;
  sections: SectionState[];
  /** Dots still needed to open the chapter, shown in its medallion. */
  need: number | null;
  /** The line coming in from above: the journey's start (with its ring end), or from the chapter above. */
  enter: 'start' | 'solid' | 'dotted';
  leave: 'solid' | 'dotted' | null;
  /** Dash phase of a dotted line coming in, so it carries on the one above. */
  phase: number;
  /** Fades out downwards: the next chapter, peeking in. */
  fade: boolean;
}

const DOT_R = [0, 2.6, 4.2, 6.5];
const DASH = [2, 4];

/** A level on the map. Solved beads fill from the centre by their dots. */
export function Bead({ p, look, dots, pal, night }: { p: Pt; look: Look; dots: number; pal: Palette; night: boolean }) {
  const { bg, line: ink } = pal;
  const fill = pal.fills[0];
  if (look === 'solved')
    return (
      <G>
        <Circle cx={p.x} cy={p.y} r={6.5} fill={bg} stroke={ink} strokeWidth={1.5} />
        {dots > 0 && <Circle cx={p.x} cy={p.y} r={DOT_R[dots]} fill={fill} stroke={dots === 3 ? ink : 'none'} strokeWidth={1.5} />}
      </G>
    );
  if (look === 'next')
    return (
      <G>
        <Circle cx={p.x} cy={p.y} r={13} fill={fill} fillOpacity={night ? 0.3 : 0.28} />
        <Circle cx={p.x} cy={p.y} r={6.5} fill={bg} stroke={ink} strokeWidth={2} />
      </G>
    );
  if (look === 'later') return <Circle cx={p.x} cy={p.y} r={3.5} fill={bg} stroke={ink} strokeOpacity={0.45} strokeWidth={1.2} />;
  return <Circle cx={p.x} cy={p.y} r={2} fill={ink} fillOpacity={0.2} />;
}

/** "Still needs n dots": a small open bead and the number. */
function Need({ p, n, ink }: { p: Pt; n: number; ink: string }) {
  return (
    <G>
      <Circle cx={p.x - 9} cy={p.y} r={5} fill="none" stroke={ink} strokeOpacity={0.6} strokeWidth={1.3} />
      <SvgText x={p.x + 1} y={p.y + 5.5} fontSize={16} fontFamily="system-ui, -apple-system, Helvetica, Arial" fill={ink} fillOpacity={0.65}>
        {n}
      </SvgText>
    </G>
  );
}

/** One chapter: its medallion and emblem, the five section frames round it, and their beads. */
export const RosetteView = memo(function RosetteView({ id, geo, state, pal, night, width, hidden }: { id: number; geo: Geo; state: ChapterState; pal: Palette; night: boolean; width: number; hidden?: Set<string> }) {
  const ink = pal.line;
  const faint = { stroke: ink, strokeOpacity: night ? 0.3 : 0.24, strokeWidth: 1.2 };
  const shut = { stroke: ink, strokeOpacity: night ? 0.26 : 0.2, strokeWidth: 1.2, strokeDasharray: DASH };
  const solid = { stroke: ink, strokeWidth: 1.8 };
  const line = { stroke: ink, strokeWidth: 1.6 };
  const h = geo.bottom - geo.top;
  const r = geo.r;

  const fills: React.ReactNode[] = [];
  const lines: React.ReactNode[] = [];
  const beads: React.ReactNode[] = [];
  geo.rings.forEach((ring, k) => {
    const sec = state.sections[k];
    const open = state.open && sec.open;
    const last = sec.beads.reduce((a, b, j) => (b.look === 'solved' ? j : a), -1);
    const done = sec.beads.every((b) => b.look === 'solved');
    const base = open ? faint : shut;
    if (done) fills.push(<Path key={`f${k}`} d={ring.fill} fill={pal.fills[0]} fillOpacity={night ? 0.24 : 0.45} />);
    lines.push(<Path key={`s${k}`} d={`M${ring.spoke[0].x} ${ring.spoke[0].y}L${ring.spoke[1].x} ${ring.spoke[1].y}`} fill="none" {...(open ? line : shut)} />);
    ring.outlines.forEach((d, i) => lines.push(<Path key={`o${k}-${i}`} d={d} fill="none" {...(done ? solid : base)} />));
    ring.deco.forEach((d, i) => lines.push(<Path key={`d${k}-${i}`} d={d} fill="none" strokeLinejoin="round" {...(done ? { ...solid, strokeWidth: 1.4 } : base)} />));
    if (ring.bar) {
      const { a, b, kind } = ring.bar;
      const style = { ...(open ? line : shut), ...(kind === 'link' ? {} : { strokeDasharray: [3, 3] }) };
      if (kind === 'mirror') {
        // the axis stands square to the line between the two cells, halfway along it
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const v = { x: (-(b.y - a.y) / l) * 16, y: ((b.x - a.x) / l) * 16 };
        lines.push(<Path key={`b${k}`} d={`M${m.x - v.x} ${m.y - v.y}L${m.x + v.x} ${m.y + v.y}`} fill="none" {...style} />);
      } else lines.push(<Path key={`b${k}`} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} fill="none" {...style} />);
    }
    if (last >= 0 && !done) lines.push(<Path key={`a${k}`} d={ring.arcs[last]} fill="none" strokeLinejoin="round" {...solid} />);
    ring.beads.forEach((p, j) => {
      const b = sec.beads[j];
      const look = !state.open ? 'shut' : hidden?.has(`${k}-${j}`) ? 'later' : b.look;
      beads.push(<Bead key={`${k}-${j}`} p={p} look={look} dots={b.dots} pal={pal} night={night} />);
    });
    if (state.open && sec.need !== null) beads.push(<Need key={`n${k}`} p={ring.centre} n={sec.need} ink={ink} />);
  });

  const enterOpen = state.enter !== 'dotted';
  const em = state.open ? geo.emblem() : null;
  const ek = em ? (r * 0.82 * 0.86) / em.reach : 1;
  return (
    <Svg width={width} height={h} viewBox={`${-width / 2} ${geo.top} ${width} ${h}`}>
      {fills}
      {state.enter === 'start' ? (
        <G>
          <Path d={`M0 ${-r - 46}L0 ${-r}`} fill="none" {...line} />
          <Circle cx={0} cy={-r - 52} r={6} fill={pal.bg} {...line} />
        </G>
      ) : (
        <Path d={`M0 ${geo.top}L0 ${-r}`} fill="none" {...(enterOpen ? line : { ...shut, strokeDashoffset: state.phase })} />
      )}
      {state.leave && <Path d={`M0 ${geo.exit}L0 ${geo.bottom}`} fill="none" {...(state.leave === 'solid' ? line : shut)} />}
      {lines}
      <Circle cx={0} cy={0} r={r} fill={pal.bg} stroke={ink} strokeOpacity={state.open ? 1 : 0.25} strokeWidth={2} />
      {em && (
        <G transform={`scale(${ek}) translate(${-em.c.x} ${-em.c.y})`} stroke={ink} strokeWidth={1.8 / ek} strokeLinecap="round" fill="none">
          {em.tiles.map((t, i) => (
            <G key={i} transform={`translate(${t.x} ${t.y})`}>
              {t.gear && <Polygon points={t.gear} strokeDasharray={[0.07, 0.07]} strokeWidth={(1.8 * 0.7) / ek} />}
              {t.paths.map((d, j) => (
                <Path key={j} d={d} />
              ))}
              {t.rings.map((c, j) => (
                <Circle key={`r${j}`} cx={c.x} cy={c.y} r={c.r} fill={c.solid ? ink : 'none'} />
              ))}
            </G>
          ))}
        </G>
      )}
      {state.need !== null && <Need p={{ x: 0, y: 0 }} n={state.need} ink={ink} />}
      {beads}
      {state.fade && (
        <G>
          <Defs>
            <LinearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.1" stopColor={pal.bg} stopOpacity={0} />
              <Stop offset="0.85" stopColor={pal.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x={-width / 2} y={geo.top} width={width} height={h} fill={`url(#fade${id})`} />
        </G>
      )}
    </Svg>
  );
});
