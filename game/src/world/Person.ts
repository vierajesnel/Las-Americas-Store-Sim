import Phaser from 'phaser';
import type { Facing, Pt } from '../data/layout';
import type { NavGrid } from '../logic/nav';

/** Map pixels per second. */
const WALK_SPEED = 44;

/** Frame numbers in a 4x3 sheet (see art/build_sprites.py). */
const IDLE: Record<Facing, number> = { down: 0, up: 4, right: 8, left: 8 };
const BLINK: Partial<Record<Facing, number>> = { down: 3, right: 11, left: 11 };
const WALK: Record<Facing, string> = { down: 'walk-down', up: 'walk-up', right: 'walk-side', left: 'walk-side' };

/** Register the walk animations for one sheet. Call once per sheet at boot. */
export function createAnimations(scene: Phaser.Scene, sheet: string): void {
  const rows = { 'walk-down': 0, 'walk-up': 4, 'walk-side': 8 };
  for (const [name, first] of Object.entries(rows)) {
    scene.anims.create({
      key: `${sheet}:${name}`,
      frames: scene.anims.generateFrameNumbers(sheet, { frames: [first, first + 1, first, first + 2] }),
      frameRate: 7,
      repeat: -1,
    });
  }
}

/**
 * Anyone on the floor. x/y is where their feet are; they're drawn in front of
 * anything whose base line is above their feet.
 */
export class Person {
  readonly sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  facing: Facing = 'down';
  private path: Pt[] = [];
  private onArrive: (() => void) | null = null;
  private blinkIn = Phaser.Math.FloatBetween(1, 4);
  private blinking = 0;

  constructor(
    protected readonly scene: Phaser.Scene,
    readonly sheet: string,
    x: number,
    y: number,
  ) {
    this.x = x;
    this.y = y;
    this.sprite = scene.add.sprite(x, y + 1, sheet, IDLE.down).setOrigin(0.5, 1);
    this.sync();
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  /** Pathfind to a point. Falls back to walking straight there if there's no path. */
  walkTo(nav: NavGrid, to: Pt, onArrive?: () => void): void {
    this.walkPoints(nav.path(this, to) ?? [to], onArrive);
  }

  /** Walk through fixed points, no pathfinding (e.g. in through the door). */
  walkPoints(points: Pt[], onArrive?: () => void): void {
    this.path = points.map((p) => ({ x: p.x, y: p.y }));
    this.onArrive = onArrive ?? null;
    if (this.path.length === 0) this.arrive();
  }

  stop(): void {
    this.path = [];
    this.onArrive = null;
    this.showIdle();
  }

  /** Jump straight to a point, e.g. sitting down on the sofa. */
  place(p: Pt): void {
    this.x = p.x;
    this.y = p.y;
    this.sync();
  }

  face(dir: Facing): void {
    this.facing = dir;
    this.showIdle();
  }

  update(dt: number): void {
    if (this.path.length > 0) {
      let step = WALK_SPEED * dt;
      while (step > 0 && this.path.length > 0) {
        const target = this.path[0];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01) this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        if (dist <= step) {
          this.x = target.x;
          this.y = target.y;
          step -= dist;
          this.path.shift();
        } else {
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
          step = 0;
        }
      }
      if (this.path.length > 0) {
        this.sprite.setFlipX(this.facing === 'left');
        this.sprite.play(`${this.sheet}:${WALK[this.facing]}`, true);
      } else {
        this.arrive();
      }
    } else {
      this.updateBlink(dt);
    }
    this.sync();
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private arrive(): void {
    this.showIdle();
    const cb = this.onArrive;
    this.onArrive = null;
    cb?.();
  }

  private showIdle(): void {
    this.sprite.stop();
    this.sprite.setFlipX(this.facing === 'left');
    this.sprite.setFrame(IDLE[this.facing]);
  }

  private updateBlink(dt: number): void {
    const blinkFrame = BLINK[this.facing];
    if (blinkFrame === undefined) return;
    if (this.blinking > 0) {
      this.blinking -= dt;
      if (this.blinking <= 0) this.sprite.setFrame(IDLE[this.facing]);
      return;
    }
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkIn = Phaser.Math.FloatBetween(2, 5);
      this.blinking = 0.14;
      this.sprite.setFrame(blinkFrame);
    }
  }

  private sync(): void {
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y) + 1);
    this.sprite.setDepth(this.y);
  }

  /** Where the top of the head is, for things floating above it. */
  get headY(): number {
    return Math.round(this.y) - 31;
  }
}
