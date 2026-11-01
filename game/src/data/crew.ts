import type { Spot } from './layout';

export interface CrewDef {
  id: string;
  name: string;
  /** Spritesheet key (art/build_sprites.py). */
  sheet: string;
  /** Where they hang out when nobody needs them. */
  post: Spot;
}

export const CREW: CrewDef[] = [
  { id: 'madai', name: 'Madai', sheet: 'crew_madai', post: { x: 218, y: 211, face: 'down' } },
  { id: 'matthew', name: 'Matthew', sheet: 'crew_matthew', post: { x: 307, y: 158, face: 'down' } },
  { id: 'daniela', name: 'Daniela', sheet: 'crew_daniela', post: { x: 452, y: 114, face: 'down' } },
  { id: 'nathalya', name: 'Nathalya', sheet: 'crew_nathalya', post: { x: 214, y: 118, face: 'down' } },
  { id: 'alex', name: 'Alex', sheet: 'crew_alex', post: { x: 378, y: 80, face: 'down' } },
  { id: 'jesnel', name: 'Jesnel', sheet: 'crew_jesnel', post: { x: 54, y: 130, face: 'down' } },
];

export const CUSTOMER_SHEETS = [
  'cust_cap_red',
  'cust_cap_blue',
  'cust_cap_green',
  'cust_senora',
  'cust_hoodie_green',
  'cust_hoodie_purple',
];
