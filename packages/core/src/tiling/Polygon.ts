import { TOLERANCE } from '../geometry/constants';
import { Vector } from '../geometry/Vector';
import { map } from '../geometry/math';
import { simmetrize, type Simmetry } from '../util/seq';
import { getConfig } from '../state/configStore';

const PHI = (1 + Math.sqrt(5)) / 2;

/** A polygon edge midpoint, optionally carrying connection/match game state. */
export interface Halfway extends Vector {
  connections?: number;
  matched?: boolean;
}

/** Minimal shape of an effect attached to a tile (see Effect in Level.ts). */
export interface TileEffect {
  type: string;
  resolve(): void;
}

export interface PolygonData {
  centroid: Vector;
  n: number;
  angle: number;
}

/**
 * Base regular-polygon tile. Holds geometry (vertices, edge midpoints) plus the
 * game state attached later by the Level (tileType, rotation turns, effects…).
 */
export class Polygon {
  centroid: Vector;
  n: number;
  angle: number;
  turns = 0;
  rotation = 0;
  neighbors: Polygon[] = [];
  state = 0;
  nextState = 0;
  mirrored = false;
  svgTransform = '';
  vertices: Vector[] = [];
  halfways: Halfway[] = [];
  hue = 0;

  // Attached by Level.convertTilingToTiles / addEffects.
  tileType?: string;
  isRotating?: boolean;
  svgTurns?: number;
  simmetries?: Simmetry[];
  effects?: TileEffect[];
  id?: string;
  screenPosition?: Vector;

  // Attached by TilingGenerator.calculateNeighbors.
  directNeighbors?: Polygon[];
  dualNeighbors?: Polygon[];

  constructor(data: PolygonData) {
    this.centroid = data.centroid;
    this.n = data.n;
    this.angle = data.angle;

    this.calculateCentroid();
    this.calculateVertices();
    this.calculateHalfways();
  }

