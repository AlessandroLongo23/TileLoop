// Pure drawing geometry for the tile editor, ported from the legacy tileEditor
// Svelte page. Framework-agnostic; the React component supplies state.
import { Vector } from '@tileloop/core';

export interface Point {
  x: number;
  y: number;
}
export interface Edge {
  p1: Point;
  p2: Point;
  index?: number;
}
export interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface GridConfig {
  type: 'square' | 'triangle' | 'hexagon';
  cellSize: number;
}

export function getGridConfig(selectedShape: number, canvasSize: number, gridSize: number): GridConfig {
  const map: Record<number, GridConfig> = {
    3: { type: 'triangle', cellSize: canvasSize / gridSize / 2 },
    4: { type: 'square', cellSize: canvasSize / gridSize },
    6: { type: 'hexagon', cellSize: canvasSize / gridSize / 2 },
    8: { type: 'square', cellSize: canvasSize / gridSize },
    12: { type: 'square', cellSize: canvasSize / gridSize },
  };
  return map[selectedShape] ?? map[4];
}

export function generatePolygonPoints(sides: number): Vector[] {
  const points: Vector[] = [];
  const centerAngle = (2 * Math.PI) / sides;
  const offsetAngle = sides === 3 ? -Math.PI / 2 : -Math.PI / 2 + centerAngle / 2;
  for (let i = 0; i < sides; i++) points.push(Vector.fromAngle(i * centerAngle + offsetAngle));
  return points;
}

export function snapToGrid(
  point: Point,
  grid: GridConfig,
  canvasSize: number,
  gridSize: number,
): Vector {
  const center = new Vector(canvasSize / 2, canvasSize / 2);

  if (grid.type === 'square') {
    const radius = canvasSize / 2 / Math.sqrt(2);
    const gridSpacing = (radius * 2) / gridSize;
    const origin = Vector.sub(center, new Vector(radius, radius));
    return new Vector(
      origin.x + Math.round((point.x - origin.x) / gridSpacing) * gridSpacing,
      origin.y + Math.round((point.y - origin.y) / gridSpacing) * gridSpacing,
    );
  }

  const cellSize = grid.type === 'hexagon' ? (grid.cellSize * Math.sqrt(3)) / 3 : grid.cellSize;
  const rel = Vector.sub(new Vector(point.x, point.y), center);
  const q = ((Math.sqrt(3) / 3) * rel.x - (1 / 3) * rel.y) / cellSize;
  const r = ((2 / 3) * rel.y) / cellSize;
  const s = -q - r;

  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  else rs = -rq - rr;

  return new Vector(
    center.x + cellSize * (Math.sqrt(3) * rq + (Math.sqrt(3) / 2) * rr),
    center.y + cellSize * ((3 / 2) * rr),
  );
}

export function generateGridLines(
  grid: GridConfig,
  canvasSize: number,
  gridSize: number,
  polygonPoints: Vector[],
): GridLine[] {
  const lines: GridLine[] = [];
  const center = new Vector(canvasSize / 2, canvasSize / 2);

  if (grid.type === 'square') {
    const radius = canvasSize / 2 / Math.sqrt(2);
    for (let i = 0; i <= gridSize; i++) {
      const x = center.x - radius + (i * (radius * 2)) / gridSize;
      lines.push({ x1: x, y1: center.y - radius, x2: x, y2: center.y + radius });
    }
    for (let i = 0; i <= gridSize; i++) {
      const y = center.y - radius + (i * (radius * 2)) / gridSize;
      lines.push({ x1: center.x - radius, y1: y, x2: center.x + radius, y2: y });
    }
    return lines;
  }

  const cellSize =
    grid.type === 'triangle'
      ? (Vector.distance(polygonPoints[0], polygonPoints[1]) * canvasSize) / 2 / gridSize
      : grid.cellSize;
  const hexHeight = (cellSize * Math.sqrt(3)) / 2;
  const extent = hexHeight * 24;

  for (let row = -Math.ceil(extent / hexHeight); row <= Math.ceil(extent / hexHeight); row++) {
    const y = center.y + row * hexHeight;
    lines.push({ x1: center.x - extent, y1: y, x2: center.x + extent, y2: y });
  }
  const cols = Math.ceil(extent / cellSize);
  for (const slope of [-Math.tan(Math.PI / 3), Math.tan(Math.PI / 3)]) {
    for (let col = -cols; col <= cols; col++) {
      const startX = center.x + col * cellSize;
      lines.push({
        x1: startX - extent,
        y1: center.y + slope * -extent,
        x2: startX + extent,
        y2: center.y + slope * extent,
      });
    }
  }
  return lines;
}

