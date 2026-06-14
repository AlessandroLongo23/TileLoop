import { TOLERANCE, offsets, possibleSides, possibleAngles } from '../geometry/constants';
import {
  RegularPolygon,
  IsotoxalPolygon,
  StarPolygon,
  DualPolygon,
  type Polygon,
} from './Polygon';
import {
  sortPointsByAngleAndDistance,
  getClockwiseAngle,
  apothem,
  angleBetween,
} from '../geometry/geometry';
import { getSpatialKey } from '../geometry/optimizing';
import { isWithinTolerance } from '../geometry/math';
import { Vector } from '../geometry/Vector';
import { Tiling, type SeedShape, type Transform } from './Tiling';
import {
  pickRandom,
  cyclicallyInclude,
  findSubsequenceStartingIndex,
  count,
} from '../util/seq';
import { getConfig } from '../state/configStore';
import { platform } from '../platform/context';

const vertexConfigurations: number[][] = [
  [3, 12, 12],
  [4, 6, 12],
  [4, 12, 6],
  [6, 6, 6],

  [3, 3, 4, 12],
  [3, 3, 12, 4],
  [3, 3, 6, 6],
  [3, 4, 3, 12],
  [3, 4, 4, 6],
  [3, 6, 4, 4],
  [3, 4, 6, 4],
  [3, 6, 3, 6],
  [4, 4, 4, 4],

  [3, 3, 3, 3, 6],
  [3, 3, 3, 4, 4],
  [3, 3, 4, 3, 4],

  [3, 3, 3, 3, 3, 3],
];

const availablePolygons = [3, 4, 6, /* 8, */ 12];

interface FreeAnchor {
  node: Polygon;
  halfwayPointIndex: number;
}
interface Anchor extends FreeAnchor {
  dir: Vector;
}
interface FreeVertex {
  coord: Vector;
  radialDistance: number;
  neighbors: Vector[];
  shapesAround: Polygon[];
  coveredAngle: number;
  possibleConfigurations: number[][];
}

export class TilingGenerator {
  tiling: Tiling;
  possibleVertexConfigurations: number[][];
  shapeSeed: SeedShape[][] = [];
  transforms: Transform[] = [];
  uniqueUncollapsedVertices: FreeVertex[] = [];
  newLayerNodes: Polygon[] = [];
  seedNodes: Polygon[] = [];
  coreNode!: Polygon;

  constructor() {
    this.tiling = new Tiling();
    this.possibleVertexConfigurations = [...vertexConfigurations];
  }

  generateWithWFC(): Tiling {
    this.tiling.nodes = [];

    this.addFirstNode();

    let iterations = 0;
    while (true) {
      this.prune();
      this.evaluateVertices();

      const lowestEntropyVertex = this.getLowestEntropyVertex();
      if (lowestEntropyVertex === null) break;

      this.collapseVertex(lowestEntropyVertex);
      this.propagateConstraints();

      if (this.tiling.nodes.length > 250 || iterations > 100) break;
      iterations++;
    }

    return this.tiling;
  }

  addFirstNode = (): void => {
    const sides = pickRandom(availablePolygons, platform.rng);

    this.tiling.nodes.push(
      new RegularPolygon({
        centroid: new Vector(),
        n: sides,
        angle: sides === 3 ? 0 : Math.PI / sides,
      }),
    );
  };

  prune = (): void => {
    const newNodes: Polygon[] = [];
    for (const node of this.tiling.nodes) {
      if (isNaN(node.centroid.x)) continue;
      if (newNodes.some((n) => isWithinTolerance(n.centroid, node.centroid))) continue;
      newNodes.push(node);
    }
    this.tiling.nodes = [...newNodes];
  };

  computePossibleConfigurations = (v: Vector, shapesAround: Polygon[]): number[][] => {
    shapesAround.sort(
      (a, b) =>
        Vector.sub(a.centroid, v).heading() - Vector.sub(b.centroid, v).heading(),
    );
    const sides = shapesAround.map((shape) => shape.n);
    return this.possibleVertexConfigurations.filter((c) => cyclicallyInclude(c, sides));
  };

  evaluateVertices = (): void => {
    this.uniqueUncollapsedVertices = [];

    for (const node of this.tiling.nodes) {
      for (const vertex of node.vertices) {
        if (this.uniqueUncollapsedVertices.some((v) => isWithinTolerance(v.coord, vertex)))
          continue;

        const shapesAround: Polygon[] = [];
        for (const otherNode of this.tiling.nodes) {
          for (const otherVertex of otherNode.vertices) {
            if (isWithinTolerance(vertex, otherVertex)) {
              shapesAround.push(otherNode);
              break;
            }
          }
        }

        const coveredAngle = shapesAround.reduce(
          (acc, shape) => acc + (Math.PI * (shape.n - 2)) / shape.n,
          0,
        );

        const possibleConfigurations = this.computePossibleConfigurations(vertex, shapesAround);
        if (possibleConfigurations.length === 0) continue;

        if (isWithinTolerance(coveredAngle, 2 * Math.PI) || coveredAngle > 2 * Math.PI)
          continue;

        const neighbors = this.tiling.nodes
          .flatMap((n) => n.vertices)
          .filter((other) => isWithinTolerance(vertex.distance(other), 1));

        this.uniqueUncollapsedVertices.push({
          coord: vertex,
          radialDistance: vertex.mag(),
          neighbors,
          shapesAround,
          coveredAngle,
          possibleConfigurations,
        });
      }
    }
  };