  containsPoint = (point: Vector): boolean => {
    let inside = false;
    for (let i = 0, j = this.vertices.length - 1; i < this.vertices.length; j = i++) {
      const xi = this.vertices[i].x;
      const yi = this.vertices[i].y;
      const xj = this.vertices[j].x;
      const yj = this.vertices[j].y;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  calculateCentroid = (): void => {
    if (Math.abs(this.centroid.x) < TOLERANCE) this.centroid.x = 0;
    if (Math.abs(this.centroid.y) < TOLERANCE) this.centroid.y = 0;
  };

  calculateVertices = (): void => {
    this.vertices = [];
    const radius = 0.5 / Math.sin(Math.PI / this.n);
    const alpha = (2 * Math.PI) / this.n;
    for (let i = 0; i < this.n; i++) {
      this.vertices.push(
        Vector.fromPolar(this.centroid, radius, i * alpha + this.angle + this.rotation),
      );
      if (Math.abs(this.vertices[i].x) < TOLERANCE) this.vertices[i].x = 0;
      if (Math.abs(this.vertices[i].y) < TOLERANCE) this.vertices[i].y = 0;
    }
  };

  calculateHalfways = (): void => {
    if (!this.halfways || this.halfways.length === 0) {
      this.halfways = Array.from({ length: this.n }, () => new Vector(0, 0));
    }
    for (let i = 0; i < this.n; i++) {
      this.halfways[i].x = (this.vertices[i].x + this.vertices[(i + 1) % this.n].x) / 2;
      this.halfways[i].y = (this.vertices[i].y + this.vertices[(i + 1) % this.n].y) / 2;
      if (Math.abs(this.halfways[i].x) < TOLERANCE) this.halfways[i].x = 0;
      if (Math.abs(this.halfways[i].y) < TOLERANCE) this.halfways[i].y = 0;
    }
  };

  rotate(turns = 1): void {
    this.turns += turns;
    this.rotation = (this.turns * 2 * Math.PI) / this.n;
    const sign = this.mirrored ? -1 : 1;

    const transformations = this.svgTransform.trim().split(' ');
    const last = transformations[transformations.length - 1];
    if (transformations.length > 0 && last.includes('rotate')) {
      let totalAngle = 0;
      totalAngle += parseFloat(last.split('(')[1].split('deg)')[0]);
      totalAngle += (sign * turns * 360) / this.n;
      this.svgTransform = this.svgTransform.replace(last, `rotate(${totalAngle}deg) `);
    } else {
      this.svgTransform += `rotate(${(sign * turns * 360) / this.n}deg) `;
    }

    this.calculateVertices();
    this.calculateHalfways();
  }

  mirror(reflectConnections = true): void {
    // `reflectConnections` performs a true data-level mirror of the tile.
    // During canonicalization (Level.convertTilingToTiles) we only want the
    // VISUAL mirror (scaleX + mirrored flag): reflecting the connection data
    // there reassigns connection values across edges WITHOUT moving their
    // positions, so values end up on the wrong physical edge and
    // checkIfSolved() (which matches by position) can never detect a solve.
    if (reflectConnections) {
      const connections = simmetrize(
        this.halfways.map((h) => h.connections ?? 0),
        1,
      );
      for (let i = 0; i < this.halfways.length; i++) {
        this.halfways[i].connections = connections[i];
      }
    }

    const transformations = this.svgTransform.trim().split(' ');
    const last = transformations[transformations.length - 1];
    if (transformations.length > 0 && last.includes('scaleX')) {
      this.svgTransform = this.svgTransform.replace(last, ``);
    } else {
      this.svgTransform += `scaleX(-1) `;
    }

    this.mirrored = !this.mirrored;
  }
}

export class RegularPolygon extends Polygon {
  constructor(data: PolygonData) {
    super(data);
    this.calculateHue();
  }

  calculateHue = (): void => {
    this.hue = map(Math.log(this.vertices.length), Math.log(3), Math.log(40), 0, 300);
  };

  clone = (): RegularPolygon =>
    new RegularPolygon({
      centroid: this.centroid.copy(),
      n: this.n,
      angle: this.angle,
    });
}

export interface DualPolygonData {
  centroid: Vector;
  vertices: Vector[];
  halfways: Halfway[];
}

export class DualPolygon extends Polygon {
  constructor(data: DualPolygonData) {
    super({ centroid: data.centroid, n: 3, angle: 0 });
    this.vertices = data.vertices;
    this.halfways = data.halfways;
    this.calculateHue();
  }

  calculateHue = (): void => {
    this.hue = this.calculateAnglesHash();
  };

  calculateAnglesHash(): number {
    let angles: number[] = [];
    for (let i = 0; i < this.vertices.length; i++) {
      const prev = i === 0 ? this.vertices.length - 1 : i - 1;
      const curr = i;
      const next = i === this.vertices.length - 1 ? 0 : i + 1;

      const v1 = Vector.sub(this.vertices[prev], this.vertices[curr]);
      const v2 = Vector.sub(this.vertices[next], this.vertices[curr]);

      const mag1 = v1.mag();
      const mag2 = v2.mag();
      const dot = v1.dot(v2);

      const angle =
        (Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * 180) / Math.PI;
      angles.push(Math.round(angle));
    }

    let minRotation = [...angles];

    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < angles.length; i++) {
        const rotation = [...angles.slice(i), ...angles.slice(0, i)];

        let isSmaller = false;
        for (let k = 0; k < angles.length; k++) {
          if (rotation[k] < minRotation[k]) {
            isSmaller = true;
            break;
          } else if (rotation[k] > minRotation[k]) {
            break;
          }
        }

        if (isSmaller) minRotation = [...rotation];
      }

      angles = angles.reverse();
    }

    const params = getConfig().colorParams;
    const a = params.a;
    const b = params.b;

    let hash = 0;
    for (let i = 0; i < minRotation.length; i++)
      hash = (hash * PHI + minRotation[i] * Math.sqrt(2)) % 1447;

    const baseHue = hash % 360;
    const rotatedHue = (baseHue + a) % 360;
    const displacedHue =
      rotatedHue + b * this.vertices.length * Math.sin((rotatedHue * Math.PI) / 180);

    return (displacedHue + 360) % 360;
  }

