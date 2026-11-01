import Phaser from 'phaser';
import { CREW, CUSTOMER_SHEETS } from '../data/crew';
import {
  BROWSE, DOOR_INSIDE, DOOR_OUTSIDE, FLOOR, MAP_H, MAP_W, PROPS, QUEUE, SOFA, STATIONS,
  obstacles, type Pt, type StationId,
} from '../data/layout';
import { NavGrid } from '../logic/nav';
import { NEEDS, WAIT_DRAIN, payout, type WaitKind } from '../logic/needs';
import { between, pick, weighted } from '../logic/rng';
import { SHIFT_SECONDS, clockLabel, rushAt, spawnDelay, stars } from '../logic/shift';
import type { PuzzleResult, UI } from '../ui/ui';
import { Customer } from '../world/Customer';
import { Employee } from '../world/Employee';

/** A customer and an employee heading to (or working at) a station. */
interface Job {
  customer: Customer;
  employee: Employee;
  amount: number;
  station: StationId;
  /** Index into STATIONS[station]; null while every slot there is busy. */
  slot: number | null;
  arrived: number;
  /** Seconds of work left; null until both have arrived. */
  workLeft: number | null;
}

type Phase = 'title' | 'open' | 'closing' | 'over';

const BEST_KEY = 'las-americas.best';

/** ?debug&speed=4 runs the floor 4x faster for playtesting. Puzzles stay real-time. */
const params = new URLSearchParams(location.search);
const SPEED = params.has('debug') ? Number(params.get('speed')) || 1 : 1;

/** The sales floor: one shift from opening to closing. */
export class ShiftScene extends Phaser.Scene {
  private ui!: UI;
  private nav!: NavGrid;
  private crew: Employee[] = [];
  private customers: Customer[] = [];
  private jobs: Job[] = [];
  private spots!: Record<WaitKind, (Customer | null)[]>;
  private slotsBusy!: Record<StationId, boolean[]>;
  private phase: Phase = 'title';
  private elapsed = 0;
  private nextSpawn = 0;
  private money = 0;
  private served = 0;
  private lost = 0;
  private rushesShown = new Set<string>();
  private tipShown = false;
  private hudIn = 0;

  constructor() {
    super('shift');
  }

  create(data: { autostart?: boolean }): void {
    // the scene object is reused on restart, so reset everything here
    this.ui = this.registry.get('ui') as UI;
    this.crew = [];
    this.customers = [];
    this.jobs = [];
    this.spots = { queue: QUEUE.map(() => null), sofa: SOFA.map(() => null), browse: BROWSE.map(() => null) };
    this.slotsBusy = { desk: [false, false], accessories: [false, false], clientTable: [false, false] };
    this.phase = 'title';
    this.elapsed = 0;
    this.nextSpawn = 2;
    this.money = this.served = this.lost = 0;
    this.rushesShown = new Set();
    this.tipShown = false;

    this.add.image(0, 0, 'store_bg').setOrigin(0).setDepth(-1);
    for (const p of PROPS) this.add.image(p.x, p.y, `prop_${p.key}`).setOrigin(0).setDepth(p.baseY);
    this.nav = new NavGrid(MAP_W, MAP_H, FLOOR, obstacles());
    this.crew = CREW.map((def) => new Employee(this, def));

    const onVisibility = () => {
      if (document.hidden) this.pauseGame();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('visibilitychange', onVisibility));

    if (data?.autostart) this.startShift();
    else this.ui.showTitle(loadBest(), () => this.startShift());
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1) * SPEED;
    for (const person of [...this.crew, ...this.customers]) person.update(dt);
    if (this.phase !== 'open' && this.phase !== 'closing') return;

    if (this.phase === 'open') {
      this.elapsed += dt;
      const progress = this.elapsed / SHIFT_SECONDS;
      const rush = rushAt(progress);
      if (rush && !this.rushesShown.has(rush.name)) {
        this.rushesShown.add(rush.name);
        this.ui.toast(rush.name);
      }
      this.nextSpawn -= dt;
      if (this.nextSpawn <= 0) {
        this.spawnCustomer();
        this.nextSpawn = spawnDelay(progress, Math.random);
      }
      if (this.elapsed >= SHIFT_SECONDS) this.closeStore();
    }

    for (const c of [...this.customers]) {
      if (c.state !== 'waiting' && c.state !== 'entering') continue;
      c.patience -= dt * (c.wait ? WAIT_DRAIN[c.wait.kind] : 1);
      if (c.patience <= 0) {
        this.lost++;
        this.sendHome(c, 'angry');
      }
    }