  getLowestEntropyVertex = (): FreeVertex | null => {
    let lowestEntropy = Infinity;
    let minRadialDistance = Infinity;
    let lowestEntropyVertex: FreeVertex | null = null;

    for (const freeVertex of this.uniqueUncollapsedVertices) {
      if (freeVertex.possibleConfigurations.length < lowestEntropy) {
        lowestEntropy = freeVertex.possibleConfigurations.length;
        minRadialDistance = freeVertex.radialDistance;
        lowestEntropyVertex = freeVertex;
      } else if (
        freeVertex.possibleConfigurations.length === lowestEntropy &&
        freeVertex.radialDistance < minRadialDistance
      ) {
        minRadialDistance = freeVertex.radialDistance;
        lowestEntropyVertex = freeVertex;
      }
    }

    return lowestEntropyVertex;
  };

  collapseVertex = (vertex: FreeVertex): void => {
    const randomConfiguration = pickRandom(vertex.possibleConfigurations, platform.rng);

    vertex.shapesAround.sort((a, b) => {
      const angleA = Vector.sub(a.centroid, vertex.coord).heading();
      const angleB = Vector.sub(b.centroid, vertex.coord).heading();
      return angleA - angleB;
    });

    if (vertex.shapesAround.length > 1) {
      for (let i = 0; i < vertex.shapesAround.length; i++) {
        const curr = vertex.shapesAround[i];
        const next = vertex.shapesAround[(i + 1) % vertex.shapesAround.length];

        const vecA = Vector.sub(curr.centroid, vertex.coord).normalize();
        const vecB = Vector.sub(next.centroid, vertex.coord).normalize();
        const intAngleA = (Math.PI * (curr.n - 2)) / (2 * curr.n);
        const intAngleB = (Math.PI * (next.n - 2)) / (2 * next.n);
        if (!isWithinTolerance(Vector.rotate(vecA, intAngleA + intAngleB), vecB)) {
          const temp: Polygon[] = [];
          for (let j = 0; j < vertex.shapesAround.length; j++) {
            temp.push(vertex.shapesAround[(i + 1 + j) % vertex.shapesAround.length]);
          }
          vertex.shapesAround = [...temp];
          break;
        }
      }
    }

    const startingIndexes = findSubsequenceStartingIndex(
      randomConfiguration,
      vertex.shapesAround.map((n) => n.n),
    );
    let startingIndex: number;
    if (startingIndexes.length > 1) {
      startingIndex = pickRandom(startingIndexes, platform.rng);
    } else {
      startingIndex = startingIndexes[0];
    }
    const endIndex = (startingIndex + vertex.shapesAround.length) % randomConfiguration.length;

    let lastNode = vertex.shapesAround[vertex.shapesAround.length - 1];
    let lastNodeDir = Vector.sub(lastNode.centroid, vertex.coord);

    for (let i = 0; i < randomConfiguration.length - vertex.shapesAround.length; i++) {
      const n = randomConfiguration[(endIndex + i) % randomConfiguration.length];

      const lastNodeIntAngle = (Math.PI * (lastNode.n - 2)) / (2 * lastNode.n);
      const currNodeIntAngle = (Math.PI * (n - 2)) / (2 * n);
      lastNodeDir = lastNodeDir.rotate(lastNodeIntAngle + currNodeIntAngle);

      const radius = 0.5 / Math.sin(Math.PI / n);
      const newNode = new RegularPolygon({
        centroid: Vector.add(vertex.coord, Vector.fromAngle(lastNodeDir.heading()).scale(radius)),
        n,
        angle: Vector.rotate(lastNodeDir, Math.PI).heading(),
      });
      lastNode = newNode;

      this.tiling.nodes.push(newNode);
    }
  };

  propagateConstraints = (): void => {
    // intentionally empty (matches legacy stub)
  };

  generateFromRule(rule: string, numLayers: number): Tiling {
    this.parseRule(rule);

    this.tiling.nodes = [];

    this.generateSeed();
    this.generateTransformations(numLayers);

    if (this.tiling.dual) this.computeDual();

    return this.tiling;
  }

  isValidShapeSeed = (shapeSeed: string): boolean => {
    let valid = true;
    if (count(shapeSeed, '(') !== count(shapeSeed, ')')) valid = false;
    if (count(shapeSeed, '{') !== count(shapeSeed, '}') || count(shapeSeed, '{') !== count(shapeSeed, '.'))
      valid = false;
    return valid;
  };

