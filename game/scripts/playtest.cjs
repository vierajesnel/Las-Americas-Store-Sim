/*
 * Automated playtest: opens the game in headless Chromium as a landscape phone,
 * clocks in, helps customers (solving puzzles via the ?debug answer markers),
 * and saves screenshots. Usage:
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/playtest.cjs <out-dir> [speed] [seconds]
 *
 * Exits non-zero if the page logged any errors.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const out = process.argv[2] || 'playtest-out';
const speed = Number(process.argv[3] || 1);
const seconds = Number(process.argv[4] || 30);
const url = `http://localhost:4173/?debug&speed=${speed}`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) });

  await page.goto(url);
  await page.waitForSelector('.punch button.primary');
  await page.waitForTimeout(600);
  await shot('01-title');
  await page.click('.punch button.primary');

  // tap the most impatient waiting customer, the way a player would
  const tapCustomer = () =>
    page.evaluate(() => {
      const scene = window.game.scene.getScene('shift');
      const waiting = scene.customers.filter((c) => c.state === 'waiting');
      if (!waiting.length) return null;
      waiting.sort((a, b) => a.patienceLeft - b.patienceLeft);
      const c = waiting[0];
      const r = window.game.canvas.getBoundingClientRect();
      const k = r.width / 512;
      return { x: r.left + c.x * k, y: r.top + (c.y - 14) * k, kind: c.need.puzzle };
    });

  const seen = new Set();
  const start = Date.now();
  let frame = 0;
  let wrongTried = false;
  while (Date.now() - start < seconds * 1000) {
    const summary = await page.$('.summary');
    if (summary) break;
    const body = await page.$('.puzzle-panel .body:not(.hidden)');
    if (body) {
      const kind = await page.$eval('.puzzle-panel', (n) => [...n.classList].find((c) => c.startsWith('puzzle-') && c !== 'puzzle-panel'));
      if (!seen.has(kind)) {
        seen.add(kind);
        await shot(`03-${kind}`);
      }
      if (!wrongTried) {
        wrongTried = true;
        const wrong = await page.$('.puzzle-panel button:not([data-answer])');
        if (wrong) await wrong.click();
        await page.waitForTimeout(150);
        await shot('04-wrong-answer');
      }
      await page.waitForTimeout(500);
      const right = await page.$('.puzzle-panel [data-answer]');
      if (right) await right.click();
      await page.waitForTimeout(300);
    } else if (!(await page.$('.puzzle-panel'))) {
      const target = await tapCustomer();
      if (target) await page.touchscreen.tap(target.x, target.y);
    }
    await page.waitForTimeout(250);
    if (frame++ % 4 === 0) await shot(`floor-${String(frame).padStart(4, '0')}`);
  }
  await page.waitForTimeout(500);
  await shot('99-end');
  const state = await page.evaluate(() => {
    const s = window.game.scene.getScene('shift');
    return { phase: s.phase, money: s.money, served: s.served, lost: s.lost, customers: s.customers.length, jobs: s.jobs.length };
  });
  console.log(JSON.stringify(state));
  console.log(errors.length ? errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
