import type { Pt } from '../data/layout';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** Walkable-floor grid with A* pathfinding, in map pixels. */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly free: Uint8Array;

  constructor(width: number, height: number, floor: Rect, obstacles: Rect[], readonly cell = 4) {
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.free = new Uint8Array(this.cols * this.rows);
    const inside = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * cell + cell / 2;
        const y = r * cell + cell / 2;
        const ok = inside(floor, x, y) && !obstacles.some((o) => inside(o, x, y));
        this.free[r * this.cols + c] = ok ? 1 : 0;
      }
    }
  }

  isFree(x: number, y: number): boolean {
    const c = Math.floor(x / this.cell);
    const r = Math.floor(y / this.cell);
    return this.cellFree(c, r);
  }

  /**
   * Waypoints from `from` to `to`, not including the start. The last point is
   * exactly `to`, even when it's inside furniture (a sofa seat); a start inside
   * furniture steps out to the nearest free spot first. Null if unreachable.
   */
  path(from: Pt, to: Pt): Pt[] | null {
    const start = this.nearestFree(from);
    const goal = this.nearestFree(to);
    if (start === null || goal === null) return null;
    const cells = this.astar(start, goal);
    if (!cells) return null;
    const pts = cells.map((i) => this.center(i));
    pts.push({ x: to.x, y: to.y });
    return this.smooth(from, pts);
  }

  private cellFree(c: number, r: number): boolean {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return false;
    return this.free[r * this.cols + c] === 1;
  }

  private center(i: number): Pt {
    return { x: (i % this.cols) * this.cell + this.cell / 2, y: Math.floor(i / this.cols) * this.cell + this.cell / 2 };
  }

  private nearestFree(p: Pt): number | null {
    const c0 = Math.floor(p.x / this.cell);
    const r0 = Math.floor(p.y / this.cell);
    if (this.cellFree(c0, r0)) return r0 * this.cols + c0;
    for (let radius = 1; radius < 16; radius++) {
      let best: number | null = null;
      let bestDist = Infinity;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius || !this.cellFree(c0 + dc, r0 + dr)) continue;
          const dist = dc * dc + dr * dr;
          if (dist < bestDist) {
            bestDist = dist;
            best = (r0 + dr) * this.cols + c0 + dc;
          }
        }
      }
      if (best !== null) return best;
    }
    return null;
  }

  private astar(start: number, goal: number): number[] | null {
    const n = this.cols * this.rows;
    const g = new Float64Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const heap = new MinHeap();
    const gc = goal % this.cols;
    const gr = Math.floor(goal / this.cols);
    const h = (i: number) => {
      const dc = Math.abs((i % this.cols) - gc);
      const dr = Math.abs(Math.floor(i / this.cols) - gr);
      return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
    };
    g[start] = 0;
    heap.push(start, h(start));
    while (heap.size > 0) {
      const cur = heap.pop();
      if (cur === goal) {
        const out: number[] = [];
        for (let i = goal; i !== start; i = came[i]) out.push(i);
        return out.reverse();
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cc = cur % this.cols;
      const cr = Math.floor(cur / this.cols);
      for (const [dc, dr, cost] of DIRS) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (!this.cellFree(nc, nr)) continue;
        if (dc !== 0 && dr !== 0 && (!this.cellFree(cc + dc, cr) || !this.cellFree(cc, cr + dr))) continue;
        const ni = nr * this.cols + nc;
        const ng = g[cur] + cost;
        if (ng < g[ni]) {
          g[ni] = ng;
          came[ni] = cur;
          heap.push(ni, ng + h(ni));
        }
      }
    }
    return null;
  }

  /** Drop waypoints that can be skipped in a straight line. */
  private smooth(from: Pt, pts: Pt[]): Pt[] {
    const out: Pt[] = [];
    let anchor = from;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineFree(anchor, pts[j])) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  }

  private lineFree(a: Pt, b: Pt): boolean {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2);
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps;
      if (!this.isFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, priority: number): void {
    this.items.push(item);
    this.prio.push(priority);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop() as number;
    const lastPrio = this.prio.pop() as number;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}