  private parseSeedToken = (token: string): SeedShape => {
    if (!this.isValidShapeSeed(token)) throw new Error('Invalid shape seed');

    if (token.includes('(')) {
      const n = token.split('(')[0];
      const alfa = token.split('(')[1].split(')')[0];
      const v = getConfig().parameter;
      return {
        type: 'isotoxal',
        n: parseInt(n),
        alfa: alfa === 'a' ? (v * Math.PI) / 180 : (parseInt(alfa) * Math.PI) / 180,
      };
    } else if (token.includes('{')) {
      const a = token.split('{')[1].split('}')[0];
      const n = a.split('.')[0];
      const m = a.split('.')[1];
      return { type: 'star', n: parseInt(n), m: parseInt(m) };
    }
    return { type: 'regular', n: parseInt(token), special: token.includes("'") };
  };

  parseRule = (tilingRule: string): void => {
    this.tiling.dual = false;
    this.tiling.islamic = false;

    if (tilingRule[tilingRule.length - 1] === '*') {
      this.tiling.dual = true;
      tilingRule = tilingRule.slice(0, -1);
    } else if (tilingRule.includes('i')) {
      this.tiling.islamic = true;
    }

    const phases = tilingRule.split('/');
    this.shapeSeed = phases[0]
      .split('-')
      .map((group) => group.split(',').map((token) => this.parseSeedToken(token)));

    if (this.shapeSeed.flat().some((n) => !possibleSides.includes(n.n))) {
      throw new Error('Invalid shape seed');
    }

    this.transforms = [];
    for (let i = 1; i < phases.length; i++) {
      let transform: Transform;
      if (phases[i].includes('(') && phases[i].includes(')')) {
        let angle = 180;
        if (phases[i].includes('[') && phases[i].includes(']')) {
          angle = parseInt(phases[i].split('[')[1].split(']')[0]);
        }
        if (!possibleAngles.includes(angle)) {
          console.error('Invalid angle', angle);
          angle = Math.PI;
        } else {
          angle = (angle * Math.PI) / 180;
        }
        transform = {
          type: phases[i][0],
          relativeTo: phases[i].split('(')[1].split(')')[0],
          angle,
          anchor: null,
        };
      } else {
        const type = phases[i][0];
        let angle = parseInt(phases[i].slice(1));
        if (!possibleAngles.includes(angle)) {
          console.error('Invalid angle', angle);
          angle = Math.PI;
        } else {
          angle = (angle * Math.PI) / 180;
        }
        transform = { type, angle };
      }
      this.transforms.push(transform);
    }
  };

  addCoreNode = (): void => {
    const coreNode = this.shapeSeed[0][0];
    if (coreNode.type === 'isotoxal') {
      this.coreNode = new IsotoxalPolygon({
        centroid: new Vector(),
        n: coreNode.n,
        angle: Math.PI / coreNode.n,
        alfa: coreNode.alfa,
      });
    } else if (coreNode.type === 'star') {
      this.coreNode = new StarPolygon({
        centroid: new Vector(),
        n: coreNode.n,
        m: coreNode.m,
        angle: Math.PI / coreNode.n,
      });
    } else {
      if (coreNode.special) {
        this.coreNode = new RegularPolygon({
          centroid: new Vector(),
          n: 3,
          angle: -Math.PI / 2,
        });
      } else {
        this.coreNode = new RegularPolygon({
          centroid: new Vector(
            coreNode.n === 3 ? Math.sqrt(3) / 6 : 0,
            coreNode.n === 3 ? 0.5 : 0,
          ),
          n: coreNode.n,
          angle: coreNode.n === 3 ? 0 : Math.PI / coreNode.n,
        });
      }
    }

    this.tiling.nodes.push(this.coreNode);
  };

  generateSeed = (): void => {
    this.addCoreNode();

    for (let i = 1; i < this.shapeSeed.length; i++) {
      const newNodes: Polygon[] = [];
      let indexOff = 0;
      for (let j = 0; j < this.shapeSeed[i].length; j++) {
        const shape = this.shapeSeed[i][j];
        if (shape.n === 0) {
          indexOff += 1;
          continue;
        }

        const anchor = this.findAnchor(newNodes, indexOff);
        const halfwayPoint = anchor.node.halfways[anchor.halfwayPointIndex];

        let newNode: Polygon;
        if (shape.type === 'regular') {
          const a = apothem(shape.n);
          const newCentroid = new Vector(
            halfwayPoint.x + anchor.dir.x * a,
            halfwayPoint.y + anchor.dir.y * a,
          );

          let angle = anchor.dir.heading();
          if (shape.n % 2 === 0) {
            angle += Math.PI / shape.n;
          }

          newNode = new RegularPolygon({ centroid: newCentroid, n: shape.n, angle });
        } else {
          // isotoxal seed shape
          const alfa = (shape as { alfa: number }).alfa;
          const firstVertex = anchor.node.vertices[anchor.halfwayPointIndex];
          const secondVertex = anchor.node.vertices[(anchor.halfwayPointIndex + 1) % anchor.node.n];
          const sideVector = new Vector(
            firstVertex.x - secondVertex.x,
            firstVertex.y - secondVertex.y,
          );
          sideVector.normalize();
          sideVector.rotate(alfa / 2);

          const gamma = (Math.PI * (shape.n - 2)) / (2 * shape.n);
          const beta = gamma - alfa / 2;
          const dist = Math.cos(beta) / Math.cos(gamma);

          const newCentroid = new Vector(
            secondVertex.x + sideVector.x * dist,
            secondVertex.y + sideVector.y * dist,
          );

          newNode = new IsotoxalPolygon({
            centroid: newCentroid,
            n: shape.n,
            angle: Math.atan2(sideVector.y, sideVector.x),
            alfa,
          });
        }

        newNodes.push(newNode);
      }

      this.tiling.nodes = this.tiling.nodes.concat(newNodes);
    }

    this.newLayerNodes = [...this.tiling.nodes];
    this.seedNodes = [...this.tiling.nodes];
  };