export function closestPointOnLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Point {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

export function findClosestPointOnPolygon(
  mouseX: number,
  mouseY: number,
  canvasPolygonPoints: Vector[],
): { point: Point; edge: Edge | null; distance: number } {
  let closestPoint: Point | null = null;
  let minDistance = Infinity;
  let closestEdge: Edge | null = null;
  for (let i = 0; i < canvasPolygonPoints.length; i++) {
    const p1 = canvasPolygonPoints[i];
    const p2 = canvasPolygonPoints[(i + 1) % canvasPolygonPoints.length];
    const pointOnEdge = closestPointOnLineSegment(mouseX, mouseY, p1.x, p1.y, p2.x, p2.y);
    const distance = Math.hypot(pointOnEdge.x - mouseX, pointOnEdge.y - mouseY);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = pointOnEdge;
      closestEdge = { p1, p2, index: i };
    }
  }
  return { point: closestPoint ?? { x: mouseX, y: mouseY }, edge: closestEdge, distance: minDistance };
}

export function findClosestGridPointOnPolygonEdge(
  mousePoint: Point,
  grid: GridConfig,
  canvasSize: number,
  gridSize: number,
  canvasPolygonPoints: Vector[],
): { point: Point; edge: Edge | null } {
  let closestPoint: Point | null = null;
  let closestEdge: Edge | null = null;
  let minDistance = Infinity;

  const gridSpacing = grid.cellSize;
  const searchRadius = gridSpacing * 3;
  const mouseGridPoint = snapToGrid(mousePoint, grid, canvasSize, gridSize);

  for (let dx = -searchRadius; dx <= searchRadius; dx += gridSpacing) {
    for (let dy = -searchRadius; dy <= searchRadius; dy += gridSpacing) {
      const testPoint = new Vector(mouseGridPoint.x + dx, mouseGridPoint.y + dy);
      for (let i = 0; i < canvasPolygonPoints.length; i++) {
        const p1 = canvasPolygonPoints[i];
        const p2 = canvasPolygonPoints[(i + 1) % canvasPolygonPoints.length];
        const pointOnEdge = closestPointOnLineSegment(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);
        const distanceToEdge = Math.hypot(pointOnEdge.x - testPoint.x, pointOnEdge.y - testPoint.y);
        const tolerance = gridSpacing * 0.1;
        if (distanceToEdge <= tolerance) {
          const distanceToMouse = Vector.distance(testPoint, new Vector(mousePoint.x, mousePoint.y));
          if (distanceToMouse < minDistance) {
            minDistance = distanceToMouse;
            closestPoint = pointOnEdge;
            closestEdge = { p1, p2, index: i };
          }
        }
      }
    }
  }

  if (!closestPoint) {
    const edgeSnap = findClosestPointOnPolygon(mousePoint.x, mousePoint.y, canvasPolygonPoints);
    const snappedPoint = snapToGrid(edgeSnap.point, grid, canvasSize, gridSize);
    return { point: snappedPoint, edge: edgeSnap.edge };
  }
  return { point: closestPoint, edge: closestEdge };
}

export function getTangentDirection(edge: Edge): Point {
  const dx = edge.p2.x - edge.p1.x;
  const dy = edge.p2.y - edge.p1.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  return { x: dx / length, y: dy / length };
}

