/** Tiny DOM helpers for the interface layer. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/** A character's first frame from their spritesheet, drawn as a crisp CSS box. */
export function avatar(sheet: string, className = 'avatar'): HTMLDivElement {
  const node = el('div', className);
  node.style.backgroundImage = `url(assets/sprites/${sheet}.png)`;
  return node;
}

export function dollars(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Runs `fn(dt)` every animation frame until it returns false, skipping time
 * while `paused()` is true (the pause screen, a hidden tab).
 */
export function frameLoop(paused: () => boolean, fn: (dt: number) => boolean): void {
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (paused() ? true : fn(dt)) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