  generateTransformations = (numLayers: number): void => {
    const start = platform.clock.now();

    for (let s = 0; s < numLayers; s++) {
      let newNodes: Polygon[] = [];
      for (let i = 0; i < this.transforms.length; i++) {
        if (s === numLayers - 1 && i === this.transforms.length - 1) break;

        if (s === 0) this.tiling.anchorNodes = [...this.tiling.nodes, ...newNodes];

        if (this.transforms[i].type === 'm') {
          if (this.transforms[i].relativeTo)
            newNodes = newNodes.concat(this.mirrorRelativeTo(i, newNodes));
          else if (this.transforms[i].angle)
            newNodes = newNodes.concat(this.mirrorByAngle(this.transforms[i].angle!, newNodes));
        } else if (this.transforms[i].type === 'r') {
          if (this.transforms[i].relativeTo)
            newNodes = newNodes.concat(this.rotateRelativeTo(i, newNodes));
          else if (this.transforms[i].angle)
            newNodes = newNodes.concat(this.rotateByAngle(this.transforms[i].angle!, newNodes));
        } else if (this.transforms[i].type === 't') {
          newNodes = newNodes.concat(this.translateRelativeTo(i, newNodes));
        }
      }

      this.newLayerNodes = this.addNewNodes(newNodes);
      if (platform.clock.now() - start > 1000) {
        break;
      }
    }
  };

  mirrorRelativeTo = (transformationIndex: number, additionalNodes: Polygon[]): Polygon[] => {
    let origin = this.transforms[transformationIndex].anchor as Vector | null;
    if (!origin) {
      const type = this.transforms[transformationIndex].relativeTo![0];
      const index = this.transforms[transformationIndex].relativeTo!.slice(1);
      origin = this.findOrigin(this.tiling.anchorNodes, type, index)!;
      this.transforms[transformationIndex].anchor = origin;
    }

    const newNodes: Polygon[] = [];
    for (const newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
      const newNode = (newLayerNode as Polygon & { clone(): Polygon }).clone();

      if (this.transforms[transformationIndex].relativeTo![0] === 'h') {
        let lineVector: Vector | null = null;

        for (let i = 0; i < this.tiling.anchorNodes.length; i++) {
          for (let k = 0; k < this.tiling.anchorNodes[i].halfways.length; k++) {
            if (isWithinTolerance(this.tiling.anchorNodes[i].halfways[k], origin)) {
              const v1 = this.tiling.anchorNodes[i].vertices[k];
              const v2 =
                this.tiling.anchorNodes[i].vertices[(k + 1) % this.tiling.anchorNodes[i].n];
              lineVector = Vector.sub(v2, v1).normalize();
              break;
            }
          }
          if (lineVector) break;
        }

        const pointVector = Vector.sub(newNode.centroid, origin);
        const dot = pointVector.dot(lineVector!);
        const projection = lineVector!.scale(dot);
        const perpendicular = Vector.sub(pointVector, projection);

        newNode.centroid.x = origin.x + projection.x - perpendicular.x;
        newNode.centroid.y = origin.y + projection.y - perpendicular.y;

        const lineAngle = lineVector!.heading();
        newNode.angle = (2 * lineAngle - newNode.angle + 2 * Math.PI) % (2 * Math.PI);
      } else {
        newNode.centroid.x = origin.x - (newNode.centroid.x - origin.x);
        newNode.centroid.y = origin.y - (newNode.centroid.y - origin.y);
        newNode.angle = (Math.PI + newNode.angle) % (Math.PI * 2);
      }

      newNode.calculateCentroid();
      newNode.calculateVertices();
      newNode.calculateHalfways();

      newNodes.push(newNode);
    }

    return newNodes;
  };

