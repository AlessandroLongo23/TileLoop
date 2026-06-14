import { describe, it, expect } from 'vitest';
import { tilingRules } from './tilingRules';

describe('tilingRules', () => {
  it('exposes rule groups, each rule with a non-empty rulestring', () => {
    const allRules = tilingRules.flatMap((g) => g.rules);
    expect(allRules.length).toBeGreaterThan(0);
    for (const rule of allRules) {
      expect(typeof rule.rulestring).toBe('string');
      expect(rule.rulestring.length).toBeGreaterThan(0);
    }
  });
});
