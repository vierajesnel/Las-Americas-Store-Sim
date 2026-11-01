import { type Rng, between } from './rng';

/** Real seconds in one shift, store opening to closing. */
export const SHIFT_SECONDS = 240;
export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 21;

/** Store clock for a point in the shift, e.g. "1:30 PM". */
export function clockLabel(elapsed: number): string {
  const p = Math.min(1, Math.max(0, elapsed / SHIFT_SECONDS));
  const minutes = Math.floor((OPEN_HOUR + p * (CLOSE_HOUR - OPEN_HOUR)) * 60);
  const h24 = Math.floor(minutes / 60);
  const m = Math.floor((minutes % 60) / 15) * 15;
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export interface Rush {
  start: number;
  end: number;
  name: string;
}

/** Busy stretches, as fractions of the shift. */
export const RUSHES: Rush[] = [
  { start: 0.24, end: 0.36, name: 'Lunch rush!' },
  { start: 0.68, end: 0.84, name: 'After-work rush!' },
];

export function rushAt(progress: number): Rush | null {
  return RUSHES.find((r) => progress >= r.start && progress < r.end) ?? null;
}

/** Seconds until the next customer walks in. Gets busier as the day goes on. */
export function spawnDelay(progress: number, rng: Rng): number {
  let base = 9 - 5 * Math.min(1, progress);
  if (rushAt(progress)) base *= 0.55;
  return base * between(rng, 0.7, 1.3);
}

/** 1-5 stars from how many customers left happy. */
export function stars(served: number, lost: number): number {
  const total = served + lost;
  if (total === 0) return 3;
  const rate = served / total;
  if (rate >= 0.95) return 5;
  if (rate >= 0.8) return 4;
  if (rate >= 0.6) return 3;
  if (rate >= 0.4) return 2;
  return 1;
}