  mirrorByAngle = (angle: number, additionalNodes: Polygon[]): Polygon[] => {
    const anglesToProcess: number[] = [];
    while (angle < 2 * Math.PI) {
      anglesToProcess.push(angle + Math.PI / 2);
      angle *= 2;
    }

    const newNodes: Polygon[] = [];
    for (const angleRad of anglesToProcess) {
      for (const newLayerNode of [
        ...this.newLayerNodes,
        ...this.seedNodes,
        ...additionalNodes,
        ...newNodes,
      ]) {
        const newNode = (newLayerNode as Polygon & { clone(): Polygon }).clone();

        newNode.centroid.mirror(angleRad);
        newNode.angle = (2 * angleRad - newNode.angle + Math.PI * 2) % (Math.PI * 2);

        newNode.calculateCentroid();
        newNode.calculateVertices();
        newNode.calculateHalfways();

        newNodes.push(newNode);
      }
    }
    return newNodes;
  };

  rotateRelativeTo = (transformationIndex: number, additionalNodes: Polygon[]): Polygon[] => {
    let origin = this.transforms[transformationIndex].anchor as Vector | null;
    if (!origin) {
      const type = this.transforms[transformationIndex].relativeTo![0];
      const index = this.transforms[transformationIndex].relativeTo!.slice(1);
      origin = this.findOrigin(this.tiling.anchorNodes, type, index)!;
      this.transforms[transformationIndex].anchor = origin;
    }

    const newNodes: Polygon[] = [];
    const step = this.transforms[transformationIndex].angle!;
    for (let alfa = step; alfa < 2 * Math.PI; alfa += step) {
      for (const newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
        const newNode = (newLayerNode as Polygon & { clone(): Polygon }).clone();

        newNode.centroid = Vector.add(origin, Vector.sub(newNode.centroid, origin).rotate(alfa));
        newNode.angle = (alfa + newNode.angle) % (Math.PI * 2);

        newNode.calculateCentroid();
        newNode.calculateVertices();
        newNode.calculateHalfways();

        newNodes.push(newNode);
      }
    }

    return newNodes;
  };

  rotateByAngle = (alfa: number, additionalNodes: Polygon[]): Polygon[] => {
    const anglesToProcess: number[] = [];
    let currentAngle = alfa;
    while (currentAngle < 2 * Math.PI) {
      anglesToProcess.push(currentAngle);
      currentAngle += alfa;
    }

    const rotationCache = new Map<string, Vector>();

    const newNodes: Polygon[] = [];
    for (const angle of anglesToProcess) {
      for (const newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
        const cacheKey = `${newLayerNode.centroid.x},${newLayerNode.centroid.y}-${angle}`;
        let newPos: Vector;

        if (rotationCache.has(cacheKey)) {
          newPos = rotationCache.get(cacheKey)!;
        } else {
          const d = newLayerNode.centroid.mag();
          if (d < TOLERANCE) {
            newPos = new Vector();
          } else {
            const a = newLayerNode.centroid.heading();
            newPos = Vector.fromAngle(a + angle).scale(d);
          }
          rotationCache.set(cacheKey, newPos);
        }

        const newNode = (newLayerNode as Polygon & { clone(): Polygon }).clone();
        newNode.centroid.set(newPos);
        newNode.angle = (newLayerNode.angle + angle) % (Math.PI * 2);

        newNode.calculateCentroid();
        newNode.calculateVertices();
        newNode.calculateHalfways();

        newNodes.push(newNode);
      }
    }

    rotationCache.clear();
    return newNodes;
  };

  translateRelativeTo = (transformationIndex: number, additionalNodes: Polygon[]): Polygon[] => {
    let origin = this.transforms[transformationIndex].anchor as Vector | null;
    if (!origin) {
      const type = this.transforms[transformationIndex].relativeTo![0];
      const index = this.transforms[transformationIndex].relativeTo!.slice(1);
      origin = this.findOrigin(this.tiling.anchorNodes, type, index)!;
      this.transforms[transformationIndex].anchor = origin;
    }

    const newNodes: Polygon[] = [];
    for (const newLayerNode of [...this.newLayerNodes, ...this.seedNodes, ...additionalNodes]) {
      const newNode = (newLayerNode as Polygon & { clone(): Polygon }).clone();

      newNode.centroid.add(origin);

      newNode.calculateCentroid();
      newNode.calculateVertices();
      newNode.calculateHalfways();

      newNodes.push(newNode);
    }

    return newNodes;
  };

