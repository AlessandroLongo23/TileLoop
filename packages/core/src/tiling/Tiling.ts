import type { Polygon } from './Polygon';

/** Parsed seed shape token (one entry of the rule's shape seed). */
export type SeedShape =
  | { type: 'isotoxal'; n: number; alfa: number }
  | { type: 'star'; n: number; m: number }
  | { type: 'regular'; n: number; special: boolean };

/** A symmetry/translation transform parsed from a rule phase. */
export interface Transform {
  type: string; // 'm' | 'r' | 't'
  relativeTo?: string;
  angle?: number;
  anchor?: { x: number; y: number } | null;
}

/**
 * Container for a generated tiling: its polygon nodes plus the metadata the
 * generator and editors hang off it. (The dead p5 `show()` method was removed.)
 */
export class Tiling {
  nodes: Polygon[] = [];
  anchorNodes: Polygon[] = [];
  dual = false;
  islamic = false;

  shapeSeed: SeedShape[][] = [];
  transforms: Transform[] = [];

  parsedGolRule: Record<string, unknown> = {};
  golRuleType = 'Single';
  rules: Record<string, unknown> = {};
  rule: Record<string, unknown> = {};

  vertexGroups: unknown[] = [];
  crNotation = '';
}
