import { type Rng, pick, shuffle } from '../logic/rng';

/** Case fit: match the case's camera cutout to the customer's phone. */

export type CameraLayout = 'triangle' | 'diagonal' | 'column' | 'bar' | 'grid' | 'pill';
export const LAYOUTS: CameraLayout[] = ['triangle', 'diagonal', 'column', 'bar', 'grid', 'pill'];

export interface CasePuzzle {
  quote: string;
  phone: CameraLayout;
  options: CameraLayout[];
  answer: number;
}

const QUOTES = [
  'I need a case for this one.',
  'Dropped it twice today. Case, please.',
  "Which case fits mine? The box didn't say.",
  'My cousin says I need a case. Fine.',
];

export function generateCase(rng: Rng): CasePuzzle {
  const phone = pick(rng, LAYOUTS);
  const others = shuffle(rng, LAYOUTS.filter((l) => l !== phone)).slice(0, 3);
  const options = shuffle(rng, [phone, ...others]);
  return { quote: pick(rng, QUOTES), phone, options, answer: options.indexOf(phone) };
}

/**
 * Camera shapes on a 32x60 phone back: the bump (if any) and the lenses.
 * Shared by the phone drawing and the case cutouts.
 */
export interface CameraShape {
  bump: { x: number; y: number; w: number; h: number; r: number } | null;
  lenses: { x: number; y: number; r: number }[];
}

export const CAMERAS: Record<CameraLayout, CameraShape> = {
  triangle: { bump: { x: 3, y: 3, w: 15, h: 15, r: 4 }, lenses: [{ x: 7, y: 7, r: 2.6 }, { x: 7, y: 14, r: 2.6 }, { x: 13.5, y: 10.5, r: 2.6 }] },
  diagonal: { bump: { x: 3, y: 3, w: 13, h: 13, r: 4 }, lenses: [{ x: 7, y: 7, r: 2.6 }, { x: 12, y: 12, r: 2.6 }] },
  column: { bump: null, lenses: [{ x: 8, y: 7, r: 2.6 }, { x: 8, y: 14, r: 2.6 }, { x: 8, y: 21, r: 2.6 }] },
  bar: { bump: { x: 0, y: 6, w: 32, h: 9, r: 4.5 }, lenses: [{ x: 9, y: 10.5, r: 2.4 }, { x: 16, y: 10.5, r: 2.4 }] },
  grid: { bump: { x: 3, y: 3, w: 15, h: 15, r: 3 }, lenses: [{ x: 7, y: 7, r: 2.2 }, { x: 14, y: 7, r: 2.2 }, { x: 7, y: 14, r: 2.2 }, { x: 14, y: 14, r: 2.2 }] },
  pill: { bump: { x: 3, y: 3, w: 9, h: 19, r: 4.5 }, lenses: [{ x: 7.5, y: 8, r: 2.6 }, { x: 7.5, y: 16, r: 2.6 }] },
};