  findAnchor = (newNodes: Polygon[], indexOff: number): Anchor => {
    const allNodes = this.tiling.nodes.concat(newNodes);

    let anchors: FreeAnchor[] = [];
    for (let i = 0; i < this.tiling.nodes.length; i++) {
      for (let s = 0; s < this.tiling.nodes[i].halfways.length; s++) {
        let isFree = true;

        for (let j = 0; j < allNodes.length; j++) {
          if (isWithinTolerance(this.tiling.nodes[i].centroid, allNodes[j].centroid)) continue;

          for (let k = 0; k < allNodes[j].halfways.length; k++) {
            if (isWithinTolerance(this.tiling.nodes[i].halfways[s], allNodes[j].halfways[k])) {
              isFree = false;
              break;
            }
          }

          if (!isFree) break;
        }

        if (isFree) {
          anchors.push({ node: this.tiling.nodes[i], halfwayPointIndex: s });
        }
      }
    }

    anchors = anchors.sort((a, b) => {
      const angleA = getClockwiseAngle(a.node.halfways[a.halfwayPointIndex]);
      const angleB = getClockwiseAngle(b.node.halfways[b.halfwayPointIndex]);

      if (Math.abs(angleA - angleB) < TOLERANCE) {
        const distA = a.node.halfways[a.halfwayPointIndex].mag();
        const distB = b.node.halfways[b.halfwayPointIndex].mag();
        return distA - distB;
      }

      return angleA - angleB;
    });

    const picked = anchors[indexOff];

    const dir = Vector.sub(
      picked.node.vertices[(picked.halfwayPointIndex + 1) % picked.node.vertices.length],
      picked.node.vertices[picked.halfwayPointIndex],
    );
    dir.normalize();
    dir.rotate(-Math.PI / 2);

    return { node: picked.node, halfwayPointIndex: picked.halfwayPointIndex, dir };
  };

  findOrigin = (nodes: Polygon[], type: string, index: string): Vector | undefined => {
    const deduplicatePoints = (points: Vector[]): Vector[] => {
      const spatialMap = new Map<string, number[]>();
      const uniquePoints: Vector[] = [];

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const baseKey = getSpatialKey(point.x, point.y);
        const baseX = Math.floor(point.x / (TOLERANCE * 2));
        const baseY = Math.floor(point.y / (TOLERANCE * 2));

        let isDuplicate = false;

        for (const [dx, dy] of offsets) {
          const key = `${baseX + dx},${baseY + dy}`;
          const potentialDuplicates = spatialMap.get(key) || [];

          for (const uniqueIndex of potentialDuplicates) {
            if (isWithinTolerance(uniquePoints[uniqueIndex], point)) {
              isDuplicate = true;
              break;
            }
          }

          if (isDuplicate) break;
        }

        if (!isDuplicate) {
          const newIndex = uniquePoints.length;
          uniquePoints.push(point);

          if (!spatialMap.has(baseKey)) spatialMap.set(baseKey, []);
          spatialMap.get(baseKey)!.push(newIndex);
        }
      }

      return uniquePoints;
    };

    let result: Vector | undefined;

    if (type === 'c') {
      const centroids = nodes.map((node) => node.centroid);
      const uniqueCentroids = deduplicatePoints(centroids);
      let sortedCentroids = sortPointsByAngleAndDistance(uniqueCentroids);
      sortedCentroids = sortedCentroids.filter((centroid) => !isWithinTolerance(centroid, new Vector()));
      result = sortedCentroids[parseInt(index) - 1];
    } else if (type === 'h') {
      const halfways = nodes.map((node) => node.halfways).flat();
      const uniqueHalfways = deduplicatePoints(halfways);
      const sortedHalfways = sortPointsByAngleAndDistance(uniqueHalfways);
      result = sortedHalfways[parseInt(index) - 1];
    } else if (type === 'v') {
      const vertices = nodes.map((node) => node.vertices).flat();
      const uniqueVertices = deduplicatePoints(vertices);
      const sortedVertices = sortPointsByAngleAndDistance(uniqueVertices);
      result = sortedVertices[parseInt(index) - 1];
    }

