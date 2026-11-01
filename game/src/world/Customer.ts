import Phaser from 'phaser';
import type { NeedDef, WaitKind } from '../logic/needs';
import { Person } from './Person';

export type CustomerState = 'entering' | 'waiting' | 'claimed' | 'toStation' | 'processing' | 'leaving';

/** Above every person and prop. */
const OVERLAY_DEPTH = 10_000;

export class Customer extends Person {
  state: CustomerState = 'entering';
  /** Where they're waiting, if anywhere. */
  wait: { kind: WaitKind; index: number } | null = null;
  patience: number;
  readonly maxPatience: number;
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private mood: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene, sheet: string, x: number, y: number, readonly need: NeedDef, patience: number) {
    super(scene, sheet, x, y);
    this.patience = this.maxPatience = patience;
    this.bubble = scene.add.image(0, 0, need.bubble).setOrigin(0.5, 1).setDepth(OVERLAY_DEPTH);
    this.barBack = scene.add.rectangle(0, 0, 12, 3, 0x1b1420).setOrigin(0.5, 0).setDepth(OVERLAY_DEPTH);
    this.barFill = scene.add.rectangle(0, 0, 10, 1, 0x5ac85a).setOrigin(0, 0).setDepth(OVERLAY_DEPTH + 1);
    this.sprite.setInteractive({ useHandCursor: true });
    this.bubble.setInteractive({ useHandCursor: true });
    this.showNeed(false);
  }

  /** Tap on the customer or their bubble. */
  onTap(fn: () => void): void {
    this.sprite.on('pointerdown', fn);
    this.bubble.on('pointerdown', fn);
  }

  get patienceLeft(): number {
    return Math.max(0, this.patience / this.maxPatience);
  }

  showNeed(visible: boolean): void {
    this.bubble.setVisible(visible);
    this.barBack.setVisible(visible);
    this.barFill.setVisible(visible);
  }

  /** Little heart or anger mark on the way out. */
  showMood(kind: 'happy' | 'angry'): void {
    this.mood = this.scene.add.image(0, 0, `bubble_${kind}`).setOrigin(0.5, 1).setDepth(OVERLAY_DEPTH);
    this.scene.time.delayedCall(1600, () => this.mood?.setVisible(false));
  }

  override update(dt: number): void {
    super.update(dt);
    const x = Math.round(this.x);
    const top = this.headY;
    this.barBack.setPosition(x, top - 4);
    this.bubble.setPosition(x, top - 5);
    const frac = this.patienceLeft;
    this.barFill.setPosition(x - 5, top - 3);
    this.barFill.width = Math.max(1, Math.round(10 * frac));
    this.barFill.fillColor = frac > 0.6 ? 0x5ac85a : frac > 0.3 ? 0xf0c83c : 0xe6463c;
    this.mood?.setPosition(x, top - 1);
  }

  override destroy(): void {
    super.destroy();
    this.bubble.destroy();
    this.barBack.destroy();
    this.barFill.destroy();
    this.mood?.destroy();
    this.mood = null; // the hide timer may still fire after they're gone
  }
}
