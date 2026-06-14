import { describe, it, expect, beforeEach } from 'vitest';
import { configStore, getConfig, DEFAULT_SELECTED_TILING } from './configStore';

describe('configStore', () => {
  beforeEach(() => {
    configStore.getState().setConfig({ scale: 60, selectedTiling: DEFAULT_SELECTED_TILING });
  });

  it('exposes engine-readable defaults', () => {
    expect(getConfig().scale).toBe(60);
    expect(getConfig().colorParams).toEqual({ a: 180, b: 0 });
  });

  it('setConfig patches fields', () => {
    getConfig().setConfig({ scale: 80 });
    expect(getConfig().scale).toBe(80);
  });
});
