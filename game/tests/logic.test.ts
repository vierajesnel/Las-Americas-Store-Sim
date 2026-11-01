import { describe, expect, it } from 'vitest';
import { CREW } from '../src/data/crew';
import {
  BROWSE, DOOR_INSIDE, FLOOR, MAP_H, MAP_W, QUEUE, SOFA, STATIONS, obstacles, type Pt,
} from '../src/data/layout';
import { NavGrid } from '../src/logic/nav';
import { payout } from '../src/logic/needs';
import { seeded } from '../src/logic/rng';
import { clockLabel, SHIFT_SECONDS, spawnDelay, stars } from '../src/logic/shift';
import { generateBill } from '../src/puzzles/bill';
import { generateCase } from '../src/puzzles/case';
import { generatePhone } from '../src/puzzles/phone';

const nav = new NavGrid(MAP_W, MAP_H, FLOOR, obstacles());

describe('nav grid', () => {
  const spots: [string, Pt][] = [
    ...QUEUE.map((p, i): [string, Pt] => [`queue ${i}`, p]),
    ...SOFA.map((s, i): [string, Pt] => [`sofa front ${i}`, s.front]),
    ...BROWSE.map((p, i): [string, Pt] => [`browse ${i}`, p]),
    ...CREW.map((c): [string, Pt] => [`post ${c.name}`, c.post]),
    ...Object.entries(STATIONS).flatMap(([id, slots]) =>
      slots.flatMap((s, i): [string, Pt][] => [[`${id} ${i} emp`, s.emp], [`${id} ${i} cust`, s.cust]]),
    ),
  ];

  it.each(spots)('%s is on open floor', (_name, p) => {
    expect(nav.isFree(p.x, p.y)).toBe(true);
  });

  it.each(spots)('%s is reachable from the door', (_name, p) => {
    const path = nav.path(DOOR_INSIDE, p);
    expect(path).not.toBeNull();
    expect(path!.at(-1)).toEqual({ x: p.x, y: p.y });
  });

  it('gets up from a sofa seat and back to the door', () => {
    const path = nav.path(SOFA[1].seat, DOOR_INSIDE);
    expect(path).not.toBeNull();
    expect(nav.isFree(path![0].x, path![0].y)).toBe(true);
  });

  it('never cuts through furniture', () => {
    const path = nav.path(STATIONS.clientTable[0].cust, STATIONS.accessories[1].emp)!;
    let prev: Pt = STATIONS.clientTable[0].cust;
    for (const p of path) {
      const steps = Math.ceil(Math.hypot(p.x - prev.x, p.y - prev.y));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        expect(nav.isFree(prev.x + (p.x - prev.x) * t, prev.y + (p.y - prev.y) * t)).toBe(true);
      }
      prev = p;
    }
  });
});

describe('puzzles always have exactly one right answer', () => {
  it('bill check', () => {
    const rng = seeded(1);
    for (let n = 0; n < 500; n++) {
      const p = generateBill(rng);
      expect(p.lines).toHaveLength(5);
      expect(p.answers.length).toBeGreaterThan(0);
      const answerLabel = p.lines[p.answers[0]].label;
      p.lines.forEach((line, i) => expect(p.answers.includes(i)).toBe(line.label === answerLabel));
    }
  });

  it('phone pick', () => {
    const rng = seeded(2);
    for (let n = 0; n < 500; n++) {
      const p = generatePhone(rng);
      expect(p.options).toHaveLength(6);
      const matches = p.options.filter(
        (o) => o.brand === p.wish.brand && o.color === p.wish.color && o.storage === p.wish.storage,
      );
      expect(matches).toHaveLength(1);
      expect(p.options[p.answer]).toEqual(p.wish);
    }
  });

  it('case fit', () => {
    const rng = seeded(3);
    for (let n = 0; n < 500; n++) {
      const p = generateCase(rng);
      expect(p.options).toHaveLength(4);
      expect(new Set(p.options).size).toBe(4);
      expect(p.options.filter((o) => o === p.phone)).toHaveLength(1);
      expect(p.options[p.answer]).toBe(p.phone);
    }
  });
});

describe('shift and money', () => {
  it('runs the clock from open to close', () => {
    expect(clockLabel(0)).toBe('10:00 AM');
    expect(clockLabel(SHIFT_SECONDS)).toBe('9:00 PM');
  });

  it('sends customers more often later in the day', () => {
    const avg = (progress: number) => {
      const rng = seeded(4);
      let sum = 0;
      for (let i = 0; i < 200; i++) sum += spawnDelay(progress, rng);
      return sum / 200;
    };
    expect(avg(0.9)).toBeLessThan(avg(0.05));
  });

  it('pays more for happier, faster jobs', () => {
    expect(payout(100, 1, 1)).toBeGreaterThan(payout(100, 0.2, 1));
    expect(payout(100, 1, 1)).toBeGreaterThan(payout(100, 1, 0));
    expect(payout(100, 0, 0)).toBe(60);
  });

  it('rates the shift', () => {
    expect(stars(20, 0)).toBe(5);
    expect(stars(5, 15)).toBe(1);
  });
});
