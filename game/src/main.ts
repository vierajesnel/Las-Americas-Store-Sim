import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import Phaser from 'phaser';
import { MAP_H, MAP_W } from './data/layout';
import { BootScene } from './scenes/BootScene';
import { ShiftScene } from './scenes/ShiftScene';
import './ui/style.css';
import { UI } from './ui/ui';

const ui = new UI(document.getElementById('ui') as HTMLElement);

// The game draws at the map's real size (512x224) and the browser scales the
// canvas up with crisp pixels.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: MAP_W,
  height: MAP_H,
  backgroundColor: '#14121c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, ShiftScene],
});
game.registry.set('ui', ui);

const fit = () => ui.fitTo(game.canvas);
game.events.once(Phaser.Core.Events.READY, fit);
game.scale.on(Phaser.Scale.Events.RESIZE, fit);
window.addEventListener('resize', () => requestAnimationFrame(fit));

if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, { game, ui });
}
