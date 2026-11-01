import { CREW } from '../data/crew';
import { MAP_W } from '../data/layout';
import { avatar, dollars, el } from './dom';
import { openPuzzle, type PuzzleRequest, type PuzzleResult } from './puzzleView';

export type { PuzzleRequest, PuzzleResult };

export interface HudState {
  clock: string;
  money: number;
  served: number;
  lost: number;
}

export interface ShiftStats {
  money: number;
  served: number;
  lost: number;
  stars: number;
  best: number;
  newBest: boolean;
}

const QUIPS: Record<number, string> = {
  5: 'No Manager Override needed. Legend.',
  4: 'Solid shift. OPUS only crashed twice.',
  3: 'Could have been worse. Could have been Salesforce.',
  2: 'Rough one. Somebody tell Matthew.',
  1: 'The line went out the door. Literally.',
};

/**
 * Everything drawn in HTML on top of the game canvas: HUD, toasts, the punch
 * clock, puzzles, pause and the end-of-shift summary. Sizes use --u, one map
 * pixel in CSS pixels, so the interface scales with the store.
 */
export class UI {
  paused = false;
  puzzleOpen = false;
  private readonly hud: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly hudClock = el('span', 'time');
  private readonly hudMoney = el('span');
  private readonly hudServed = el('span', 'ok');
  private readonly hudLost = el('span', 'bad');
  private pauseButton = el('button', 'pill pause', ['II']);

  constructor(private readonly root: HTMLElement) {
    this.hud = el('div', 'hud hidden', [
      el('div', 'pill', [this.hudClock]),
      el('div', 'pill money', [this.hudMoney]),
      el('div', 'pill stats', [this.hudServed, this.hudLost]),
      this.pauseButton,
    ]);
    this.toasts = el('div', 'toasts');
    root.append(this.hud, this.toasts);
  }

  /** Keep the interface layer exactly on top of the canvas. */
  fitTo(canvas: HTMLCanvasElement): void {
    const r = canvas.getBoundingClientRect();
    Object.assign(this.root.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    this.root.style.setProperty('--u', `${r.width / MAP_W}px`);
  }

  showTitle(best: number, onClockIn: () => void): void {
    const button = el('button', 'primary', ['Clock In']);
    const card = el('div', 'panel punch', [
      el('div', 'punch-head', ['Punch Clock']),
      el('div', 'punch-status', [el('b', '', ['Clocked Out']), el('span', '', ['Today'])]),
      el('div', 'crew-row', CREW.map((c) => avatar(c.sheet))),
      el('h1', '', ['Las Americas']),
      el('p', 'sub', ['Authorized Chaos']),
      el('div', 'field', ['•'.repeat(8)]),
      button,
      el('p', 'hint', [best > 0 ? `Best shift: ${dollars(best)}` : 'Tap customers to help them before they run out of patience.']),
    ]);
    const modal = el('div', 'modal dim', [card]);
    button.addEventListener('click', () => {
      modal.remove();
      onClockIn();
    });
    this.root.append(modal);
  }

  showHud(onPause: () => void): void {
    this.hud.classList.remove('hidden');
    this.pauseButton.onclick = onPause;
  }

  updateHud(s: HudState): void {
    this.hudClock.textContent = s.clock;
    this.hudMoney.textContent = dollars(s.money);
    this.hudServed.textContent = `✓ ${s.served}`;
    this.hudLost.textContent = `✗ ${s.lost}`;
  }

  toast(text: string, ms = 2200): void {
    const t = el('div', 'toast', [text]);
    this.toasts.append(t);
    setTimeout(() => t.classList.add('out'), ms);
    setTimeout(() => t.remove(), ms + 400);
  }

  showPause(onResume: () => void): void {
    this.paused = true;
    const button = el('button', 'primary', ['Back to work']);
    const modal = el('div', 'modal dim pause-modal', [
      el('div', 'panel small-panel', [el('h2', '', ['On break']), el('p', 'hint', ["The customers will wait. (They won't.)"]), button]),
    ]);
    button.addEventListener('click', () => {
      modal.remove();
      this.paused = false;
      onResume();
    });
    this.root.append(modal);
  }

  openPuzzle(req: PuzzleRequest, onDone: (r: PuzzleResult) => void): void {
    this.puzzleOpen = true;
    openPuzzle(this.root, req, () => this.paused, (result) => {
      this.puzzleOpen = false;
      onDone(result);
    });
  }

  showSummary(stats: ShiftStats, onAgain: () => void): void {
    this.hud.classList.add('hidden');
    const button = el('button', 'primary', ['Clock In Again']);
    const row = (label: string, value: string) => el('div', 'stat', [el('span', '', [label]), el('b', '', [value])]);
    const modal = el('div', 'modal dim', [
      el('div', 'panel summary', [
        el('h2', '', ['Clocked Out']),
        el('div', 'stars', ['★'.repeat(stats.stars) + '☆'.repeat(5 - stats.stars)]),
        row('Money made', dollars(stats.money)),
        row('Customers helped', String(stats.served)),
        row('Walked out', String(stats.lost)),
        el('p', 'hint', [stats.newBest ? 'New best shift!' : `Best shift: ${dollars(stats.best)}`]),
        el('p', 'quip', [QUIPS[stats.stars]]),
        button,
      ]),
    ]);
    button.addEventListener('click', () => {
      modal.remove();
      onAgain();
    });
    this.root.append(modal);
  }
}
