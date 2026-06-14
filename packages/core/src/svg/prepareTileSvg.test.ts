import { describe, it, expect } from 'vitest';
import { prepareTileSvg, tileStyleParams } from './prepareTileSvg';
import { RegularPolygon } from '../tiling/Polygon';
import { Vector } from '../geometry/Vector';

const SAMPLE = `<svg viewBox="0 0 600 600" width="600" height="600">
  <linearGradient id="redGradient"><stop id="gradientStop2" offset="20%"/></linearGradient>
  <mask id="pathMask"></mask>
  <filter id="blur"><feGaussianBlur/></filter>
  <path fill="url(#redGradient)" mask="url(#pathMask)"/>
</svg>`;

describe('prepareTileSvg', () => {
  it('namespaces ids per node and strips filters', () => {
    const out = prepareTileSvg(SAMPLE, {
      tileset: 'loop',
      nodeId: 'tile-1',
      scale: 60,
      scalePolygon: 1.4142,
    });
    expect(out).toContain('id="pathMask_loop_tile-1"');
    expect(out).toContain('url(#pathMask_loop_tile-1)');
    expect(out).toContain('id="redGradient_loop_tile-1"');
    expect(out).toContain('url(#redGradient_loop_tile-1)');
    expect(out).not.toContain('<filter');
  });

  it('rewrites the viewBox size', () => {
    const out = prepareTileSvg(SAMPLE, {
      tileset: 'loop',
      nodeId: 'x',
      scale: 60,
      scalePolygon: 2,
    });
    // 60 * 2 + 1 = 121
    expect(out).toContain('width="121px"');
    expect(out).toContain('height="121px"');
  });

  it('produces different namespaces for different nodes', () => {
    const a = prepareTileSvg(SAMPLE, { tileset: 'loop', nodeId: 'a', scale: 60, scalePolygon: 1 });
    const b = prepareTileSvg(SAMPLE, { tileset: 'loop', nodeId: 'b', scale: 60, scalePolygon: 1 });
    expect(a).toContain('pathMask_loop_a');
    expect(b).toContain('pathMask_loop_b');
    expect(a).not.toContain('pathMask_loop_b');
  });
});

const REALISTIC = `<svg viewBox="0 0 600 600" width="600" height="600">
  <radialGradient id="redGradient">
    <stop id="gradientStop1" offset="7%" style="stop-color:#1e293b;stop-opacity:1"/>
    <stop id="gradientStop2" offset="20%" style="stop-color:#1e293b;stop-opacity:1"/>
  </radialGradient>
  <mask id="pathMask"><path fill="none" stroke="white" stroke-width="2" d="M0 0"/></mask>
  <polygon fill="white" id="base-polygon" stroke="none" points="0,0"/>
  <rect fill="url(#redGradient)" mask="url(#pathMask)"/>
</svg>`;

describe('prepareTileSvg inline (native)', () => {
  it('bakes base transparency, line width, and loop colour into the markup', () => {
    const out = prepareTileSvg(REALISTIC, {
      tileset: 'loop',
      nodeId: 'n1',
      scale: 60,
      scalePolygon: 1.4142,
      inline: { borderStrokeWidth: 1.4, lineStrokeWidth: 22.6, stop1Color: '#000000' },
    });
    expect(out).toContain('fill="transparent" id="base-polygon" stroke="#888"');
    expect(out).toContain('stroke-width="22.6"'); // mask path thickened
    expect(out).not.toContain('stroke-width="2"');
    // '#000000' sentinel renders white
    expect(out).toContain('stop-color:#ffffff');
  });

  it('uses the matched colour when provided', () => {
    const out = prepareTileSvg(REALISTIC, {
      tileset: 'loop',
      nodeId: 'n2',
      scale: 60,
      scalePolygon: 1.4142,
      inline: { borderStrokeWidth: 1.4, lineStrokeWidth: 22.6, stop1Color: '#22c55e' },
    });
    expect(out).toContain('stop-color:#22c55e');
  });
});

describe('tileStyleParams', () => {
  it('computes scalePolygon for a square', () => {
    const sq = new RegularPolygon({ centroid: new Vector(0, 0), n: 4, angle: 0 });
    const style = tileStyleParams(sq);
    expect(style.scalePolygon).toBeCloseTo(2 / (2 * Math.sin(Math.PI / 4)), 6);
    expect(style.transforms).toContain('rotate(');
  });
});
