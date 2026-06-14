import { createStore } from 'zustand/vanilla';

export interface SelectedTiling {
  name: string;
  rulestring: string;
  cr: string;
  dualname: string;
  golRules: { standard: unknown[]; dual: unknown[] };
}

export interface ColorParams {
  a: number;
  b: number;
}

export interface ConfigState {
  golRule: string;
  golRules: Record<string, unknown>;
  selectedTiling: SelectedTiling;
  isDual: boolean;
  transformSteps: number;
  parameter: number;
  lineWidth: number;
  colorParams: ColorParams;
  isIslamic: boolean;
  islamicAngle: number;
  scale: number;
  /** Patch one or more config fields. */
  setConfig: (partial: Partial<Omit<ConfigState, 'setConfig'>>) => void;
}

export const DEFAULT_SELECTED_TILING: SelectedTiling = {
  name: 'square',
  rulestring: '4-4-0,4/r90/m(v2)',
  cr: '4^4',
  dualname: 'square',
  golRules: { standard: [], dual: [] },
};

/**
 * Framework-agnostic configuration store. The engine reads values via
 * `configStore.getState()`; React apps subscribe with `useStore(configStore, …)`.
 */
export const configStore = createStore<ConfigState>((set) => ({
  golRule: 'B3/S23',
  golRules: {},
  selectedTiling: DEFAULT_SELECTED_TILING,
  isDual: false,
  transformSteps: 1,
  parameter: 45,
  lineWidth: 1,
  colorParams: { a: 180, b: 0 },
  isIslamic: false,
  islamicAngle: 90,
  scale: 60,
  setConfig: (partial) => set(partial),
}));

/** Convenience accessor for engine code. */
export const getConfig = () => configStore.getState();