  clone = (): DualPolygon =>
    new DualPolygon({
      centroid: this.centroid.copy(),
      vertices: [...this.vertices],
      halfways: [...this.halfways],
    });
}

export interface StarPolygonData {
  centroid: Vector;
  n: number;
  m: number;
  angle: number;
}

export class StarPolygon extends Polygon {
  m: number;

  constructor(data: StarPolygonData) {
    super({ centroid: data.centroid, n: data.n, angle: data.angle });
    this.m = data.m;
    this.calculateVertices();
    this.calculateHalfways();
    this.calculateHue();
  }

  calculateVertices = (): void => {
    this.vertices = [];
    const gamma = Math.PI / this.n;
    const alpha = (this.m - 1) * gamma;
    const radius = Math.cos(alpha) / Math.sin(gamma);
    const intRadius = radius * Math.cos(gamma) - Math.sin(alpha);

    for (let i = 0; i < this.n; i++) {
      this.vertices.push(Vector.fromPolar(this.centroid, radius, 2 * gamma * i + this.angle));
      this.vertices.push(
        Vector.fromPolar(this.centroid, intRadius, 2 * gamma * i + gamma + this.angle),
      );
    }
  };

  calculateHalfways = (): void => {
    this.halfways = [];
    for (let i = 0; i < this.vertices.length; i++) {
      this.halfways.push(
        Vector.midpoint(this.vertices[i], this.vertices[(i + 1) % this.vertices.length]),
      );
    }
  };

  calculateHue = (): void => {
    this.hue = map(this.vertices.length / 2, 3, 12, 300, 0) + 300 / 12;
  };

  clone = (): StarPolygon =>
    new StarPolygon({
      centroid: this.centroid.copy(),
      n: this.n,
      m: this.m,
      angle: this.angle,
    });
}

export interface IsotoxalPolygonData {
  centroid: Vector;
  n: number;
  angle: number;
  alfa: number;
}

export class IsotoxalPolygon extends Polygon {
  alfa: number;

  constructor(data: IsotoxalPolygonData) {
    super({ centroid: data.centroid, n: data.n, angle: data.angle });
    this.alfa = data.alfa;
    this.calculateVertices();
    this.calculateHalfways();
    this.calculateHue();
  }

  calculateVertices = (): void => {
    this.vertices = [];
    const gamma = (Math.PI * (this.n - 2)) / (2 * this.n);
    const alfa = this.alfa / 2;
    const beta = gamma - alfa;

    const radius = Math.cos(beta) / Math.cos(gamma);
    const intRadius = Math.tan(gamma) * Math.cos(beta) - Math.sin(beta);
    for (let i = 0; i < this.n; i++) {
      this.vertices.push(
        Vector.fromPolar(this.centroid, radius, (i * 2 * Math.PI) / this.n + this.angle + Math.PI),
      );
      this.vertices.push(
        Vector.fromPolar(
          this.centroid,
          intRadius,
          ((i + 0.5) * 2 * Math.PI) / this.n + this.angle + Math.PI,
        ),
      );

      if (Math.abs(this.vertices[i].x) < TOLERANCE) this.vertices[i].x = 0;
      if (Math.abs(this.vertices[i].y) < TOLERANCE) this.vertices[i].y = 0;
    }
  };

  calculateHalfways = (): void => {
    this.halfways = [];
    for (let i = 0; i < this.vertices.length; i++) {
      this.halfways.push(
        Vector.midpoint(this.vertices[i], this.vertices[(i + 1) % this.vertices.length]),
      );
    }
  };

  calculateHue = (): void => {
    this.hue = map(this.vertices.length / 2, 3, 12, 300, 0) + 300 / 12;
  };

  clone = (): IsotoxalPolygon =>
    new IsotoxalPolygon({
      centroid: this.centroid.copy(),
      n: this.n,
      angle: this.angle,
      alfa: this.alfa,
    });
}
