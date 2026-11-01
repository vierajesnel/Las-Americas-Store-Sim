import Phaser from 'phaser';
import { CREW, CUSTOMER_SHEETS } from '../data/crew';
import { PROPS } from '../data/layout';
import { createAnimations } from '../world/Person';

export const SHEETS = [...CREW.map((c) => c.sheet), ...CUSTOMER_SHEETS];
const BUBBLES = ['bill', 'phone', 'accessory', 'internet', 'unsure', 'happy', 'angry'];

/** Loads every asset, sets up animations, then opens the store. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.image('store_bg', 'assets/map/store_bg.png');
    for (const p of PROPS) this.load.image(`prop_${p.key}`, `assets/map/props/${p.key}.png`);
    for (const sheet of SHEETS) {
      this.load.spritesheet(sheet, `assets/sprites/${sheet}.png`, { frameWidth: 20, frameHeight: 32 });
    }
    for (const b of BUBBLES) this.load.image(`bubble_${b}`, `assets/map/bubble_${b}.png`);
    this.load.bitmapFont('pixel', 'assets/map/pixelfont.png', 'assets/map/pixelfont.xml');
  }

  create(): void {
    for (const sheet of SHEETS) createAnimations(this, sheet);
    this.scene.start('shift');
  }
}
