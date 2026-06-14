import { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, RotateCcw, Shuffle, Upload } from 'lucide-react';
import {
  Level,
  Vector,
  isWithinTolerance,
  tilingRules,
  configStore,
  loadLevelFromJSON,
  validateLevelData,
  type Polygon,
  type Halfway,
} from '@tileloop/core';
import LevelRenderer from '../components/LevelRenderer';

interface RuleOption {
  label: string;
  rulestring: string;
  name: string;
  cr: string;
  dualname: string;
}

export default function LevelEditor() {
  const [width, setWidth] = useState(() => window.innerWidth);
  const [height, setHeight] = useState(() => window.innerHeight);
  const renderWidth = width;
  const renderHeight = height - 64;

  const ruleOptions = useMemo<RuleOption[]>(
    () =>
      tilingRules.flatMap((group) =>
        group.rules.map((rule) => ({
          label: `${group.title} — ${rule.name ?? rule.rulestring}`,
          rulestring: rule.rulestring,
          name: rule.name ?? '',
          cr: rule.cr ?? '',
          dualname: rule.dualname ?? '',
        })),
      ),
    [],
  );

  const [ruleIndex, setRuleIndex] = useState(() =>
    Math.max(
      0,
      ruleOptions.findIndex((r) => r.rulestring === configStore.getState().selectedTiling.rulestring),
    ),
  );
  const [level, setLevel] = useState<Level | null>(null);
  const [editorTick, setEditorTick] = useState(0);
  const [isEditorMode, setIsEditorMode] = useState(true);
  const [levelName, setLevelName] = useState('Custom Level');

  useEffect(() => {
    const onResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function resetAllConnections(lvl: Level) {
    for (const node of lvl.tiling.nodes) {
      for (const halfway of node.halfways) {
        halfway.connections = 0;
        halfway.matched = true;
      }
    }
    for (const node of lvl.tiling.nodes) {
      const [tileType, mirrored, turns, simmetries] = lvl.getTileType(node);
      node.tileType = tileType;
      if (mirrored !== node.mirrored) node.mirror(false);
      node.svgTurns = turns;
      node.simmetries = simmetries;
    }
  }

  function generateNewLevel(rule: RuleOption = ruleOptions[ruleIndex]) {
    configStore.getState().setConfig({
      selectedTiling: {
        name: rule.name,
        rulestring: rule.rulestring,
        cr: rule.cr,
        dualname: rule.dualname,
        golRules: { standard: [], dual: [] },
      },
    });
    const lvl = new Level(rule.rulestring, configStore.getState().transformSteps, renderWidth, renderHeight);
    lvl.isFrozen = false;
    resetAllConnections(lvl);
    setLevel(lvl);
    setEditorTick((t) => t + 1);
  }

  // Generate the initial level once on mount.
  useEffect(() => {
    generateNewLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateConnectionPair(lvl: Level, target: Halfway, connections: number) {
    const uniqueHalfways: { a: Halfway; b: Halfway | null }[] = [];
    for (const node of lvl.tiling.nodes) {
      for (const halfway of node.halfways) {
        const existing = uniqueHalfways.find((h) => isWithinTolerance(h.a, halfway));
        if (!existing) uniqueHalfways.push({ a: halfway, b: null });
        else existing.b = halfway;
      }
    }
    const pair = uniqueHalfways.find(
      (h) => isWithinTolerance(h.a, target) || (h.b && isWithinTolerance(h.b, target)),
    );
    if (pair) {
      pair.a.connections = connections;
      if (pair.b) {
        pair.b.connections = connections;
        pair.a.matched = true;
        pair.b.matched = true;
      } else {
        pair.a.matched = connections === 0;
      }
    }
  }

  function handleConnectionClick(halfway: Halfway, _node: Polygon) {
    if (!level) return;
    const next = ((halfway.connections ?? 0) + 1) % 3;
    updateConnectionPair(level, halfway, next);
    for (const node of level.tiling.nodes) {
      const [tileType, mirrored, turns, simmetries] = level.getTileType(node);
      node.tileType = tileType;
      if (mirrored !== node.mirrored) node.mirror(false);
      node.svgTurns = turns;
      node.simmetries = simmetries;
    }
    setEditorTick((t) => t + 1);
  }

  function exportLevel() {
    if (!level) return;
    const rule = ruleOptions[ruleIndex];
    const levelData = {
      metadata: {
        name: levelName,
        description: 'Created with Level Editor',
        created: new Date().toISOString(),
        editor: 'TileLoop Level Editor v1.0',
      },
      tiling: { rulestring: rule.rulestring, name: rule.name, transformSteps: configStore.getState().transformSteps },
      dimensions: { width: renderWidth, height: renderHeight },
      tiles: level.tiling.nodes.map((node) => ({
        id: node.id,
        position: { x: node.centroid.x, y: node.centroid.y },
        screenPosition: { x: node.screenPosition?.x ?? 0, y: node.screenPosition?.y ?? 0 },
        sides: node.n,
        rotation: node.rotation,
        angle: node.angle,
        tileType: node.tileType,
        mirrored: node.mirrored,
        svgTurns: node.svgTurns,
        vertices: node.vertices.map((v) => ({ x: v.x, y: v.y })),
        connections: node.halfways.map((h) => ({
          position: { x: h.x, y: h.y },
          connections: h.connections ?? 0,
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(levelData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${levelName.replace(/\s+/g, '_').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importLevel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(String(e.target?.result));
          if (!validateLevelData(data)) {
            alert('Invalid level file format!');
            return;
          }
          const lvl = loadLevelFromJSON(data, renderWidth, renderHeight);
          lvl.isFrozen = false;
          setLevel(lvl);
          setLevelName(data.metadata.name || 'Imported Level');
          setEditorTick((t) => t + 1);
        } catch (err) {
          alert('Failed to import level: ' + (err as Error).message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function shuffleLevel() {
    if (!level) return;
    level.shuffle();
    setEditorTick((t) => t + 1);
  }

  function clearLevel() {
    if (!level) return;
    resetAllConnections(level);
    setEditorTick((t) => t + 1);
  }

  function testLevel() {
    if (!level) return;
    const next = !isEditorMode;
    setIsEditorMode(next);
    if (!next) {
      level.shuffle();
    } else {
      for (const node of level.tiling.nodes) node.svgTransform = '';
    }
    level.isFrozen = false;
    setEditorTick((t) => t + 1);
  }

  const iconBtn = 'rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white';

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-zinc-900">
      <div className="z-20 flex items-center justify-between border-b border-zinc-700 bg-zinc-900 p-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">Level Editor</h1>
          <input
            data-testid="level-name"
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            placeholder="Level Name"
            className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
          <select
            data-testid="tiling-select"
            value={ruleIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setRuleIndex(idx);
              generateNewLevel(ruleOptions[idx]);
            }}
            className="max-w-64 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white"
          >
            {ruleOptions.map((r, i) => (
              <option key={i} value={i}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={importLevel} className={iconBtn} title="Import Level JSON" aria-label="Import">
            <Upload size={18} />
          </button>
          <button onClick={clearLevel} className={iconBtn} title="Clear connections" aria-label="Clear">
            <Trash2 size={18} />
          </button>
          <button onClick={() => generateNewLevel()} className={iconBtn} title="Regenerate" aria-label="Regenerate">
            <RotateCcw size={18} />
          </button>
          <button onClick={shuffleLevel} className={iconBtn} title="Shuffle" aria-label="Shuffle">
            <Shuffle size={18} />
          </button>
          <button
            data-testid="test-level"
            onClick={testLevel}
            className={`rounded px-4 py-2 font-medium text-white ${
              isEditorMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isEditorMode ? 'Test Level' : 'Edit Mode'}
          </button>
          <button
            onClick={exportLevel}
            className="flex items-center gap-2 rounded bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {level && (
          <LevelRenderer
            key={`${level.id}-${editorTick}`}
            width={renderWidth}
            height={renderHeight}
            level={level}
            isEditorMode={isEditorMode}
            onConnectionClick={handleConnectionClick}
          />
        )}
      </div>
    </div>
  );
}