    for (const job of [...this.jobs]) {
      if (job.slot === null) {
        this.tryStartJob(job);
      } else if (job.workLeft !== null) {
        job.workLeft -= dt;
        job.employee.setProgress(1 - job.workLeft / job.customer.need.work);
        if (job.workLeft <= 0) this.finishJob(job);
      }
    }

    this.hudIn -= dt;
    if (this.hudIn <= 0) {
      this.hudIn = 0.25;
      this.refreshHud();
    }

    if (this.phase === 'closing' && this.customers.length === 0 && this.jobs.length === 0 && !this.ui.puzzleOpen) {
      this.endShift();
    }
  }

  // --- shift lifecycle -----------------------------------------------------

  private startShift(): void {
    this.phase = 'open';
    this.ui.showHud(() => this.pauseGame());
    this.refreshHud();
    goFullscreen();
  }

  private pauseGame(): void {
    if ((this.phase !== 'open' && this.phase !== 'closing') || this.ui.paused) return;
    this.scene.pause();
    this.ui.showPause(() => this.scene.resume());
  }

  private closeStore(): void {
    this.phase = 'closing';
    this.ui.toast("9 PM! Store's closing.");
    for (const c of [...this.customers]) {
      if (c.state === 'waiting' || c.state === 'entering') this.sendHome(c, null);
    }
  }

  private endShift(): void {
    this.phase = 'over';
    this.refreshHud();
    const best = loadBest();
    const newBest = this.money > best;
    if (newBest) saveBest(this.money);
    this.ui.showSummary(
      { money: this.money, served: this.served, lost: this.lost, stars: stars(this.served, this.lost), best: Math.max(best, this.money), newBest },
      () => this.scene.restart({ autostart: true }),
    );
  }

  private refreshHud(): void {
    this.ui.updateHud({ clock: clockLabel(this.elapsed), money: this.money, served: this.served, lost: this.lost });
  }

  // --- customers -------------------------------------------------------------

  private spawnCustomer(): void {
    const need = weighted(Math.random, Object.values(NEEDS), (n) => n.weight);
    const patience = need.patience * between(Math.random, 0.85, 1.15);
    const c = new Customer(this, pick(Math.random, CUSTOMER_SHEETS), DOOR_OUTSIDE.x, DOOR_OUTSIDE.y, need, patience);
    this.customers.push(c);
    c.onTap(() => this.onCustomerTap(c));

    const kind = (['queue', 'sofa', 'browse'] as WaitKind[]).find((k) => this.spots[k].includes(null));
    if (!kind) {
      // took one look at the line and turned around
      this.lost++;
      c.state = 'leaving';
      c.walkPoints([DOOR_INSIDE, { x: DOOR_INSIDE.x - 12, y: DOOR_INSIDE.y }], () => {
        c.showMood('angry');
        this.time.delayedCall(500, () => this.walkOut(c));
      });
      this.ui.toast('Someone saw the line and walked right back out.');
      return;
    }
    const free = this.spots[kind].flatMap((s, i) => (s === null ? [i] : []));
    const index = kind === 'browse' ? pick(Math.random, free) : free[0];
    this.spots[kind][index] = c;
    c.wait = { kind, index };
    c.showNeed(true);
    c.walkPoints([DOOR_INSIDE], () => this.goToSpot(c));
  }

  private goToSpot(c: Customer): void {
    if (!c.wait) return;
    const { kind, index } = c.wait;
    const target: Pt = kind === 'queue' ? QUEUE[index] : kind === 'sofa' ? SOFA[index].front : BROWSE[index];
    c.walkTo(this.nav, target, () => this.arriveAtSpot(c));
  }

  private arriveAtSpot(c: Customer): void {
    if (c.state !== 'entering' && c.state !== 'waiting') return;
    if (!c.wait) return;
    const { kind, index } = c.wait;
    if (kind === 'sofa') {
      c.place(SOFA[index].seat);
      c.face('down');
    } else {
      c.face(kind === 'queue' ? QUEUE[index].face : BROWSE[index].face);
    }
    c.state = 'waiting';
    if (!this.tipShown) {
      this.tipShown = true;
      this.ui.toast('Tap a customer to help them!', 3500);
    }
  }

  /** Give up their waiting spot; the line shuffles forward. */
  private freeSpot(c: Customer): void {
    if (!c.wait) return;
    const { kind, index } = c.wait;
    const list = this.spots[kind];
    list[index] = null;
    c.wait = null;
    if (kind !== 'queue') return;
    for (let i = index + 1; i < list.length; i++) {
      const next = list[i];
      if (!next) continue;
      list[i - 1] = next;
      list[i] = null;
      next.wait = { kind, index: i - 1 };
      if (next.state === 'waiting' || next.state === 'entering') this.goToSpot(next);
    }
  }

  private onCustomerTap(c: Customer): void {
    if (this.ui.puzzleOpen || this.ui.paused) return;
    if (this.phase !== 'open' && this.phase !== 'closing') return;
    if (c.state !== 'waiting' && c.state !== 'entering') return;
    const emp = this.nearestAvailable(c);
    if (!emp) {
      this.ui.toast("Everyone's busy!", 1200);
      return;
    }
    emp.stop();
    emp.state = 'reserved';
    if (c.state === 'entering') c.stop();
    c.state = 'claimed';
    c.showNeed(false);
    this.ui.openPuzzle(
      { kind: c.need.puzzle, customerSheet: c.sheet, employee: emp.def.name, need: c.need.label },
      (result) => this.onPuzzleDone(c, emp, result),
    );
  }

  private onPuzzleDone(c: Customer, emp: Employee, result: PuzzleResult): void {
    this.freeSpot(c);
    if (!result.success) {
      emp.state = 'idle';
      this.returnToPost(emp);
      this.lost++;
      this.sendHome(c, 'angry');
      return;
    }
    c.state = 'toStation';
    emp.state = 'toStation';
    const job: Job = {
      customer: c,
      employee: emp,
      amount: payout(c.need.base, c.patienceLeft, result.timeLeft),
      station: c.need.station,
      slot: null,
      arrived: 0,
      workLeft: null,
    };
    this.jobs.push(job);
    this.tryStartJob(job);
  }

  private sendHome(c: Customer, mood: 'happy' | 'angry' | null): void {
    this.freeSpot(c);
    c.state = 'leaving';
    c.showNeed(false);
    if (mood) c.showMood(mood);
    c.walkTo(this.nav, DOOR_INSIDE, () => this.walkOut(c));
  }

  private walkOut(c: Customer): void {
    c.walkPoints([DOOR_OUTSIDE], () => {
      c.destroy();
      this.customers = this.customers.filter((other) => other !== c);
    });
  }

  // --- jobs ------------------------------------------------------------------

  private tryStartJob(job: Job): void {
    const busy = this.slotsBusy[job.station];
    const free = busy.indexOf(false);
    if (free < 0) return; // every slot taken; try again next frame
    busy[free] = true;
    job.slot = free;
    const slot = STATIONS[job.station][free];
    const arrive = () => {
      job.arrived++;
      if (job.arrived < 2) return;
      job.workLeft = job.customer.need.work;
      job.employee.state = 'processing';
      job.customer.state = 'processing';
      job.employee.setProgress(0);
    };
    job.customer.walkTo(this.nav, slot.cust, () => {
      job.customer.face(slot.cust.face);
      arrive();
    });
    job.employee.walkTo(this.nav, slot.emp, () => {
      job.employee.face(slot.emp.face);
      arrive();
    });
  }

  private finishJob(job: Job): void {
    this.jobs = this.jobs.filter((j) => j !== job);
    if (job.slot !== null) this.slotsBusy[job.station][job.slot] = false;
    this.money += job.amount;
    this.served++;
    this.popup(job.employee.x, job.employee.headY - 2, `+$${job.amount}`, 0x7dff8a);
    job.employee.setProgress(null);
    job.employee.state = 'idle';
    this.returnToPost(job.employee);
    this.sendHome(job.customer, 'happy');
    this.refreshHud();
  }

  // --- crew ------------------------------------------------------------------

  private nearestAvailable(c: Customer): Employee | null {
    let best: Employee | null = null;
    let bestDist = Infinity;
    for (const e of this.crew) {
      if (!e.available) continue;
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private returnToPost(e: Employee): void {
    e.walkTo(this.nav, e.def.post, () => e.face(e.def.post.face));
  }

  private popup(x: number, y: number, text: string, tint: number): void {
    const t = this.add.bitmapText(Math.round(x), Math.round(y), 'pixel', text).setOrigin(0.5, 1).setDepth(20_000).setTint(tint);
    this.tweens.add({ targets: t, y: t.y - 12, duration: 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    this.tweens.add({ targets: t, alpha: 0, delay: 600, duration: 300 });
  }
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(money: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(money));
  } catch {
    // private mode etc.; the best score just won't stick
  }
}

/** On phones, take over the screen sideways (where the browser allows it). */
function goFullscreen(): void {
  if (!matchMedia('(pointer: coarse)').matches || document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.().catch(() => {});
  const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
  orientation.lock?.('landscape').catch(() => {});
}
