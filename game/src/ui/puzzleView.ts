import type { PuzzleKind } from '../logic/needs';
import { pick, shuffle } from '../logic/rng';
import { generateBill, money } from '../puzzles/bill';
import { CAMERAS, generateCase, type CameraLayout } from '../puzzles/case';
import { COLORS, generatePhone, type Phone } from '../puzzles/phone';
import { avatar, el, frameLoop } from './dom';

export interface PuzzleRequest {
  kind: PuzzleKind;
  customerSheet: string;
  employee: string;
  need: string;
}

export interface PuzzleResult {
  success: boolean;
  /** Fraction of the puzzle timer left when it was solved (0-1). */
  timeLeft: number;
}

/** Seconds of "Salesforce is loading..." before the puzzle shows up. */
const LOAD_SECONDS = 1.2;
const WRONG_PENALTY = 3;
const TIME: Record<PuzzleKind, number> = { bill: 14, phone: 13, case: 10 };

const LOADING_LINES = [
  'Logging into Salesforce...',
  'Salesforce is loading...',
  'Authenticating customer...',
  'Opening OPUS...',
  'Waiting for OPUS (again)...',
];

/** Debug builds mark the right answer so the automated playtest can solve puzzles. */
const DEBUG = new URLSearchParams(location.search).has('debug');

interface Body {
  node: HTMLElement;
}

type Answer = (correct: boolean, button: HTMLElement) => void;

export function openPuzzle(
  host: HTMLElement,
  req: PuzzleRequest,
  paused: () => boolean,
  onDone: (result: PuzzleResult) => void,
): void {
  const timerFill = el('i');
  const loadFill = el('i');
  const loading = el('div', 'loading', [el('span', '', [pick(Math.random, LOADING_LINES)]), el('div', 'bar', [loadFill])]);
  const stamp = el('div', 'stamp');
  const total = TIME[req.kind];
  let timeLeft = total;
  let phase: 'loading' | 'solving' | 'done' = 'loading';
  let loaded = 0;

  const answer: Answer = (correct, button) => {
    if (phase !== 'solving') return;
    if (correct) {
      button.classList.add('right');
      finish(true);
    } else {
      timeLeft -= WRONG_PENALTY;
      button.classList.remove('wrong');
      void button.offsetWidth; // restart the shake animation
      button.classList.add('wrong');
    }
  };

  const body = buildBody(req.kind, answer);
  body.node.classList.add('hidden');

  const panel = el('div', `panel puzzle-panel puzzle-${req.kind}`, [
    el('header', '', [
      avatar(req.customerSheet, 'avatar small'),
      el('div', 'who', [el('b', '', [req.need]), el('span', '', [`with ${req.employee}`])]),
      el('div', 'timer', [timerFill]),
    ]),
    loading,
    body.node,
    stamp,
  ]);
  const modal = el('div', 'modal dim', [panel]);
  host.append(modal);

  function finish(success: boolean) {
    phase = 'done';
    stamp.textContent = success ? 'RESOLVED' : 'ESCALATED';
    stamp.className = `stamp show ${success ? 'good' : 'bad'}`;
    const result = { success, timeLeft: Math.max(0, timeLeft) / total };
    setTimeout(() => {
      modal.remove();
      onDone(result);
    }, 750);
  }

  frameLoop(paused, (dt) => {
    if (phase === 'loading') {
      loaded += dt;
      loadFill.style.width = `${Math.min(100, (loaded / LOAD_SECONDS) * 100)}%`;
      if (loaded >= LOAD_SECONDS) {
        phase = 'solving';
        loading.remove();
        body.node.classList.remove('hidden');
      }
    } else if (phase === 'solving') {
      timeLeft -= dt;
      const frac = Math.max(0, timeLeft / total);
      timerFill.style.width = `${frac * 100}%`;
      timerFill.className = frac < 0.3 ? 'low' : '';
      if (timeLeft <= 0) finish(false);
    }
    return phase !== 'done';
  });
}

function buildBody(kind: PuzzleKind, answer: Answer): Body {
  switch (kind) {
    case 'bill':
      return billBody(answer);
    case 'phone':
      return phoneBody(answer);
    case 'case':
      return caseBody(answer);
  }
}

function quote(text: string): HTMLElement {
  return el('p', 'quote', [`"${text}"`]);
}

function choice(className: string, correct: boolean, children: (Node | string)[], answer: Answer): HTMLButtonElement {
  const button = el('button', className, children);
  if (DEBUG && correct) button.dataset.answer = '1';
  button.addEventListener('click', () => answer(correct, button));
  return button;
}