export function createHermiteArc(point1: Point, tangent1: Point, point2: Point, tangent2: Point): string {
  const d1Length = Math.hypot(tangent1.x, tangent1.y);
  const d2Length = Math.hypot(tangent2.x, tangent2.y);
  const d1 = { x: tangent1.x / d1Length, y: tangent1.y / d1Length };
  const d2 = { x: tangent2.x / d2Length, y: tangent2.y / d2Length };
  const n1Base = { x: -d1.y, y: d1.x };
  const n2Base = { x: -d2.y, y: d2.x };
  const p1ToP2 = { x: point2.x - point1.x, y: point2.y - point1.y };
  const p2ToP1 = { x: point1.x - point2.x, y: point1.y - point2.y };
  const sign1 = Math.sign(p1ToP2.x * n1Base.x + p1ToP2.y * n1Base.y);
  const sign2 = Math.sign(p2ToP1.x * n2Base.x + p2ToP1.y * n2Base.y);
  const n1 = { x: sign1 * n1Base.x, y: sign1 * n1Base.y };
  const n2 = { x: -sign2 * n2Base.x, y: -sign2 * n2Base.y };
  const dist = Math.hypot(p1ToP2.x, p1ToP2.y);
  const L = dist * 1.41;
  const m1 = { x: n1.x * L, y: n1.y * L };
  const m2 = { x: n2.x * L, y: n2.y * L };

  const hermite = (p0: Point, p1: Point, r0: Point, r1: Point, t: number): Point => {
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t;
    const h11 = t * t * t - t * t;
    return {
      x: h00 * p0.x + h10 * r0.x + h01 * p1.x + h11 * r1.x,
      y: h00 * p0.y + h10 * r0.y + h01 * p1.y + h11 * r1.y,
    };
  };

  const numPoints = 20;
  let path = `M ${point1.x} ${point1.y}`;
  for (let i = 1; i <= numPoints; i++) {
    const point = hermite(point1, point2, m1, m2, i / numPoints);
    path += ` L ${point.x} ${point.y}`;
  }
  return path;
}

export function arePointsOnSameEdge(edge1: Edge, edge2: Edge): boolean {
  const tol = 1e-6;
  return (
    (Math.abs(edge1.p1.x - edge2.p1.x) < tol &&
      Math.abs(edge1.p1.y - edge2.p1.y) < tol &&
      Math.abs(edge1.p2.x - edge2.p2.x) < tol &&
      Math.abs(edge1.p2.y - edge2.p2.y) < tol) ||
    (Math.abs(edge1.p1.x - edge2.p2.x) < tol &&
      Math.abs(edge1.p1.y - edge2.p2.y) < tol &&
      Math.abs(edge1.p2.x - edge2.p1.x) < tol &&
      Math.abs(edge1.p2.y - edge2.p1.y) < tol)
  );
}

