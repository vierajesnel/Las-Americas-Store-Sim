import { type Rng, pick, shuffle } from '../logic/rng';

/** Phone pick: find the one phone that matches everything on the wish list. */

export const BRANDS = ['iPhone', 'Samsung', 'Pixel', 'Moto'] as const;
export const STORAGE = [128, 256, 512] as const;
export const COLORS = {
  Black: '#2a2a31',
  White: '#eceef2',
  Blue: '#4f7fd0',
  Purple: '#9270cc',
  Pink: '#f2a6c2',
  Green: '#6aae7c',
} as const;

export type Brand = (typeof BRANDS)[number];
export type ColorName = keyof typeof COLORS;

export interface Phone {
  brand: Brand;
  color: ColorName;
  storage: number;
}

export interface PhonePuzzle {
  wish: Phone;
  quote: string;
  options: Phone[];
  answer: number;
}

const COLOR_NAMES = Object.keys(COLORS) as ColorName[];

const QUOTES: ((p: Phone) => string)[] = [
  (p) => `I want the ${p.brand} in ${p.color.toLowerCase()}, ${p.storage} gigs.`,
  (p) => `${p.color} ${p.brand}. ${p.storage}GB. I take a LOT of pictures.`,
  (p) => `My daughter said get the ${p.brand}... ${p.color.toLowerCase()}, ${p.storage}GB?`,
  (p) => `Do you have the ${p.storage} gig ${p.brand} in ${p.color.toLowerCase()}?`,
];

/** Six phones; each wrong one differs from the wish in exactly one way. */
export function generatePhone(rng: Rng): PhonePuzzle {
  const wish: Phone = { brand: pick(rng, BRANDS), color: pick(rng, COLOR_NAMES), storage: pick(rng, STORAGE) };
  const nearMisses: Phone[] = [
    ...BRANDS.filter((b) => b !== wish.brand).map((brand) => ({ ...wish, brand })),
    ...COLOR_NAMES.filter((c) => c !== wish.color).map((color) => ({ ...wish, color })),
    ...STORAGE.filter((s) => s !== wish.storage).map((storage) => ({ ...wish, storage })),
  ];
  const options = shuffle(rng, [wish, ...shuffle(rng, nearMisses).slice(0, 5)]);
  return { wish, quote: pick(rng, QUOTES)(wish), options, answer: options.indexOf(wish) };
}