function billBody(answer: Answer): Body {
  const p = generateBill(Math.random);
  const total = p.lines.reduce((sum, l) => sum + l.amount, 0);
  const lines = p.lines.map((line, i) =>
    choice('bill-line', p.answers.includes(i), [el('span', '', [line.label]), el('span', 'amt', [money(line.amount)])], answer),
  );
  const bill = el('div', 'bill', [
    el('div', 'bill-head', [el('span', '', ['Monthly statement']), el('span', 'hint', ["Tap the charge that doesn't belong"])]),
    ...lines,
    el('div', 'bill-total', [el('span', '', ['Total due']), el('span', 'amt', [money(total)])]),
  ]);
  return { node: el('div', 'body', [quote(p.quote), bill]) };
}

function phoneBody(answer: Answer): Body {
  const p = generatePhone(Math.random);
  const chip = (text: string, color?: string) => {
    const c = el('span', 'chip', [text]);
    if (color) c.prepend(swatch(color));
    return c;
  };
  const wish = el('div', 'wish', [
    el('span', 'hint', ['Wants:']),
    chip(p.wish.brand),
    chip(p.wish.color, COLORS[p.wish.color]),
    chip(`${p.wish.storage}GB`),
  ]);
  const cards = p.options.map((phone, i) => choice('phone-card', i === p.answer, phoneCard(phone), answer));
  return { node: el('div', 'body', [quote(p.quote), wish, el('div', 'phones', cards)]) };
}

function swatch(color: string): HTMLElement {
  const s = el('i', 'swatch');
  s.style.background = color;
  return s;
}

function phoneCard(phone: Phone): (Node | string)[] {
  const handset = el('div', 'handset');
  handset.style.background = COLORS[phone.color];
  return [
    handset,
    el('div', 'specs', [
      el('b', '', [phone.brand]),
      el('span', '', [swatch(COLORS[phone.color]), phone.color]),
      el('span', 'storage', [`${phone.storage}GB`]),
    ]),
  ];
}

const CASE_COLORS = ['#e2554f', '#f0a0be', '#4f7fd0', '#6aae7c', '#f0c83c', '#9270cc', '#2a2a31'];

function caseBody(answer: Answer): Body {
  const p = generateCase(Math.random);
  const colors = shuffle(Math.random, CASE_COLORS);
  const theirs = el('div', 'their-phone', [phoneBack(p.phone, '#d9dce3'), el('span', 'hint', ['Their phone'])]);
  const cases = p.options.map((layout, i) =>
    choice('case', i === p.answer, [caseBack(layout, colors[i % colors.length])], answer),
  );
  return {
    node: el('div', 'body', [
      quote(p.quote),
      el('div', 'case-row', [theirs, el('div', 'cases', cases)]),
      el('p', 'hint center', ['Tap the case whose cutouts match their camera']),
    ]),
  };
}

const SVG = 'http://www.w3.org/2000/svg';

function svg(children: string): SVGSVGElement {
  const node = document.createElementNS(SVG, 'svg');
  node.setAttribute('viewBox', '0 0 32 60');
  node.innerHTML = children;
  return node;
}

/** The customer's phone from the back: body, camera bump, lenses. */
function phoneBack(layout: CameraLayout, color: string): SVGSVGElement {
  const cam = CAMERAS[layout];
  const bump = cam.bump
    ? `<rect x="${cam.bump.x}" y="${cam.bump.y}" width="${cam.bump.w}" height="${cam.bump.h}" rx="${cam.bump.r}" fill="#9ea3ae"/>`
    : '';
  const lenses = cam.lenses
    .map((l) => `<circle cx="${l.x}" cy="${l.y}" r="${l.r}" fill="#1b1420"/><circle cx="${l.x - 0.7}" cy="${l.y - 0.7}" r="0.7" fill="#7fb4e6"/>`)
    .join('');
  return svg(`<rect x="0" y="0" width="32" height="60" rx="5" fill="${color}"/>${bump}${lenses}`);
}

/** A case from the back: one hole per lens, plus the outline of the bump. */
function caseBack(layout: CameraLayout, color: string): SVGSVGElement {
  const cam = CAMERAS[layout];
  const ring = cam.bump
    ? `<rect x="${cam.bump.x}" y="${cam.bump.y}" width="${cam.bump.w}" height="${cam.bump.h}" rx="${cam.bump.r}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`
    : '';
  const holes = cam.lenses.map((l) => `<circle cx="${l.x}" cy="${l.y}" r="${l.r + 0.6}" fill="#14121c"/>`).join('');
  return svg(`<rect x="0" y="0" width="32" height="60" rx="6" fill="${color}"/>${ring}${holes}`);
}
