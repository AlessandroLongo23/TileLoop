import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pen,
  Circle as CircleIcon,
  Move3D,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Undo2,
  Redo2,
  Eraser,
  Spline,
  Trash2,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Vector } from '@tileloop/core';
import {
  getGridConfig,
  generatePolygonPoints,
  generateGridLines,
  snapToGrid,
  findClosestGridPointOnPolygonEdge,
  createPerpendicularArc,
  createSpline,
  distanceToLineSegment,
  createGlowingSVG,
  type Point,
  type Edge,
} from '../lib/tileEditorGeometry';

type Tool = 'line' | 'arc' | 'spline' | 'circle' | 'eraser';
type DrawElement =
  | { id?: number; type: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { id?: number; type: 'circle'; cx: number; cy: number; r: number }
  | { id?: number; type: 'path'; d: string; startEdge?: Edge | null };

const CANVAS = 600;
const SHAPES = [3, 4, 6, 8, 12];

export default function TileEditor() {
  const svgRef = useRef<SVGSVGElement>(null);

  const [tool, setTool] = useState<Tool>('line');
  const [shape, setShape] = useState(4);
  const [arcMode, setArcMode] = useState<'perpendicular' | 'free'>('perpendicular');
  const [gridSize, setGridSize] = useState(6);
  const [showGrid, setShowGrid] = useState(true);

  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isDrawing, setIsDrawing] = useState(false);
  const [tempElement, setTempElement] = useState<DrawElement | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [splinePoints, setSplinePoints] = useState<Point[]>([]);
  const [isSplineMode, setIsSplineMode] = useState(false);
  const [arcStep, setArcStep] = useState(0);
  const [freeArcCenter, setFreeArcCenter] = useState<Point | null>(null);
  const [freeArcPreview, setFreeArcPreview] = useState<{ center: Point; radius: number } | null>(null);

  const grid = useMemo(() => getGridConfig(shape, CANVAS, gridSize), [shape, gridSize]);
  const polygonPoints = useMemo(() => generatePolygonPoints(shape), [shape]);
  const canvasPolygonPoints = useMemo(
    () => polygonPoints.map((p) => new Vector(((p.x + 1) * CANVAS) / 2, ((p.y + 1) * CANVAS) / 2)),
    [polygonPoints],
  );
  const gridLines = useMemo(
    () => generateGridLines(grid, CANVAS, gridSize, polygonPoints),
    [grid, gridSize, polygonPoints],
  );
  const polyPointsStr = canvasPolygonPoints.map((p) => `${p.x},${p.y}`).join(' ');

  function cancelCurrentAction() {
    setIsDrawing(false);
    setTempElement(null);
    setStartPoint(null);
    setArcStep(0);
    setSplinePoints([]);
    setIsSplineMode(false);
    setFreeArcCenter(null);
    setFreeArcPreview(null);
  }

  // Reset transient drawing when the tool/shape changes.
  useEffect(() => {
    cancelCurrentAction();
  }, [tool, shape, arcMode]);

  function saveToHistory(next: DrawElement[]) {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      trimmed.push(JSON.parse(JSON.stringify(next)));
      const capped = trimmed.length > 50 ? trimmed.slice(-50) : trimmed;
      setHistoryIndex(capped.length - 1);
      return capped;
    });
  }

  function undo() {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setElements(JSON.parse(JSON.stringify(history[idx])));
    }
  }
  function redo() {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setElements(JSON.parse(JSON.stringify(history[idx])));
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) {
        const map: Record<string, () => void> = {
          z: () => (e.shiftKey ? redo() : undo()),
          y: redo,
          e: () => setTool('eraser'),
          l: () => setTool('line'),
          a: () => setTool('arc'),
          c: () => setTool('circle'),
          s: () => setTool('spline'),
        };
        if (map[e.key]) {
          e.preventDefault();
          map[e.key]();
        }
      }
      if (e.key === 'Escape') cancelCurrentAction();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function getMousePosition(event: React.MouseEvent): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    const point = new Vector(event.clientX - rect.left, event.clientY - rect.top);
    if (tool === 'arc' && arcMode === 'perpendicular') {
      return findClosestGridPointOnPolygonEdge(point, grid, CANVAS, gridSize, canvasPolygonPoints).point;
    }
    return snapToGrid(point, grid, CANVAS, gridSize);
  }

  function commit(el: DrawElement) {
    const next = [...elements, { ...el, id: Date.now() }];
    saveToHistory(next);
    setElements(next);
  }

  function eraseElementAt(point: Point) {
    const tolerance = 10;
    const idx = elements.findIndex((el) => {
      if (el.type === 'line')
        return distanceToLineSegment(point, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < tolerance;
      if (el.type === 'circle')
        return Math.abs(Vector.distance(new Vector(point.x, point.y), new Vector(el.cx, el.cy)) - el.r) < tolerance;
      return false;
    });
    if (idx !== -1) {
      const next = elements.filter((_, i) => i !== idx);
      saveToHistory(next);
      setElements(next);
    }
  }

  function handleMouseDown(event: React.MouseEvent) {
    if (event.button === 2) {
      event.preventDefault();
      cancelCurrentAction();
      return;
    }
    const p = getMousePosition(event);

    if (tool === 'eraser') return eraseElementAt(p);

    if (tool === 'spline') {
      if (!isSplineMode) {
        setIsSplineMode(true);
        setSplinePoints([p]);
      } else {
        setSplinePoints((s) => [...s, p]);
      }
      return;
    }

    if (tool === 'arc' && arcMode === 'free') {
      if (arcStep === 0) {
        setFreeArcCenter(p);
        setArcStep(1);
        return;
      }
      if (arcStep === 1) {
        setStartPoint(p);
        setIsDrawing(true);
        setArcStep(2);
        setFreeArcPreview(null);
        setTempElement({ type: 'path', d: '' });
        return;
      }
    }

    setIsDrawing(true);
    setStartPoint(p);
    if (tool === 'line') setTempElement({ type: 'line', x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    else if (tool === 'circle') setTempElement({ type: 'circle', cx: p.x, cy: p.y, r: 0 });
    else if (tool === 'arc' && arcMode === 'perpendicular') {
      const snap = findClosestGridPointOnPolygonEdge(p, grid, CANVAS, gridSize, canvasPolygonPoints);
      setTempElement({ type: 'path', d: '', startEdge: snap.edge });
    }
  }

  function handleMouseMove(event: React.MouseEvent) {
    const p = getMousePosition(event);

    if (tool === 'arc' && arcMode === 'free' && freeArcCenter && !isDrawing) {
      setFreeArcPreview({ center: freeArcCenter, radius: Vector.distance(new Vector(freeArcCenter.x, freeArcCenter.y), new Vector(p.x, p.y)) });
    }

    if (!isDrawing || !tempElement) return;

    if (tempElement.type === 'line') {
      setTempElement({ ...tempElement, x2: p.x, y2: p.y });
    } else if (tempElement.type === 'circle') {
      const r = Math.hypot(p.x - tempElement.cx, p.y - tempElement.cy);
      setTempElement({ ...tempElement, r });
    } else if (tool === 'arc' && arcMode === 'free' && freeArcCenter && startPoint) {
      const startRadius = Vector.distance(new Vector(freeArcCenter.x, freeArcCenter.y), new Vector(startPoint.x, startPoint.y));
      const currentRadius = Vector.distance(new Vector(freeArcCenter.x, freeArcCenter.y), new Vector(p.x, p.y));
      const radius = (startRadius + currentRadius) / 2;
      const startAngle = Math.atan2(startPoint.y - freeArcCenter.y, startPoint.x - freeArcCenter.x);
      const currentAngle = Math.atan2(p.y - freeArcCenter.y, p.x - freeArcCenter.x);
      const end = Vector.fromPolar(new Vector(freeArcCenter.x, freeArcCenter.y), radius, currentAngle);
      let angleDiff = currentAngle - startAngle;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
      const sweepFlag = angleDiff > 0 ? 1 : 0;
      setTempElement({ ...tempElement, d: `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}` });
    } else if (tool === 'arc' && arcMode === 'perpendicular' && startPoint && tempElement.type === 'path' && tempElement.startEdge) {
      const currentSnap = findClosestGridPointOnPolygonEdge(p, grid, CANVAS, gridSize, canvasPolygonPoints);
      if (currentSnap.edge) {
        setTempElement({ ...tempElement, d: createPerpendicularArc(startPoint, tempElement.startEdge, p, currentSnap.edge) });
      }
    }
  }

  function handleMouseUp() {
    if (!isDrawing || !tempElement) return;
    setIsDrawing(false);
    commit(tempElement);
    setTempElement(null);
    setStartPoint(null);
    if (tool === 'arc' && arcMode === 'free') {
      setArcStep(0);
      setFreeArcCenter(null);
      setFreeArcPreview(null);
    }
  }

  function finishSpline() {
    if (splinePoints.length >= 2) commit({ type: 'path', d: createSpline(splinePoints) });
    setSplinePoints([]);
    setIsSplineMode(false);
  }

  function clearCanvas() {
    saveToHistory([]);
    setElements([]);
    cancelCurrentAction();
  }

  function elementToSvg(el: DrawElement): string {
    if (el.type === 'line')
      return `<line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    if (el.type === 'circle')
      return `<circle cx="${el.cx}" cy="${el.cy}" r="${el.r}" fill="none" stroke="#1e293b" stroke-width="2"/>`;
    return `<path d="${el.d}" fill="none" stroke="#1e293b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function exportSVG() {
    const internal = elements.map(elementToSvg).join('\n');
    const content = createGlowingSVG(polyPointsStr, internal, shape);
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tileset-${shape}-sided.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const shapeIcon = (sides: number) => {
    if (sides === 3) return <Triangle size={16} />;
    if (sides === 4) return <Square size={16} />;
    if (sides === 6) return <Hexagon size={16} />;
    if (sides === 8) return <Octagon size={16} />;
    return <span className="font-mono text-xs">12</span>;
  };

  const toolBtn = (t: Tool) =>
    `rounded-xl p-3 transition-all duration-200 ${tool === t ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="border-b border-slate-200/50 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
              Tileset Editor
            </h1>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {SHAPES.map((sides) => (
                <button
                  key={sides}
                  data-testid={`shape-${sides}`}
                  onClick={() => setShape(sides)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 transition-all duration-200 ${
                    shape === sides ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {shapeIcon(sides)}
                  <span className="text-xs font-medium">{sides}</span>
                </button>
              ))}
            </div>
            {tool === 'arc' && (
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['perpendicular', 'free'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setArcMode(m)}
                    className={`rounded-md px-3 py-2 text-xs font-medium capitalize ${
                      arcMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={gridSize}
              onChange={(e) => setGridSize(Math.max(1, Number(e.target.value)))}
              className="w-16 rounded border border-slate-300 px-2 py-1"
            />
            <button onClick={() => setShowGrid((g) => !g)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" title="Toggle grid">
              {showGrid ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
            <button onClick={undo} disabled={historyIndex <= 0} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              <Redo2 size={18} />
            </button>
            <button onClick={clearCanvas} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600">
              <Trash2 size={16} /> Clear
            </button>
            <button data-testid="export-svg" onClick={exportSVG} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600">
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <svg
          ref={svgRef}
          data-testid="tile-canvas"
          width={CANVAS}
          height={CANVAS}
          viewBox={`0 0 ${CANVAS} ${CANVAS}`}
          className="rounded-xl border border-slate-200 bg-white shadow-xl"
          style={{ cursor: 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <defs>
            <clipPath id={`polygon-clip-${shape}`}>
              <polygon points={polyPointsStr} />
            </clipPath>
          </defs>

          <polygon id="border-polygon" points={polyPointsStr} fill="white" stroke="#00000033" strokeWidth={1} />

          {showGrid && (
            <g>
              {gridLines.map((line, i) => (
                <line key={i} {...line} stroke="#e2e8f0" strokeWidth={0.75} clipPath={`url(#polygon-clip-${shape})`} />
              ))}
            </g>
          )}

          <g clipPath={`url(#polygon-clip-${shape})`}>
            {elements.map((el, i) => {
              if (el.type === 'line')
                return <line key={i} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke="#1e293b" strokeWidth={2} fill="none" strokeLinecap="round" />;
              if (el.type === 'circle')
                return <circle key={i} cx={el.cx} cy={el.cy} r={el.r} fill="none" stroke="#1e293b" strokeWidth={2} />;
              return <path key={i} d={el.d} fill="none" stroke="#1e293b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />;
            })}

            {tempElement && tempElement.type === 'line' && (
              <line x1={tempElement.x1} y1={tempElement.y1} x2={tempElement.x2} y2={tempElement.y2} stroke="#64748b" strokeWidth={2} fill="none" strokeDasharray="5,5" strokeLinecap="round" />
            )}
            {tempElement && tempElement.type === 'circle' && (
              <circle cx={tempElement.cx} cy={tempElement.cy} r={tempElement.r} fill="none" stroke="#64748b" strokeWidth={2} strokeDasharray="5,5" />
            )}
            {tempElement && tempElement.type === 'path' && (
              <path d={tempElement.d} fill="none" stroke="#64748b" strokeWidth={2} strokeDasharray="5,5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>

          {freeArcPreview && (
            <circle cx={freeArcPreview.center.x} cy={freeArcPreview.center.y} r={freeArcPreview.radius} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
          )}
          {freeArcCenter && <circle cx={freeArcCenter.x} cy={freeArcCenter.y} r={6} fill="#f59e0b" stroke="white" strokeWidth={2} />}

          {isSplineMode && (
            <g>
              {splinePoints.map((point, i) => (
                <circle key={i} cx={point.x} cy={point.y} r={4} fill="#3b82f6" stroke="white" strokeWidth={2} />
              ))}
              {splinePoints.length >= 2 && (
                <path d={createSpline(splinePoints)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="3,3" opacity={0.5} strokeLinecap="round" strokeLinejoin="round" />
              )}
            </g>
          )}
        </svg>
      </div>

      {isSplineMode && splinePoints.length >= 2 && (
        <button onClick={finishSpline} className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg hover:bg-blue-600">
          Finish Spline
        </button>
      )}

      <div className="fixed left-8 top-1/2 -translate-y-1/2">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/50 bg-white/90 p-3 shadow-xl backdrop-blur-sm">
          <button data-testid="tool-line" onClick={() => setTool('line')} className={toolBtn('line')} title="Line (Ctrl+L)">
            <Pen size={20} />
          </button>
          <button data-testid="tool-arc" onClick={() => setTool('arc')} className={toolBtn('arc')} title="Arc (Ctrl+A)">
            <Move3D size={20} />
          </button>
          <button data-testid="tool-spline" onClick={() => setTool('spline')} className={toolBtn('spline')} title="Spline (Ctrl+S)">
            <Spline size={20} />
          </button>
          <button data-testid="tool-circle" onClick={() => setTool('circle')} className={toolBtn('circle')} title="Circle (Ctrl+C)">
            <CircleIcon size={20} />
          </button>
          <div className="my-1 h-px w-12 bg-slate-300" />
          <button
            data-testid="tool-eraser"
            onClick={() => setTool('eraser')}
            className={`rounded-xl p-3 transition-all duration-200 ${tool === 'eraser' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-600 hover:bg-red-50 hover:text-red-600'}`}
            title="Eraser (Ctrl+E)"
          >
            <Eraser size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
