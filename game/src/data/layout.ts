/**
 * Where everything is on the sales floor, in map pixels (the map is 512x224).
 * Points are where a person's feet go. Props and their footprints come from
 * props.json, which art/store_map/make_map.py exports alongside the art.
 */
import propsData from './props.json';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface Pt {
  x: number;
  y: number;
}

export interface Spot extends Pt {
  face: Facing;
}

export interface PropDef {
  key: string;
  x: number;
  y: number;
  baseY: number;
  footprint: number[] | null;
}

export const MAP_W: number = propsData.width;
export const MAP_H: number = propsData.height;
export const PROPS: PropDef[] = propsData.props;

/** Feet can go anywhere in here, minus prop footprints. */
export const FLOOR = { x0: 10, y0: 72, x1: 500, y1: 213 };

/** The entrance is the gap in the front glass, top-right. */
export const DOOR_INSIDE: Pt = { x: 496, y: 84 };
export const DOOR_OUTSIDE: Pt = { x: 526, y: 84 };

/** The line for the check-in PC, front of the line first. */
export const QUEUE: Spot[] = [264, 280, 296, 312].map((x) => ({ x, y: 210, face: 'left' }));

/** Sofa seats; customers walk to `front`, then sit down. */
export const SOFA: { seat: Pt; front: Pt }[] = [372, 388, 404].map((x) => ({
  seat: { x, y: 163 },
  front: { x, y: 186 },
}));

/** Spots in front of the demo tables where waiting customers browse. */
export const BROWSE: Spot[] = [
  { x: 440, y: 150, face: 'up' },
  { x: 464, y: 150, face: 'up' },
  { x: 200, y: 154, face: 'up' },
  { x: 228, y: 154, face: 'up' },
  { x: 128, y: 154, face: 'up' },
  { x: 152, y: 154, face: 'up' },
];

export type StationId = 'desk' | 'accessories' | 'clientTable';

export interface Slot {
  emp: Spot;
  cust: Spot;
}

/** Where a transaction happens once the puzzle is solved. */
export const STATIONS: Record<StationId, Slot[]> = {
  desk: [
    { emp: { x: 290, y: 158, face: 'down' }, cust: { x: 290, y: 184, face: 'up' } },
    { emp: { x: 324, y: 158, face: 'down' }, cust: { x: 324, y: 184, face: 'up' } },
  ],
  accessories: [
    { emp: { x: 256, y: 80, face: 'up' }, cust: { x: 272, y: 80, face: 'up' } },
    { emp: { x: 466, y: 80, face: 'up' }, cust: { x: 482, y: 80, face: 'up' } },
  ],
  clientTable: [
    { emp: { x: 32, y: 130, face: 'down' }, cust: { x: 32, y: 166, face: 'up' } },
    { emp: { x: 76, y: 130, face: 'down' }, cust: { x: 76, y: 166, face: 'up' } },
  ],
};

/** Prop footprints grown a little so bodies don't overlap the furniture. */
export function obstacles(): { x0: number; y0: number; x1: number; y1: number }[] {
  return PROPS.filter((p) => p.footprint).map((p) => {
    const [x0, y0, x1, y1] = p.footprint as number[];
    return { x0: x0 - 3, y0: y0 - 1, x1: x1 + 3, y1: y1 + 1 };
  });
}