    return result;
  };

  addNewNodes = (newNodes: Polygon[]): Polygon[] => {
    const newLayerNodes: Polygon[] = [];

    const spatialMap = new Map<string, number[]>();
    for (let i = 0; i < this.tiling.nodes.length; i++) {
      const node = this.tiling.nodes[i];
      const key = getSpatialKey(node.centroid.x, node.centroid.y);
      if (!spatialMap.has(key)) spatialMap.set(key, []);
      spatialMap.get(key)!.push(i);
    }

    for (let i = 0; i < newNodes.length; i++) {
      const newNode = newNodes[i];
      const key = getSpatialKey(newNode.centroid.x, newNode.centroid.y);

      let isDuplicate = false;

      const baseX = Math.floor(newNode.centroid.x / (TOLERANCE * 2));
      const baseY = Math.floor(newNode.centroid.y / (TOLERANCE * 2));

      for (const [dx, dy] of offsets) {
        const adjKey = `${baseX + dx},${baseY + dy}`;
        const existingIndices = spatialMap.get(adjKey) || [];

        for (const idx of existingIndices) {
          if (isWithinTolerance(this.tiling.nodes[idx].centroid, newNode.centroid)) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) break;
      }

      if (!isDuplicate) {
        this.tiling.nodes.push(newNode);
        newLayerNodes.push(newNode);

        if (!spatialMap.has(key)) spatialMap.set(key, []);
        spatialMap.get(key)!.push(this.tiling.nodes.length - 1);
      }
    }

    return newLayerNodes;
  };

  computeDual = (): void => {
    const originalVertices = this.tiling.nodes.map((node) => node.vertices).flat();

    const uniqueOriginalVertices: Vector[] = [];
    for (const originalVertex of originalVertices)
      if (!uniqueOriginalVertices.some((v) => isWithinTolerance(v, originalVertex)))
        uniqueOriginalVertices.push(originalVertex);

    const dualNodes: DualPolygon[] = [];
    for (let i = 0; i < uniqueOriginalVertices.length; i++) {
      const centroid = uniqueOriginalVertices[i];

      const neighboringPolygons: Polygon[] = [];
      for (let j = 0; j < this.tiling.nodes.length; j++) {
        let belongsToCentroid = false;
        for (let k = 0; k < this.tiling.nodes[j].vertices.length; k++) {
          if (isWithinTolerance(this.tiling.nodes[j].vertices[k], centroid)) {
            belongsToCentroid = true;
            break;
          }
        }
        if (belongsToCentroid) neighboringPolygons.push(this.tiling.nodes[j]);
      }

      if (neighboringPolygons.length < 3) continue;

      const neighboringHalfwayPoints: Vector[] = [];
      for (let k0 = 0; k0 < neighboringPolygons.length; k0++) {
        for (let k = 0; k < neighboringPolygons[k0].halfways.length; k++) {
          const angle = angleBetween(
            neighboringPolygons[k0].centroid,
            neighboringPolygons[k0].halfways[k],
            centroid,
          );
          if (Math.abs(angle - Math.PI / 2) < TOLERANCE || Math.abs(angle + Math.PI / 2) < TOLERANCE) {
            neighboringHalfwayPoints.push(neighboringPolygons[k0].halfways[k]);
          }
        }
      }

      const uniqueNeighboringHalfwayPoints: Vector[] = [];
      for (let k1 = 0; k1 < neighboringHalfwayPoints.length; k1++) {
        if (!uniqueNeighboringHalfwayPoints.some((point) => isWithinTolerance(point, neighboringHalfwayPoints[k1]))) {
          uniqueNeighboringHalfwayPoints.push(neighboringHalfwayPoints[k1]);
        }
      }

      if (neighboringPolygons.length < uniqueNeighboringHalfwayPoints.length) continue;

      const vertices = neighboringPolygons.map((polygon) => polygon.centroid);

      vertices.sort((a, b) => {
        let angleToCentroidA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
        let angleToCentroidB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
        if (angleToCentroidA < 0) angleToCentroidA += 2 * Math.PI;
        if (angleToCentroidB < 0) angleToCentroidB += 2 * Math.PI;
        return angleToCentroidA - angleToCentroidB;
      });

      const halfways: Vector[] = [];
      for (let j = 0; j < vertices.length; j++)
        halfways.push(Vector.midpoint(vertices[j], vertices[(j + 1) % vertices.length]));

      const dualNode = new DualPolygon({
        centroid: centroid.copy(),
        vertices,
        halfways,
      });

      dualNodes.push(dualNode);
    }

    this.tiling.nodes = [...dualNodes];
  };

  calculateNeighbors = (depth: number, neighborhoodType: string): void => {
    const neighborSet = new Set<string>();

    const halfwaysSpatialMap = new Map<string, { nodeIndex: number; halfwayIndex: number }[]>();
    const verticesSpatialMap = new Map<string, { nodeIndex: number; vertexIndex: number }[]>();

    for (let i = 0; i < this.tiling.nodes.length; i++) {
      this.tiling.nodes[i].directNeighbors = [];

      for (let j = 0; j < this.tiling.nodes[i].halfways.length; j++) {
        const hw = this.tiling.nodes[i].halfways[j];
        const key = getSpatialKey(hw.x, hw.y);
        if (!halfwaysSpatialMap.has(key)) halfwaysSpatialMap.set(key, []);
        halfwaysSpatialMap.get(key)!.push({ nodeIndex: i, halfwayIndex: j });
      }

      for (let j = 0; j < this.tiling.nodes[i].vertices.length; j++) {
        const v = this.tiling.nodes[i].vertices[j];
        const key = getSpatialKey(v.x, v.y);
        if (!verticesSpatialMap.has(key)) verticesSpatialMap.set(key, []);
        verticesSpatialMap.get(key)!.push({ nodeIndex: i, vertexIndex: j });
      }
    }

    const addDirectNeighbor = (i: number, k: number): void => {
      const pairKey = i < k ? `${i}-${k}` : `${k}-${i}`;
      if (!neighborSet.has(pairKey)) {
        neighborSet.add(pairKey);
        this.tiling.nodes[i].directNeighbors!.push(this.tiling.nodes[k]);
        this.tiling.nodes[k].directNeighbors!.push(this.tiling.nodes[i]);
      }
    };

    const processedHalfwayCells = new Set<string>();

    for (const [key, entries] of halfwaysSpatialMap.entries()) {
      if (entries.length < 2) continue;

      for (let i = 0; i < entries.length; i++) {
        const entry1 = entries[i];
        const node1 = this.tiling.nodes[entry1.nodeIndex];
        const hw1 = node1.halfways[entry1.halfwayIndex];

        for (let j = i + 1; j < entries.length; j++) {
          const entry2 = entries[j];
          const node2 = this.tiling.nodes[entry2.nodeIndex];
          const hw2 = node2.halfways[entry2.halfwayIndex];

          if (isWithinTolerance(hw1, hw2)) {
            addDirectNeighbor(entry1.nodeIndex, entry2.nodeIndex);
          }
        }
      }

      processedHalfwayCells.add(key);
    }

    for (const [key, entries] of halfwaysSpatialMap.entries()) {
      if (processedHalfwayCells.has(key)) continue;

      const [baseX, baseY] = key.split(',').map(Number);

      for (const entry1 of entries) {
        const node1 = this.tiling.nodes[entry1.nodeIndex];
        const hw1 = node1.halfways[entry1.halfwayIndex];

        for (const [dx, dy] of offsets) {
          if (dx === 0 && dy === 0) continue;

          const adjKey = `${baseX + dx},${baseY + dy}`;
          const adjEntries = halfwaysSpatialMap.get(adjKey) || [];

          for (const entry2 of adjEntries) {
            const node2 = this.tiling.nodes[entry2.nodeIndex];
            const hw2 = node2.halfways[entry2.halfwayIndex];

            if (isWithinTolerance(hw1, hw2)) {
              addDirectNeighbor(entry1.nodeIndex, entry2.nodeIndex);
            }
          }
        }
      }
    }

    for (const node of this.tiling.nodes) node.dualNeighbors = [...node.directNeighbors!];

    if (neighborhoodType === 'moore') {
      const vertexToNodesMap = new Map<string, { v: Vector; nodeIndexes: Set<number> }[]>();

      for (let i = 0; i < this.tiling.nodes.length; i++) {
        for (let j = 0; j < this.tiling.nodes[i].vertices.length; j++) {
          const vertex = this.tiling.nodes[i].vertices[j];
          const key = getSpatialKey(vertex.x, vertex.y);

          const baseX = Math.floor(vertex.x / (TOLERANCE * 2));
          const baseY = Math.floor(vertex.y / (TOLERANCE * 2));

          const canonicalVertex = vertex;
          let canonicalKey: string | null = null;

          for (const [dx, dy] of offsets) {
            const nearbyKey = `${baseX + dx},${baseY + dy}`;
            const existingVertices = vertexToNodesMap.get(nearbyKey);
            if (!existingVertices) continue;

            for (const { v } of existingVertices) {
              if (isWithinTolerance(vertex, v)) {
                canonicalKey = nearbyKey;
                break;
              }
            }

            if (canonicalKey) break;
          }

          if (!canonicalKey) {
            canonicalKey = key;
            if (!vertexToNodesMap.has(canonicalKey)) vertexToNodesMap.set(canonicalKey, []);
            vertexToNodesMap.get(canonicalKey)!.push({
              v: canonicalVertex,
              nodeIndexes: new Set([i]),
            });
          } else {
            for (const entry of vertexToNodesMap.get(canonicalKey)!) {
              if (isWithinTolerance(entry.v, canonicalVertex)) {
                entry.nodeIndexes.add(i);
                break;
              }
            }
          }
        }
      }

      for (const entries of vertexToNodesMap.values()) {
        for (const { nodeIndexes } of entries) {
          if (nodeIndexes.size < 2) continue;

          const nodeIndexArray = Array.from(nodeIndexes);

          for (let i = 0; i < nodeIndexArray.length; i++) {
            for (let j = i + 1; j < nodeIndexArray.length; j++) {
              const node1Index = nodeIndexArray[i];
              const node2Index = nodeIndexArray[j];

              const isSideNeighbors = this.tiling.nodes[node1Index].directNeighbors!.some(
                (neighbor) => isWithinTolerance(neighbor.centroid, this.tiling.nodes[node2Index].centroid),
              );

              if (!isSideNeighbors) addDirectNeighbor(node1Index, node2Index);
            }
          }
        }
      }
    }

    for (let i = 0; i < this.tiling.nodes.length; i++) {
      const node = this.tiling.nodes[i];

      node.neighbors = [];

      if (depth === 1) {
        node.neighbors = [...node.directNeighbors!];
        continue;
      }

      const visited = new Set<Polygon>([node]);
      const allNeighbors = new Set<Polygon>();

      const queue: { node: Polygon; depth: number }[] = [];

      for (const neighbor of node.directNeighbors!) {
        queue.push({ node: neighbor, depth: 1 });
        visited.add(neighbor);
        allNeighbors.add(neighbor);
      }

      while (queue.length > 0) {
        const { node: currentNode, depth: currentDepth } = queue.shift()!;

        if (currentDepth >= depth) continue;

        for (const nextNode of currentNode.directNeighbors!) {
          if (!visited.has(nextNode)) {
            visited.add(nextNode);
            allNeighbors.add(nextNode);
            queue.push({ node: nextNode, depth: currentDepth + 1 });
          }
        }
      }

      node.neighbors = Array.from(allNeighbors);
    }

    for (let i = 0; i < this.tiling.nodes.length; i++) {
      delete this.tiling.nodes[i].directNeighbors;
    }
  };
}
