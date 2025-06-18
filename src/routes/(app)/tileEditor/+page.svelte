<script>
	import { onMount } from 'svelte';
	import { 
		Pen, Circle, Move3D, Square, Triangle, Hexagon, Octagon, Settings,
		Undo2, Redo2, Eraser, Spline, MousePointer2, RotateCcw, Download,
		Trash2, Grid3X3, Eye, EyeOff
	} from 'lucide-svelte';
	import { Vector } from '$lib/classes/Vector.svelte.js'

	// import Sidebar from '$lib/components/Sidebar.svelte';

	let canvas;
	let svg;
	let selectedTool = $state('line');
	let selectedShape = $state(4); // Default to square
	let arcMode = $state('perpendicular'); // 'perpendicular' or 'free'
	let isDrawing = $state(false);
	let currentPath = $state('');
	let gridSize = $state(6);
	let canvasSize = $state(600);
	let showGrid = $state(true);
	
	// Undo/Redo system
	let history = $state([]);
	let historyIndex = $state(-1);
	let elements = $state([]);
	
	let tempElement = $state(null);
	let startPoint = $state(null);
	let arcPoints = $state([]); // For free mode arc (point1, point2, center)
	let arcStep = $state(0); // 0: selecting center, 1: dragging to create arc
	let splinePoints = $state([]); // For spline tool
	let isSplineMode = $state(false);

	// Free arc mode states
	let freeArcCenter = $state(null);
	let freeArcPreview = $state(null);

	let gridConfig = $derived({
		3: { type: 'triangle', cellSize: canvasSize / gridSize / 2 },
		4: { type: 'square', cellSize: canvasSize / gridSize },
		6: { type: 'hexagon', cellSize: canvasSize / gridSize / 2 },
		8: { type: 'square', cellSize: canvasSize / gridSize },
		12: { type: 'square', cellSize: canvasSize / gridSize }
	}[selectedShape]);

	// Keyboard shortcuts
	onMount(() => {
		function handleKeydown(event) {
			if (event.ctrlKey || event.metaKey) {
				switch (event.key) {
					case 'z':
						event.preventDefault();
						if (event.shiftKey) {
							redo();
						} else {
							undo();
						}
						break;
					case 'y':
						event.preventDefault();
						redo();
						break;
					case 'e':
						event.preventDefault();
						selectedTool = 'eraser';
						break;
					case 'l':
						event.preventDefault();
						selectedTool = 'line';
						break;
					case 'a':
						event.preventDefault();
						selectedTool = 'arc';
						break;
					case 'c':
						event.preventDefault();
						selectedTool = 'circle';
						break;
					case 's':
						event.preventDefault();
						selectedTool = 'spline';
						break;
				}
			}
			
			if (event.key === 'Escape') {
				cancelCurrentAction();
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	function saveToHistory() {
		history = history.slice(0, historyIndex + 1);
		history.push(JSON.parse(JSON.stringify(elements)));
		historyIndex = history.length - 1;
		if (history.length > 50) {
			history = history.slice(-50);
			historyIndex = history.length - 1;
		}
	}

	function undo() {
		if (historyIndex > 0) {
			historyIndex--;
			elements = JSON.parse(JSON.stringify(history[historyIndex]));
		}
	}

	function redo() {
		if (historyIndex < history.length - 1) {
			historyIndex++;
			elements = JSON.parse(JSON.stringify(history[historyIndex]));
		}
	}

	function cancelCurrentAction() {
		isDrawing = false;
		tempElement = null;
		startPoint = null;
		arcPoints = [];
		arcStep = 0;
		splinePoints = [];
		isSplineMode = false;
		freeArcCenter = null;
		freeArcPreview = null;
	}

	$effect(() => {
		cancelCurrentAction();
	});

	function generatePolygonPoints(sides) {
		const points = [];
		const centerAngle = (2 * Math.PI) / sides;
        const offsetAngle = sides === 3 ? -Math.PI / 2 : -Math.PI / 2 + centerAngle / 2;
		
		for (let i = 0; i < sides; i++)
			points.push(Vector.fromAngle((i * centerAngle) + offsetAngle));
		
		return points;
	}

	function isPointInPolygon(point, polygon) {
		let inside = false;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const xi = polygon[i].x, yi = polygon[i].y;
			const xj = polygon[j].x, yj = polygon[j].y;
			
			if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
				inside = !inside;
			}
		}
		return inside;
	}

	function snapToGrid(point) {
		const center = new Vector(canvasSize / 2, canvasSize / 2);
		
		if (gridConfig.type === 'square') {
			const radius = canvasSize / 2 / Math.sqrt(2);
			const gridSpacing = (radius * 2) / gridSize;
			const origin = Vector.sub(center, new Vector(radius, radius));
			const cellSize = gridConfig.cellSize;
			
			return new Vector(
				origin.x + Math.round((point.x - origin.x) / gridSpacing) * gridSpacing,
				origin.y + Math.round((point.y - origin.y) / gridSpacing) * gridSpacing
			);
		} else if (gridConfig.type === 'triangle') {
			const cellSize = gridConfig.cellSize;
			const hexHeight = cellSize * Math.sqrt(3) / 2;
			
			const rel = Vector.sub(point, center);
			
			const q = (Math.sqrt(3) / 3 * rel.x - 1 / 3 * rel.y) / cellSize;
			const r = (2 / 3 * rel.y) / cellSize;
			const s = -q - r;
			
			let rq = Math.round(q);
			let rr = Math.round(r);
			let rs = Math.round(s);
			
			const qDiff = Math.abs(rq - q);
			const rDiff = Math.abs(rr - r);
			const sDiff = Math.abs(rs - s);
			
			if (qDiff > rDiff && qDiff > sDiff) {
				rq = -rr - rs;
			} else if (rDiff > sDiff) {
				rr = -rq - rs;
			} else {
				rs = -rq - rr;
			}
			
			const snap = new Vector(
				center.x + cellSize * (Math.sqrt(3) * rq + Math.sqrt(3) / 2 * rr),
				center.y + cellSize * (3 / 2 * rr)
			);
			
			return snap;
		} else if (gridConfig.type === 'hexagon') {
			const cellSize = gridConfig.cellSize * Math.sqrt(3) / 3;
			const hexHeight = cellSize * Math.sqrt(3) / 2;
			
			const rel = Vector.sub(point, center);
			
			const q = (Math.sqrt(3) / 3 * rel.x - 1 / 3 * rel.y) / cellSize;
			const r = (2 / 3 * rel.y) / cellSize;
			const s = -q - r;
			
			let rq = Math.round(q);
			let rr = Math.round(r);
			let rs = Math.round(s);
			
			const qDiff = Math.abs(rq - q);
			const rDiff = Math.abs(rr - r);
			const sDiff = Math.abs(rs - s);
			
			if (qDiff > rDiff && qDiff > sDiff) {
				rq = -rr - rs;
			} else if (rDiff > sDiff) {
				rr = -rq - rs;
			} else {
				rs = -rq - rr;
			}
			
			const snap = new Vector(
				center.x + cellSize * (Math.sqrt(3) * rq + Math.sqrt(3) / 2 * rr),
				center.y + cellSize * (3 / 2 * rr)
			);
			
			return snap;
		}
		
		return point;
	}

	function generateGridLines() {
		const lines = [];
		const cellSize = gridConfig.cellSize;
		const center = new Vector(canvasSize / 2, canvasSize / 2);
		
		if (gridConfig.type === 'square') {
			const radius = canvasSize / 2 / Math.sqrt(2);
			
			for (let i = 0; i <= gridSize; i++) {
				const x = center.x - radius + (i * (radius * 2) / gridSize);
				lines.push({
					x1: x,
					y1: center.y - radius,
					x2: x,
					y2: center.y + radius
				});
			}
			for (let i = 0; i <= gridSize; i++) {
				const y = center.y - radius + (i * (radius * 2) / gridSize);
				lines.push({
					x1: center.x - radius,
					y1: y,
					x2: center.x + radius,
					y2: y
				});
			}
		} else if (gridConfig.type === 'triangle') {
			const cellSize = Vector.distance(polygonPoints[0], polygonPoints[1]) * canvasSize / 2 / gridSize
			const hexHeight = cellSize * Math.sqrt(3) / 2;
			const extent = hexHeight * 24
			const radius = extent
				
			for (let row = -Math.ceil(extent / hexHeight); row <= Math.ceil(extent / hexHeight); row++) {
				const y = center.y + row * hexHeight;
				lines.push({
					x1: center.x - extent,
					y1: y,
					x2: center.x + extent,
					y2: y
				});
			}
			
			const cols = Math.ceil(extent / cellSize);
			for (let col = -cols; col <= cols; col++) {
				const startX = center.x + col * cellSize;
				const slope = -Math.tan(Math.PI / 3);
				
				const x1 = startX - extent;
				const y1 = center.y + slope * (-extent);
				const x2 = startX + extent;
				const y2 = center.y + slope * extent;
				
				lines.push({ x1, y1, x2, y2 });
			}
			
			for (let col = -cols; col <= cols; col++) {
				const startX = center.x + col * cellSize;
				const slope = Math.tan(Math.PI / 3);
				
				const x1 = startX - extent;
				const y1 = center.y + slope * (-extent);
				const x2 = startX + extent;
				const y2 = center.y + slope * extent;
				
				lines.push({ x1, y1, x2, y2 });
			}
		} else if (gridConfig.type === 'hexagon') {
			const hexHeight = cellSize * Math.sqrt(3) / 2;
			const extent = hexHeight * 24
			const radius = extent
				
			for (let row = -Math.ceil(extent / hexHeight); row <= Math.ceil(extent / hexHeight); row++) {
				const y = center.y + row * hexHeight;
				lines.push({
					x1: center.x - extent,
					y1: y,
					x2: center.x + extent,
					y2: y
				});
			}
			
			const cols = Math.ceil(extent / cellSize);
			for (let col = -cols; col <= cols; col++) {
				const startX = center.x + col * cellSize;
				const slope = -Math.tan(Math.PI / 3);
				
				const x1 = startX - extent;
				const y1 = center.y + slope * (-extent);
				const x2 = startX + extent;
				const y2 = center.y + slope * extent;
				
				lines.push({ x1, y1, x2, y2 });
			}
			
			for (let col = -cols; col <= cols; col++) {
				const startX = center.x + col * cellSize;
				const slope = Math.tan(Math.PI / 3);
				
				const x1 = startX - extent;
				const y1 = center.y + slope * (-extent);
				const x2 = startX + extent;
				const y2 = center.y + slope * extent;
				
				lines.push({ x1, y1, x2, y2 });
			}
		}
		
		return lines;
	}

	function getMousePosition(event) {
		const rect = svg.getBoundingClientRect();
		const point = new Vector(event.clientX - rect.left, event.clientY - rect.top);
		
		if (selectedTool === 'arc' && arcMode === 'perpendicular') {
			// For perpendicular arc mode, find the closest grid point that lies on a polygon edge
			const gridEdgeSnap = findClosestGridPointOnPolygonEdge(point);
			return gridEdgeSnap.point;
		}
		
		return snapToGrid(point);
	}

	function findClosestGridPointOnPolygonEdge(mousePoint) {
		let closestPoint = null;
		let closestEdge = null;
		let minDistance = Infinity;
		
		// Generate a grid of points around the mouse position
		const gridSpacing = gridConfig.cellSize;
		const searchRadius = gridSpacing * 3; // Search in a 3x3 grid area around mouse
		
		const mouseGridPoint = snapToGrid(mousePoint);
		
		// Check grid points in the area around the mouse
		for (let dx = -searchRadius; dx <= searchRadius; dx += gridSpacing) {
			for (let dy = -searchRadius; dy <= searchRadius; dy += gridSpacing) {
				const testPoint = new Vector(mouseGridPoint.x + dx, mouseGridPoint.y + dy);
				
				// Check if this grid point is close to any polygon edge
				for (let i = 0; i < canvasPolygonPoints.length; i++) {
					const p1 = canvasPolygonPoints[i];
					const p2 = canvasPolygonPoints[(i + 1) % canvasPolygonPoints.length];
					
					const pointOnEdge = closestPointOnLineSegment(testPoint.x, testPoint.y, p1.x, p1.y, p2.x, p2.y);
					const distanceToEdge = Math.sqrt(
						Math.pow(pointOnEdge.x - testPoint.x, 2) + Math.pow(pointOnEdge.y - testPoint.y, 2)
					);
					
					// If the grid point is very close to the edge (within tolerance)
					const tolerance = gridSpacing * 0.1; // 10% of grid spacing
					if (distanceToEdge <= tolerance) {
						const distanceToMouse = Vector.distance(testPoint, mousePoint);
						if (distanceToMouse < minDistance) {
							minDistance = distanceToMouse;
							closestPoint = pointOnEdge; // Use the exact point on the edge
							closestEdge = { p1, p2, index: i };
						}
					}
				}
			}
		}
		
		// If no grid point was found on an edge, fall back to closest point on any edge
		if (!closestPoint) {
			const edgeSnap = findClosestPointOnPolygon(mousePoint.x, mousePoint.y);
			// Snap this point to the nearest grid position
			const snappedPoint = snapToGrid(new Vector(edgeSnap.point.x, edgeSnap.point.y));
			return { point: snappedPoint, edge: edgeSnap.edge };
		}
		
		return { point: closestPoint, edge: closestEdge };
	}

	function findClosestPointOnPolygon(mouseX, mouseY) {
		let closestPoint = null;
		let minDistance = Infinity;
		let closestEdge = null;
		
		for (let i = 0; i < canvasPolygonPoints.length; i++) {
			const p1 = canvasPolygonPoints[i];
			const p2 = canvasPolygonPoints[(i + 1) % canvasPolygonPoints.length];
			
			const pointOnEdge = closestPointOnLineSegment(mouseX, mouseY, p1.x, p1.y, p2.x, p2.y);
			const distance = Math.sqrt(
				Math.pow(pointOnEdge.x - mouseX, 2) + Math.pow(pointOnEdge.y - mouseY, 2)
			);
			
			if (distance < minDistance) {
				minDistance = distance;
				closestPoint = pointOnEdge;
				closestEdge = { p1, p2, index: i };
			}
		}
		
		return { point: closestPoint, edge: closestEdge, distance: minDistance };
	}

	function closestPointOnLineSegment(px, py, x1, y1, x2, y2) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const length = Math.sqrt(dx * dx + dy * dy);
		
		if (length === 0) return { x: x1, y: y1 };
		
		const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
		
		return {
			x: x1 + t * dx,
			y: y1 + t * dy
		};
	}

	function getTangentDirection(edge) {
		const dx = edge.p2.x - edge.p1.x;
		const dy = edge.p2.y - edge.p1.y;
		const length = Math.sqrt(dx * dx + dy * dy);
		
		return {
			x: dx / length,
			y: dy / length
		};
	}

	function createHermiteArc(point1, tangent1, point2, tangent2) {
		// Normalize direction vectors
		const d1Length = Math.sqrt(tangent1.x * tangent1.x + tangent1.y * tangent1.y);
		const d2Length = Math.sqrt(tangent2.x * tangent2.x + tangent2.y * tangent2.y);
		
		const d1 = { x: tangent1.x / d1Length, y: tangent1.y / d1Length };
		const d2 = { x: tangent2.x / d2Length, y: tangent2.y / d2Length };
		
		// Compute normals (perpendicular to directions)
		const n1Base = { x: -d1.y, y: d1.x };
		const n2Base = { x: -d2.y, y: d2.x };
		
		// Determine sign of normal so that it points toward the other point
		const p1ToP2 = { x: point2.x - point1.x, y: point2.y - point1.y };
		const p2ToP1 = { x: point1.x - point2.x, y: point1.y - point2.y };
		
		const sign1 = Math.sign(p1ToP2.x * n1Base.x + p1ToP2.y * n1Base.y);
		const sign2 = Math.sign(p2ToP1.x * n2Base.x + p2ToP1.y * n2Base.y);
		
		const n1 = { x: sign1 * n1Base.x, y: sign1 * n1Base.y };
		const n2 = { x: -sign2 * n2Base.x, y: -sign2 * n2Base.y };
		
		// Magnitude for Hermite tangents (controls arc curvature)
		const dist = Math.sqrt(p1ToP2.x * p1ToP2.x + p1ToP2.y * p1ToP2.y);
		const L = dist * 1.41;
		const m1 = { x: n1.x * L, y: n1.y * L };
		const m2 = { x: n2.x * L, y: n2.y * L };
		
		// Hermite basis functions
		function hermiteCurve(p0, p1, r0, r1, t) {
			const h00 = 2 * t * t * t - 3 * t * t + 1;
			const h10 = t * t * t - 2 * t * t + t;
			const h01 = -2 * t * t * t + 3 * t * t;
			const h11 = t * t * t - t * t;
			
			return {
				x: h00 * p0.x + h10 * r0.x + h01 * p1.x + h11 * r1.x,
				y: h00 * p0.y + h10 * r0.y + h01 * p1.y + h11 * r1.y
			};
		}
		
		// Generate curve points and convert to SVG path
		const numPoints = 20;
		let path = `M ${point1.x} ${point1.y}`;
		
		for (let i = 1; i <= numPoints; i++) {
			const t = i / numPoints;
			const point = hermiteCurve(point1, point2, m1, m2, t);
			if (i === 1) {
				path += ` L ${point.x} ${point.y}`;
			} else {
				path += ` L ${point.x} ${point.y}`;
			}
		}
		
		return path;
	}

	function arePointsOnSameEdge(point1, edge1, point2, edge2) {
		// Check if both edges are the same by comparing their endpoints
		const tolerance = 1e-6;
		
		// Check if edge1 and edge2 have the same endpoints (in either order)
		const sameEdge = (
			(Math.abs(edge1.p1.x - edge2.p1.x) < tolerance && 
			 Math.abs(edge1.p1.y - edge2.p1.y) < tolerance &&
			 Math.abs(edge1.p2.x - edge2.p2.x) < tolerance && 
			 Math.abs(edge1.p2.y - edge2.p2.y) < tolerance) ||
			(Math.abs(edge1.p1.x - edge2.p2.x) < tolerance && 
			 Math.abs(edge1.p1.y - edge2.p2.y) < tolerance &&
			 Math.abs(edge1.p2.x - edge2.p1.x) < tolerance && 
			 Math.abs(edge1.p2.y - edge2.p1.y) < tolerance)
		);
		
		return sameEdge;
	}

	function createPerpendicularArc(point1, edge1, point2, edge2) {
		// Get tangent directions from each edge (parallel to the edges)
		const tan1 = getTangentDirection(edge1);
		const tan2 = getTangentDirection(edge2);
		
		// Check if points are on the same edge - if so, use old method
		const onSameEdge = arePointsOnSameEdge(point1, edge1, point2, edge2);
		
		// Calculate the intersection of the two tangent lines to find the ellipse center
		const dx = point2.x - point1.x;
		const dy = point2.y - point1.y;
		
		// Solve the system of equations for intersection
		const det = tan1.x * (-tan2.y) - tan1.y * (-tan2.x);
		
		// If lines are parallel, use Hermite cubic (unless on same edge)
		if (Math.abs(det) < 1e-10) {
			if (onSameEdge) {
				// For same edge with parallel lines, create a simple arc
				const distance = Math.sqrt(dx * dx + dy * dy);
				const radius = distance / 2;
				return `M ${point1.x} ${point1.y} A ${radius} ${radius} 0 0 1 ${point2.x} ${point2.y}`;
			}
			return createHermiteArc(point1, tan1, point2, tan2);
		}
		
		const t1 = (dx * (-tan2.y) - dy * (-tan2.x)) / det;
		
		// Calculate the ellipse center (intersection of tangent lines)
		const centerX = point1.x + t1 * tan1.x;
		const centerY = point1.y + t1 * tan1.y;
		
		// Calculate distances from center to each point
		const dist1 = Math.sqrt(Math.pow(point1.x - centerX, 2) + Math.pow(point1.y - centerY, 2));
		const dist2 = Math.sqrt(Math.pow(point2.x - centerX, 2) + Math.pow(point2.y - centerY, 2));
		
		// Check if points are equidistant from center (within tolerance)
		const distDiff = Math.abs(dist1 - dist2);
		const avgDist = (dist1 + dist2) / 2;
		const distanceTolerance = avgDist * 0.05; // 5% tolerance
		
		// Check if perpendiculars are at 90 degrees
		const dotProduct = tan1.x * tan2.x + tan1.y * tan2.y;
		const angleTolerance = 0.05; // About 3 degrees in radians
		const isPerpendicular = Math.abs(dotProduct) < angleTolerance;
		
		// Use Hermite cubic if perpendiculars are not at 90 degrees AND points not equidistant
		// BUT always use old method if points are on the same edge
		if (!onSameEdge && !isPerpendicular && distDiff > distanceTolerance) {
			return createHermiteArc(point1, tan1, point2, tan2);
		}
		
		// Otherwise, use the original elliptical arc method
		const semiAxis1 = dist1;
		const semiAxis2 = dist2;
		
		// Calculate angles to determine arc direction
		const angle1 = Math.atan2(point1.y - centerY, point1.x - centerX);
		const angle2 = Math.atan2(point2.y - centerY, point2.x - centerX);
		
		let angleDiff = angle2 - angle1;
		if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
		if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
		
		// Determine arc flags
		const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
		const sweepFlag = angleDiff > 0 ? 1 : 0;
		
		// Check if we need an ellipse or can use a circle
		const radiusDiff = Math.abs(semiAxis1 - semiAxis2);
		const avgRadius = (semiAxis1 + semiAxis2) / 2;
		const radiusTolerance = avgRadius * 0.05;
		
		if (radiusDiff > radiusTolerance) {
			// Create elliptical arc
			const majorAxis = Math.max(semiAxis1, semiAxis2);
			const minorAxis = Math.min(semiAxis1, semiAxis2);
			
			let rotationAngle = 0;
			if (semiAxis1 > semiAxis2) {
				rotationAngle = Math.atan2(point1.y - centerY, point1.x - centerX) * 180 / Math.PI;
			} else {
				rotationAngle = Math.atan2(point2.y - centerY, point2.x - centerX) * 180 / Math.PI;
			}
			
			return `M ${point1.x} ${point1.y} A ${majorAxis} ${minorAxis} ${rotationAngle} ${largeArcFlag} ${sweepFlag} ${point2.x} ${point2.y}`;
		} else {
			// Use circular arc
			return `M ${point1.x} ${point1.y} A ${avgRadius} ${avgRadius} 0 ${largeArcFlag} ${sweepFlag} ${point2.x} ${point2.y}`;
		}
	}

	function createCircularArc(point1, point2, center) {
		const radius1 = Math.sqrt(Math.pow(point1.x - center.x, 2) + Math.pow(point1.y - center.y, 2));
		const radius2 = Math.sqrt(Math.pow(point2.x - center.x, 2) + Math.pow(point2.y - center.y, 2));
		const radius = (radius1 + radius2) / 2;
		
		const angle1 = Math.atan2(point1.y - center.y, point1.x - center.x);
		const angle2 = Math.atan2(point2.y - center.y, point2.x - center.x);
		
		let angleDiff = angle2 - angle1;
		if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
		if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
		
		const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
		const sweepFlag = angleDiff > 0 ? 1 : 0;
		
		return `M ${point1.x} ${point1.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${point2.x} ${point2.y}`;
	}

	function createSpline(points) {
		if (points.length < 2) return '';
		if (points.length === 2) {
			return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
		}

		let path = `M ${points[0].x} ${points[0].y}`;
		
		for (let i = 1; i < points.length - 1; i++) {
			const prev = points[i - 1];
			const curr = points[i];
			const next = points[i + 1];
			
			const cp1x = curr.x - (next.x - prev.x) * 0.15;
			const cp1y = curr.y - (next.y - prev.y) * 0.15;
			const cp2x = curr.x + (next.x - prev.x) * 0.15;
			const cp2y = curr.y + (next.y - prev.y) * 0.15;
			
			if (i === 1) {
				path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`;
			} else {
				path += ` S ${cp2x} ${cp2y} ${next.x} ${next.y}`;
			}
		}
		
		return path;
	}

	function handleMouseDown(event) {
		if (selectedTool === 'move') return;
		
		// Right click cancels current action
		if (event.button === 2) {
			event.preventDefault();
			cancelCurrentAction();
			return;
		}
		
		const currentPoint = getMousePosition(event);

		if (selectedTool === 'eraser') {
			eraseElementAt(currentPoint);
			return;
		}

		if (selectedTool === 'spline') {
			if (!isSplineMode) {
				isSplineMode = true;
				splinePoints = [currentPoint];
			} else {
				splinePoints.push(currentPoint);
			}
			return;
		}

		if (selectedTool === 'arc' && arcMode === 'free') {
			if (arcStep === 0) {
				// First click: select center
				freeArcCenter = currentPoint;
				arcStep = 1;
				return;
			} else if (arcStep === 1) {
				// Second click: set start point and begin dragging
				startPoint = currentPoint;
				isDrawing = true;
				arcStep = 2;
				// Clear the preview since we're now drawing
				freeArcPreview = null;
				
				// Initialize temp element for the arc
				tempElement = {
					type: 'path',
					d: ''
				};
				return;
			}
		}

		isDrawing = true;
		startPoint = currentPoint;

		if (selectedTool === 'line') {
			tempElement = {
				type: 'line',
				x1: startPoint.x,
				y1: startPoint.y,
				x2: startPoint.x,
				y2: startPoint.y
			};
		} else if (selectedTool === 'circle') {
			tempElement = {
				type: 'circle',
				cx: startPoint.x,
				cy: startPoint.y,
				r: 0
			};
		} else if (selectedTool === 'arc' && arcMode === 'perpendicular') {
			// Get the edge information for the start point
			const startEdgeSnap = findClosestGridPointOnPolygonEdge(new Vector(startPoint.x, startPoint.y));
			tempElement = {
				type: 'path',
				d: '',
				startEdge: startEdgeSnap.edge
			};
		}
	}

	function handleMouseMove(event) {
		const currentPoint = getMousePosition(event);

		if (selectedTool === 'arc' && arcMode === 'free' && freeArcCenter && !isDrawing) {
			// Show preview of potential arc
			const distance = Vector.distance(freeArcCenter, currentPoint);
			freeArcPreview = {
				center: freeArcCenter,
				radius: distance,
				startAngle: 0,
				endAngle: Math.PI * 1.5
			};
		}

		if (!isDrawing || !tempElement) return;

		if (selectedTool === 'line') {
			tempElement.x2 = currentPoint.x;
			tempElement.y2 = currentPoint.y;
		} else if (selectedTool === 'circle') {
			const dx = currentPoint.x - tempElement.cx;
			const dy = currentPoint.y - tempElement.cy;
			tempElement.r = Math.sqrt(dx * dx + dy * dy);
		} else if (selectedTool === 'arc' && arcMode === 'free' && freeArcCenter && startPoint) {
			// Create arc from start point to current point, centered at freeArcCenter
			const startRadius = Vector.distance(freeArcCenter, startPoint);
			const currentRadius = Vector.distance(freeArcCenter, currentPoint);
			
			// Use average radius for consistent arc
			const radius = (startRadius + currentRadius) / 2;
			
			// Calculate angles
			const startAngle = Math.atan2(startPoint.y - freeArcCenter.y, startPoint.x - freeArcCenter.x);
			const currentAngle = Math.atan2(currentPoint.y - freeArcCenter.y, currentPoint.x - freeArcCenter.x);
			
			// Project current point onto the circle with the average radius
			const end = Vector.fromPolar(freeArcCenter, radius, currentAngle);
			
			// Calculate angle difference for arc direction
			let angleDiff = currentAngle - startAngle;
			if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
			if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
			
			const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
			const sweepFlag = angleDiff > 0 ? 1 : 0;
			
			tempElement.d = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
		} else if (selectedTool === 'arc' && arcMode === 'perpendicular') {
			// Get the edge information for the current point
			const currentEdgeSnap = findClosestGridPointOnPolygonEdge(currentPoint);
			if (tempElement.startEdge && currentEdgeSnap.edge) {
				tempElement.d = createPerpendicularArc(startPoint, tempElement.startEdge, currentPoint, currentEdgeSnap.edge);
			}
		}
		
		tempElement = tempElement;
	}

	function handleMouseUp(event) {
		// Only handle mouse up if we're actually drawing something
		if (!isDrawing || !tempElement) return;
		
		// Don't finalize the arc if we're in free arc mode and still in the process
		if (selectedTool === 'arc' && arcMode === 'free' && arcStep === 2) {
			// Finalize the free arc
			isDrawing = false;
			saveToHistory();
			elements = [...elements, { ...tempElement, id: Date.now() }];
			tempElement = null;
			startPoint = null;
			
			// Reset free arc mode completely after creating an arc
			arcStep = 0;
			freeArcCenter = null;
			freeArcPreview = null;
			return;
		}
		
		// Handle other tools
		isDrawing = false;
		saveToHistory();
		elements = [...elements, { ...tempElement, id: Date.now() }];
		tempElement = null;
		startPoint = null;
	}

	function finishSpline() {
		if (splinePoints.length >= 2) {
			saveToHistory();
			elements = [...elements, {
				type: 'path',
				d: createSpline(splinePoints),
				id: Date.now()
			}];
		}
		splinePoints = [];
		isSplineMode = false;
	}

	function eraseElementAt(point) {
		const tolerance = 10;
		const elementToRemove = elements.findIndex(element => {
			if (element.type === 'line') {
				const dist = distanceToLineSegment(point, 
					{ x: element.x1, y: element.y1 }, 
					{ x: element.x2, y: element.y2 }
				);
				return dist < tolerance;
			} else if (element.type === 'circle') {
				const centerDist = Vector.distance(point, { x: element.cx, y: element.cy });
				return Math.abs(centerDist - element.r) < tolerance;
			}
			return false;
		});

		if (elementToRemove !== -1) {
			saveToHistory();
			elements = elements.filter((_, index) => index !== elementToRemove);
		}
	}

	function distanceToLineSegment(point, lineStart, lineEnd) {
		const A = point.x - lineStart.x;
		const B = point.y - lineStart.y;
		const C = lineEnd.x - lineStart.x;
		const D = lineEnd.y - lineStart.y;

		const dot = A * C + B * D;
		const lenSq = C * C + D * D;
		let param = -1;
		if (lenSq !== 0) param = dot / lenSq;

		let xx, yy;
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

		const dx = point.x - xx;
		const dy = point.y - yy;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function clearCanvas() {
		saveToHistory();
		elements = [];
		cancelCurrentAction();
	}

	function exportSVG() {
		const svgElement = svg.cloneNode(true);
		const gridGroup = svgElement.querySelector('.grid-lines');
		if (gridGroup) gridGroup.remove();
		const polygonGuide = svgElement.querySelector('.polygon-guide');
		if (polygonGuide) polygonGuide.remove();
		const arcGuides = svgElement.querySelectorAll('.arc-guide');
		arcGuides.forEach(guide => guide.remove());
		const splineGuides = svgElement.querySelectorAll('.spline-guide');
		splineGuides.forEach(guide => guide.remove());
		
		// Extract elements and convert to new format
		const borderPolygon = svgElement.querySelector('#border-polygon');
		const polygonPoints = borderPolygon ? borderPolygon.getAttribute('points') : '';
		
		// Get all clipped groups and extract internal elements
		const clippedGroups = svgElement.querySelectorAll(`g[clip-path*="polygon-clip-${selectedShape}"]`);
		let internalElements = '';
		for (const group of clippedGroups) {
			const content = group.innerHTML;
			// Only include groups that have actual drawing elements (not just border)
			if (content.includes('<path') || content.includes('<line') || content.includes('<circle') || content.includes('<rect')) {
				internalElements += content;
			}
		}
		
		// Create new SVG with glowing border format
		const newSvgContent = createGlowingSVG(polygonPoints, internalElements, selectedShape);
		
		const blob = new Blob([newSvgContent], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `tileset-${selectedShape}-sided.svg`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function createGlowingSVG(polygonPoints, internalElements, sides) {
		// Convert internal elements to mask format
		const maskElements = internalElements
			.replace(/<polygon[^>]*id="border-polygon"[^>]*\/?>/g, '') // Remove border polygon
			.replace(/stroke="#[^"]*"/g, 'stroke="white"')
			.replace(/fill="[^"]*"/g, 'fill="none"');
		
		return `<svg xmlns="http://www.w3.org/2000/svg" class="s-BgHh72J5KvB0" viewBox="0 0 600 600" width="600" height="600">
    <defs class="s-BgHh72J5KvB0">
        <clipPath id="polygon-clip-${sides}" class="s-BgHh72J5KvB0">
            <polygon class="s-BgHh72J5KvB0" points="${polygonPoints}"/>
        </clipPath>
        <radialGradient id="bgGradient" cx="50%" cy="66%" r="50%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1"/>
            <stop offset="30%" style="stop-color:#ffffff;stop-opacity:1"/>
            <stop offset="100%" style="stop-color:#ffcccc;stop-opacity:1"/>
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="tinyBlur"/>
            <feGaussianBlur stdDeviation="16" result="smallBlur"/>
            <feGaussianBlur stdDeviation="32" result="mediumBlur"/>
            <feGaussianBlur stdDeviation="64" result="largeBlur"/>
            <feGaussianBlur stdDeviation="128" result="hugeBlur"/>
            <feMerge>
                <feMergeNode in="hugeBlur"/>
                <feMergeNode in="largeBlur"/>
                <feMergeNode in="mediumBlur"/>
                <feMergeNode in="smallBlur"/>
                <feMergeNode in="tinyBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
        <radialGradient id="redGradient" cx="50%" cy="50%" r="100%">
            <stop id="gradientStop1" offset="7%" style="stop-color:#1e293b;stop-opacity:1"/>
            <stop id="gradientStop2" offset="20%" style="stop-color:#1e293b;stop-opacity:1"/>
        </radialGradient>
        <mask id="pathMask">
            <rect width="100%" height="100%" fill="black"/>
            ${maskElements}
        </mask>
    </defs>

    <polygon fill="white" id="base-polygon" stroke="none" class="s-BgHh72J5KvB0" points="${polygonPoints}"/>
    
    <g clip-path="url(#polygon-clip-${sides})" class="s-BgHh72J5KvB0">
        <polygon id="border-polygon" fill="none" stroke="#ff0000" stroke-width="0" filter="url(#glow)" class="s-BgHh72J5KvB0" points="${polygonPoints}"/>
    </g>

    <g clip-path="url(#polygon-clip-${sides})" class="s-BgHh72J5KvB0">
        <rect width="100%" height="100%" fill="url(#redGradient)" mask="url(#pathMask)" class="s-BgHh72J5KvB0"/>
    </g>
</svg>`;
	}

	// Initialize history
	onMount(() => {
		saveToHistory();
	});

	let gridLines = $derived(generateGridLines());
	let polygonPoints = $derived(generatePolygonPoints(selectedShape));
	let canvasPolygonPoints = $derived(polygonPoints.map(p => new Vector((p.x + 1) * canvasSize / 2, (p.y + 1) * canvasSize / 2)));
</script>

<div class="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
	<!-- Modern Header -->
	<div class="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200/50 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-6">
				<h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					Tileset Editor
				</h1>
				
				<!-- Shape Selector -->
				<div class="flex items-center gap-3">
					<label class="text-sm font-medium text-slate-600">Shape:</label>
					<div class="flex gap-1 bg-slate-100 rounded-lg p-1">
						{#each [3, 4, 6, 8, 12] as sides}
							<button
								class="px-3 py-2 rounded-md transition-all duration-200 {selectedShape === sides ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
								onclick={() => selectedShape = sides}
							>
								<div class="flex items-center gap-2">
									{#if sides === 3}
										<Triangle size={16} />
									{:else if sides === 4}
										<Square size={16} />
									{:else if sides === 6}
										<Hexagon size={16} />
									{:else if sides === 8}
										<Octagon size={16} />
									{:else}
										<span class="text-xs font-mono">12</span>
									{/if}
									<span class="text-xs font-medium">{sides}</span>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Arc Mode Selector (only when arc tool is selected) -->
				{#if selectedTool === 'arc'}
					<div class="flex items-center gap-3">
						<label class="text-sm font-medium text-slate-600">Arc Mode:</label>
						<div class="flex gap-1 bg-slate-100 rounded-lg p-1">
							<button
								class="px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 {arcMode === 'perpendicular' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
								onclick={() => arcMode = 'perpendicular'}
							>
								Perpendicular
							</button>
							<button
								class="px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 {arcMode === 'free' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
								onclick={() => arcMode = 'free'}
							>
								Free
							</button>
						</div>
					</div>
				{/if}
			</div>
			
			<!-- Action Buttons -->
			<div class="flex items-center gap-2">
				<input type="number" 
					bind:value={gridSize} 
					class="w-16"
				/>
				<button
					class="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
					onclick={() => showGrid = !showGrid}
					title="Toggle Grid"
				>
					{#if showGrid}
						<Eye size={18} />
					{:else}
						<EyeOff size={18} />
					{/if}
				</button>
				
				<div class="w-px h-6 bg-slate-300"></div>
				
				<button
					class="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={undo}
					disabled={historyIndex <= 0}
					title="Undo (Ctrl+Z)"
				>
					<Undo2 size={18} />
				</button>
				
				<button
					class="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					onclick={redo}
					disabled={historyIndex >= history.length - 1}
					title="Redo (Ctrl+Y)"
				>
					<Redo2 size={18} />
				</button>
				
				<div class="w-px h-6 bg-slate-300"></div>
				
				<button
					class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center gap-2"
					onclick={clearCanvas}
				>
					<Trash2 size={16} />
					Clear
				</button>
				
				<button
					class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 flex items-center gap-2"
					onclick={exportSVG}
				>
					<Download size={16} />
					Export
				</button>
			</div>
		</div>
	</div>

	<!-- Main editor area -->
	<div class="flex-1 flex items-center justify-center p-8">
		<div class="relative">
			<!-- SVG Canvas -->
			<svg
				bind:this={svg}
				width={canvasSize}
				height={canvasSize}
				viewBox="0 0 {canvasSize} {canvasSize}"
				class="bg-white cursor-crosshair rounded-xl shadow-xl border border-slate-200"
				onmousedown={handleMouseDown}
				onmousemove={handleMouseMove}
				onmouseup={handleMouseUp}
				oncontextmenu={(e) => e.preventDefault()}
			>
				<!-- Polygon background -->
				<polygon
					id="border-polygon"
					points={canvasPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
					fill="white"
					stroke="#00000033"
					stroke-width="1"
				/>

				<!-- Grid lines -->
				{#if showGrid}
					<g class="grid-lines">
						{#each gridLines as line}
							<line
								x1={line.x1}
								y1={line.y1}
								x2={line.x2}
								y2={line.y2}
								stroke="#e2e8f0"
								stroke-width="0.75"
								clip-path="url(#polygon-clip-{selectedShape})"
							/>
						{/each}
					</g>
				{/if}

				<!-- Define clipping path for grid lines -->
				<defs>
					<clipPath id="polygon-clip-{selectedShape}">
						<polygon
							points={canvasPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
						/>
					</clipPath>
				</defs>

				<!-- Drawn elements -->
				<g clip-path="url(#polygon-clip-{selectedShape})">
					{#each elements as element}
						{#if element.type === 'line'}
							<line
								x1={element.x1}
								y1={element.y1}
								x2={element.x2}
								y2={element.y2}
								stroke="#1e293b"
								stroke-width="2"
								fill="none"
								stroke-linecap="round"
							/>
						{:else if element.type === 'circle'}
							<circle
								cx={element.cx}
								cy={element.cy}
								r={element.r}
								fill="none"
								stroke="#1e293b"
								stroke-width="2"
							/>
						{:else if element.type === 'path'}
							<path
								d={element.d}
								fill="none"
								stroke="#1e293b"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					{/each}
					
					<!-- Temporary element while drawing -->
					{#if tempElement}
						{#if tempElement.type === 'line'}
							<line
								x1={tempElement.x1}
								y1={tempElement.y1}
								x2={tempElement.x2}
								y2={tempElement.y2}
								stroke="#64748b"
								stroke-width="2"
								fill="none"
								stroke-dasharray="5,5"
								stroke-linecap="round"
							/>
						{:else if tempElement.type === 'circle'}
							<circle
								cx={tempElement.cx}
								cy={tempElement.cy}
								r={tempElement.r}
								fill="none"
								stroke="#64748b"
								stroke-width="2"
								stroke-dasharray="5,5"
							/>
						{:else if tempElement.type === 'path'}
							<path
								d={tempElement.d}
								fill="none"
								stroke="#64748b"
								stroke-width="2"
								stroke-dasharray="5,5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					{/if}
				</g>

				<!-- Free arc preview -->
				{#if freeArcPreview}
					<circle
						cx={freeArcPreview.center.x}
						cy={freeArcPreview.center.y}
						r={freeArcPreview.radius}
						fill="none"
						stroke="#3b82f6"
						stroke-width="1"
						stroke-dasharray="3,3"
						opacity="0.5"
					/>
				{/if}

				<!-- Free arc center point -->
				{#if freeArcCenter}
					<circle
						cx={freeArcCenter.x}
						cy={freeArcCenter.y}
						r="6"
						fill="#f59e0b"
						stroke="white"
						stroke-width="2"
					/>
					<text
						x={freeArcCenter.x}
						y={freeArcCenter.y - 12}
						text-anchor="middle"
						class="text-xs fill-slate-600 font-medium"
					>
						Center
					</text>
				{/if}

				<!-- Spline points -->
				{#if isSplineMode}
					<g class="spline-guide">
						{#each splinePoints as point, i}
							<circle
								cx={point.x}
								cy={point.y}
								r="4"
								fill="#3b82f6"
								stroke="white"
								stroke-width="2"
							/>
							<text
								x={point.x}
								y={point.y - 10}
								text-anchor="middle"
								class="text-xs fill-slate-600 font-medium"
							>
								{i + 1}
							</text>
						{/each}
						
						<!-- Preview spline -->
						{#if splinePoints.length >= 2}
							<path
								d={createSpline(splinePoints)}
								fill="none"
								stroke="#3b82f6"
								stroke-width="2"
								stroke-dasharray="3,3"
								opacity="0.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					</g>
				{/if}
			</svg>

			<!-- Spline finish button -->
			{#if isSplineMode && splinePoints.length >= 2}
				<button
					class="absolute -bottom-12 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 shadow-lg"
					onclick={finishSpline}
				>
					Finish Spline
				</button>
			{/if}
		</div>
	</div>

	<!-- Modern Floating Toolbar -->
	<div class="fixed top-1/2 left-8 transform -translate-y-1/2">
		<div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-3 flex flex-col gap-2">
			<button
				class="p-3 rounded-xl transition-all duration-200 {selectedTool === 'line' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => selectedTool = 'line'}
				title="Line Tool (Ctrl+L)"
			>
				<Pen size={20} />
			</button>
			
			<button
				class="p-3 rounded-xl transition-all duration-200 {selectedTool === 'arc' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => selectedTool = 'arc'}
				title="Arc Tool (Ctrl+A)"
			>
				<Move3D size={20} />
			</button>
			
			<button
				class="p-3 rounded-xl transition-all duration-200 {selectedTool === 'spline' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => selectedTool = 'spline'}
				title="Spline Tool (Ctrl+S)"
			>
				<Spline size={20} />
			</button>
			
			<button
				class="p-3 rounded-xl transition-all duration-200 {selectedTool === 'circle' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}"
				onclick={() => selectedTool = 'circle'}
				title="Circle Tool (Ctrl+C)"
			>
				<Circle size={20} />
			</button>
			
			<div class="h-px w-12 bg-slate-300 my-1"></div>
			
			<button
				class="p-3 rounded-xl transition-all duration-200 {selectedTool === 'eraser' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:text-red-600 hover:bg-red-50'}"
				onclick={() => selectedTool = 'eraser'}
				title="Eraser Tool (Ctrl+E)"
			>
				<Eraser size={20} />
			</button>
		</div>
	</div>

	<!-- Instructions overlay -->
	{#if selectedTool === 'arc' && arcMode === 'free'}
		<div class="fixed top-20 right-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-xs">
			<h3 class="font-medium text-blue-900 mb-2">Free Arc Mode</h3>
			<ol class="text-sm text-blue-700 space-y-1">
				<li>1. Click to set center point</li>
				<li>2. Click and drag to create arc</li>
				<li class="text-blue-600">• Right-click or Esc to cancel</li>
			</ol>
		</div>
	{:else if isSplineMode}
		<div class="fixed top-20 right-8 bg-green-50 border border-green-200 rounded-lg p-4 max-w-xs">
			<h3 class="font-medium text-green-900 mb-2">Spline Mode</h3>
			<p class="text-sm text-green-700">Click to add points. Press "Finish Spline" when done.</p>
			<p class="text-xs text-green-600 mt-1">Right-click or Esc to cancel</p>
		</div>
	{/if}
</div>

<style>
	.cursor-crosshair {
		cursor: crosshair;
	}
</style>