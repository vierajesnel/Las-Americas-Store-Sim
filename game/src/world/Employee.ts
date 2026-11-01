import Phaser from 'phaser';
import type { CrewDef } from '../data/crew';
import { Person } from './Person';

/**
 * idle: at their post (or walking back to it), free for the next customer
 * reserved: someone is solving a puzzle for a customer they'll help
 * toStation / processing: busy with a customer
 */
export type EmployeeState = 'idle' | 'reserved' | 'toStation' | 'processing';

const OVERLAY_DEPTH = 10_000;

export class Employee extends Person {
  state: EmployeeState = 'idle';
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private progress: number | null = null;

  constructor(scene: Phaser.Scene, readonly def: CrewDef) {
    super(scene, def.sheet, def.post.x, def.post.y);
    this.face(def.post.face);
    this.barBack = scene.add.rectangle(0, 0, 14, 3, 0x1b1420).setOrigin(0.5, 0).setDepth(OVERLAY_DEPTH);
    this.barFill = scene.add.rectangle(0, 0, 12, 1, 0x34ceff).setOrigin(0, 0).setDepth(OVERLAY_DEPTH + 1);
    this.setProgress(null);
  }

  get available(): boolean {
    return this.state === 'idle';
  }

  /** Work progress bar over their head, or null to hide it. */
  setProgress(value: number | null): void {
    this.progress = value;
    this.barBack.setVisible(value !== null);
    this.barFill.setVisible(value !== null);
  }

  override update(dt: number): void {
    super.update(dt);
    if (this.progress === null) return;
    const x = Math.round(this.x);
    this.barBack.setPosition(x, this.headY - 4);
    this.barFill.setPosition(x - 6, this.headY - 3);
    this.barFill.width = Math.max(1, Math.round(12 * Math.min(1, this.progress)));
  }

  override destroy(): void {
    super.destroy();
    this.barBack.destroy();
    this.barFill.destroy();
  }
}