export function createPerpendicularArc(point1: Point, edge1: Edge, point2: Point, edge2: Edge): string {
  const tan1 = getTangentDirection(edge1);
  const tan2 = getTangentDirection(edge2);
  const onSameEdge = arePointsOnSameEdge(edge1, edge2);
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const det = tan1.x * -tan2.y - tan1.y * -tan2.x;

  if (Math.abs(det) < 1e-10) {
    if (onSameEdge) {
      const radius = Math.hypot(dx, dy) / 2;
      return `M ${point1.x} ${point1.y} A ${radius} ${radius} 0 0 1 ${point2.x} ${point2.y}`;
    }
    return createHermiteArc(point1, tan1, point2, tan2);
  }

  const t1 = (dx * -tan2.y - dy * -tan2.x) / det;
  const centerX = point1.x + t1 * tan1.x;
  const centerY = point1.y + t1 * tan1.y;
  const dist1 = Math.hypot(point1.x - centerX, point1.y - centerY);
  const dist2 = Math.hypot(point2.x - centerX, point2.y - centerY);
  const distDiff = Math.abs(dist1 - dist2);
  const avgDist = (dist1 + dist2) / 2;
  const distanceTolerance = avgDist * 0.05;
  const dotProduct = tan1.x * tan2.x + tan1.y * tan2.y;
  const isPerpendicular = Math.abs(dotProduct) < 0.05;

  if (!onSameEdge && !isPerpendicular && distDiff > distanceTolerance) {
    return createHermiteArc(point1, tan1, point2, tan2);
  }

  const semiAxis1 = dist1;
  const semiAxis2 = dist2;
  const angle1 = Math.atan2(point1.y - centerY, point1.x - centerX);
  const angle2 = Math.atan2(point2.y - centerY, point2.x - centerX);
  let angleDiff = angle2 - angle1;
  if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
  const sweepFlag = angleDiff > 0 ? 1 : 0;
  const radiusDiff = Math.abs(semiAxis1 - semiAxis2);
  const avgRadius = (semiAxis1 + semiAxis2) / 2;

  if (radiusDiff > avgRadius * 0.05) {
    const majorAxis = Math.max(semiAxis1, semiAxis2);
    const minorAxis = Math.min(semiAxis1, semiAxis2);
    const rotationAngle =
      semiAxis1 > semiAxis2
        ? (Math.atan2(point1.y - centerY, point1.x - centerX) * 180) / Math.PI
        : (Math.atan2(point2.y - centerY, point2.x - centerX) * 180) / Math.PI;
    return `M ${point1.x} ${point1.y} A ${majorAxis} ${minorAxis} ${rotationAngle} ${largeArcFlag} ${sweepFlag} ${point2.x} ${point2.y}`;
  }
  return `M ${point1.x} ${point1.y} A ${avgRadius} ${avgRadius} 0 ${largeArcFlag} ${sweepFlag} ${point2.x} ${point2.y}`;
}

export function createSpline(points: Point[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x - (next.x - prev.x) * 0.15;
    const cp1y = curr.y - (next.y - prev.y) * 0.15;
    const cp2x = curr.x + (next.x - prev.x) * 0.15;
    const cp2y = curr.y + (next.y - prev.y) * 0.15;
    if (i === 1) path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`;
    else path += ` S ${cp2x} ${cp2y} ${next.x} ${next.y}`;
  }
  return path;
}

export function distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx: number;
  let yy: number;
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  return Math.hypot(point.x - xx, point.y - yy);
}

export function createGlowingSVG(polygonPoints: string, internalElements: string, sides: number): string {
  const maskElements = internalElements
    .replace(/<polygon[^>]*id="border-polygon"[^>]*\/?>/g, '')
    .replace(/stroke="#[^"]*"/g, 'stroke="white"')
    .replace(/fill="[^"]*"/g, 'fill="none"');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <defs>
        <clipPath id="polygon-clip-${sides}"><polygon points="${polygonPoints}"/></clipPath>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="tinyBlur"/>
            <feGaussianBlur stdDeviation="16" result="smallBlur"/>
            <feGaussianBlur stdDeviation="32" result="mediumBlur"/>
            <feGaussianBlur stdDeviation="64" result="largeBlur"/>
            <feMerge>
                <feMergeNode in="largeBlur"/><feMergeNode in="mediumBlur"/>
                <feMergeNode in="smallBlur"/><feMergeNode in="tinyBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <radialGradient id="redGradient" cx="50%" cy="50%" r="100%">
            <stop id="gradientStop1" offset="7%" style="stop-color:#1e293b;stop-opacity:1"/>
            <stop id="gradientStop2" offset="20%" style="stop-color:#1e293b;stop-opacity:1"/>
        </radialGradient>
        <mask id="pathMask"><rect width="100%" height="100%" fill="black"/>${maskElements}</mask>
    </defs>
    <polygon fill="white" id="base-polygon" stroke="none" points="${polygonPoints}"/>
    <g clip-path="url(#polygon-clip-${sides})">
        <polygon id="border-polygon" fill="none" stroke="#ff0000" stroke-width="0" filter="url(#glow)" points="${polygonPoints}"/>
    </g>
    <g clip-path="url(#polygon-clip-${sides})">
        <rect width="100%" height="100%" fill="url(#redGradient)" mask="url(#pathMask)"/>
    </g>
</svg>`;
}
