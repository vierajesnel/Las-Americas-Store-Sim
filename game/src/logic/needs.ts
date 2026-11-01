import type { StationId } from '../data/layout';

export type NeedId = 'bill' | 'accessory' | 'phone';
export type PuzzleKind = 'bill' | 'phone' | 'case';

export interface NeedDef {
  id: NeedId;
  label: string;
  /** Texture key of the speech bubble over their head. */
  bubble: string;
  station: StationId;
  puzzle: PuzzleKind;
  /** Dollars for a perfect job. */
  base: number;
  /** Seconds they'll wait standing in line before walking out. */
  patience: number;
  /** Seconds the transaction takes at the station after the puzzle. */
  work: number;
  /** How often this kind of customer shows up, relative to the others. */
  weight: number;
}

export const NEEDS: Record<NeedId, NeedDef> = {
  bill: {
    id: 'bill', label: 'Bill question', bubble: 'bubble_bill', station: 'desk', puzzle: 'bill',
    base: 20, patience: 50, work: 4, weight: 4,
  },
  accessory: {
    id: 'accessory', label: 'Needs a case', bubble: 'bubble_accessory', station: 'accessories', puzzle: 'case',
    base: 45, patience: 45, work: 5, weight: 3,
  },
  phone: {
    id: 'phone', label: 'New phone', bubble: 'bubble_phone', station: 'clientTable', puzzle: 'phone',
    base: 150, patience: 70, work: 8, weight: 3,
  },
};

/** How fast patience drains depending on where they're waiting. */
export const WAIT_DRAIN = { queue: 1, browse: 0.8, sofa: 0.6 } as const;
export type WaitKind = keyof typeof WAIT_DRAIN;

/**
 * What a finished job pays: most of it for showing up, the rest for how much
 * patience they had left, plus a bonus for solving the puzzle fast.
 */
export function payout(base: number, patienceLeft: number, timeLeft: number): number {
  const p = clamp01(patienceLeft);
  const t = clamp01(timeLeft);
  return Math.round(base * (0.6 + 0.4 * p) + base * 0.25 * t);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
