import { TilingGenerator } from './TilingGenerator';
import { isWithinTolerance } from '../geometry/math';
import { getConfig } from '../state/configStore';
import { Vector } from '../geometry/Vector';
import { platform } from '../platform/context';
import { tilingRules } from '../data/tilingRules';
import {
  pickRandom,
  cycleToMinimumLexicographicalOrder,
  getSimmetries,
  type Simmetry,
} from '../util/seq';
import type { Tiling } from './Tiling';
import type { Polygon, Halfway, TileEffect } from './Polygon';

/** A playable level: a generated tiling with connections, effects and shuffle. */
export class Level {
  id: string;
  tilingGenerator: TilingGenerator;
  size: Vector;
  scale: number;
  tiling: Tiling;
  isFrozen: boolean;
  minMovesToSolve = 0;

  constructor(
    rule: string | null,
    transformSteps: number | null,
    width?: number,
    height?: number,
  ) {
    this.id = `level-${platform.clock.now()}-${platform.rng.next().toString(36).slice(2, 11)}`;

    this.tilingGenerator = new TilingGenerator();
    this.size = new Vector(width, height);
    this.scale = getConfig().scale;

    const resolvedRule =
      rule ||
      pickRandom(
        tilingRules.flatMap((group) => group.rules),
        platform.rng,
      ).rulestring;
    const resolvedSteps =
      transformSteps || pickRandom([1, 2, 3], platform.rng, [0.5, 0.4, 0.1]);
    this.tiling = this.tilingGenerator.generateFromRule(resolvedRule, resolvedSteps);

    this.removeOverflowingTiles();
    this.generateConnections();
    this.convertTilingToTiles();
    this.addEffects();
    this.shuffle();
    this.checkIfSolved();

    this.isFrozen = false;
  }

  removeOverflowingTiles(): void {
    for (let i = this.tiling.nodes.length - 1; i >= 0; i--) {
      const node = this.tiling.nodes[i];
      node.screenPosition = Vector.add(
        Vector.scale(this.size, 0.5),
        Vector.scale(node.centroid, this.scale),
      );

      if (
        node.screenPosition.x > this.size.x - 50 ||
        node.screenPosition.y > this.size.y - 50 ||
        node.screenPosition.x < 50 ||
        node.screenPosition.y < 200
      ) {
        this.tiling.nodes.splice(i, 1);
        continue;
      }
    }
  }

  generateConnections(): void {
    const uniqueHalfways: { a: Halfway; b: Halfway | null }[] = [];
    for (const node of this.tiling.nodes) {
      for (const halfway of node.halfways) {
        const existing = uniqueHalfways.find((h) => isWithinTolerance(h.a, halfway));
        if (!existing) {
          uniqueHalfways.push({ a: halfway, b: null });
        } else {
          existing.b = halfway;
        }
      }
    }

    for (const h of uniqueHalfways) {
      if (h.b) {
        const connection = pickRandom([0, 1, 2], platform.rng, [0.45, 0.45, 0.1]);
        h.a.connections = connection;
        h.b.connections = connection;
      } else {
        h.a.connections = 0;
      }
    }
  }

  convertTilingToTiles = (): void => {
    if (!this.tiling || !this.tiling.nodes) {
      console.warn('No this.tiling nodes available');
      return;
    }

    for (const node of this.tiling.nodes) {
      const [tileType, mirrored, turns, simmetries] = this.getTileType(node);

      node.tileType = tileType;
      if (mirrored) node.mirror(false); // visual-only mirror; do not corrupt connection data
      node.isRotating = false;
      node.svgTurns = turns;
      node.simmetries = simmetries;

      node.effects = [];

      node.id = `tile-${node.centroid.x.toFixed(3)}-${node.centroid.y.toFixed(3)}`;
    }
  };

  getTileType = (node: Polygon): [string, boolean, number, Simmetry[]] => {
    const sides = node.n;
    const connections = node.halfways.map((h) => h.connections ?? 0);
    const [lowestLexicographicCycle, mirrored, turns] =
      cycleToMinimumLexicographicalOrder(connections);
    const simmetries = getSimmetries(connections);
    const tileType = `${sides}/${lowestLexicographicCycle.join('')}`;

    return [tileType, mirrored, turns, simmetries];
  };

  addEffects = (): void => {
    for (const node of this.tiling.nodes)
      if (node.halfways.some((h) => h.connections) && platform.rng.next() < 0.2)
        node.effects!.push(new Effect('rotate', this.tiling, node));
  };

  shuffle = (): void => {
    this.minMovesToSolve = 0;
    for (const node of this.tiling.nodes) {
      const turns = pickRandom(
        Array.from({ length: node.n - 1 }, (_, i) => i),
        platform.rng,
      );
      node.rotate(turns);
      for (const effect of node.effects ?? []) {
        for (let i = 0; i < turns; i++) {
          effect.resolve();
        }
      }
      this.minMovesToSolve += node.n - turns; // TODO: consider tile simmetries
    }
  };

  checkIfSolved = (): boolean => {
    const uniqueHalfways: { a: Halfway; b: Halfway | null }[] = [];
    for (const node of this.tiling.nodes) {
      for (const halfway of node.halfways) {
        halfway.matched = false;
        const existing = uniqueHalfways.find((h) => isWithinTolerance(h.a, halfway));
        if (!existing) {
          uniqueHalfways.push({ a: halfway, b: null });
        } else {
          existing.b = halfway;
        }
      }
    }

    let solved = true;
    for (const h of uniqueHalfways) {
      if (h.b == null) {
        h.a.matched = h.a.connections === 0;
        if (!h.a.matched) {
          solved = false;
        }
        continue;
      } else if (h.a.connections !== h.b.connections) {
        solved = false;
      } else {
        h.a.matched = true;
        h.b.matched = true;
      }
    }

    return solved;
  };
}

/** A linked effect: rotating/mirroring one tile transforms a target tile too. */
export class Effect implements TileEffect {
  type: string;
  color = '';
  target!: Polygon;
  turns = 0;

  constructor(type: string, tiling: Tiling, node: Polygon) {
    this.type = type;

    if (this.type === 'rotate') {
      this.color = '#aa0000';
      this.target = pickRandom(
        tiling.nodes.filter(
          (n) => n.id !== node.id && n.halfways.some((h) => h.connections),
        ),
        platform.rng,
      );
      let choices = Array.from(
        { length: this.target.n },
        (_, i) => i - (Math.floor(node.n / 2) + 1),
      );
      choices = choices.filter((c) => c !== 0);
      this.turns = pickRandom(choices, platform.rng);
    } else if (this.type === 'mirror') {
      this.color = '#0000aa';
      this.target = pickRandom(
        tiling.nodes.filter(
          (n) =>
            n.id !== node.id &&
            n.halfways.some((h) => h.connections) &&
            n.simmetries?.length === 0,
        ),
        platform.rng,
      );
    }
  }

  resolve(): void {
    if (this.type === 'rotate') {
      this.target.rotate(this.turns);
    } else if (this.type === 'mirror') {
      this.target.mirror();
    }
  }
}
