// Dev harness: load the game in headless Chromium at phone size, run steps, take screenshots.
// Usage: node tools/test/shot.mjs <script.json|inline steps>  (see tools/test/README in comments)
import { createRequire } from 'module';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const OUT = process.env.SHOT_DIR || '/tmp/shots';
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.GAME_URL || 'http://127.0.0.1:8765/index.html?debug';

export async function launch(opts = {}) {
  const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({
    viewport: { width: opts.w || 915, height: opts.h || 412 }, deviceScaleFactor: opts.dpr || 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error' || m.type() === 'warning') console.log(t); });
  page.on('pageerror', e => { logs.push('[pageerror] ' + e.message); console.log('[pageerror]', e.message, e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : ''); });
  if (opts.clearStorage !== false) await page.addInitScript(() => { try { if (!sessionStorage.getItem('kept')) { localStorage.clear(); sessionStorage.setItem('kept', '1'); } } catch (e) { } });
  await page.goto(URL);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
  return { browser, page, logs };
}

export async function shot(page, name) {
  const p = path.join(OUT, name + '.png');
  await page.screenshot({ path: p });
  console.log('shot', p);
  return p;
}

export const wait = ms => new Promise(r => setTimeout(r, ms));

// Tap in CSS pixels
export async function tap(page, x, y) { await page.mouse.click(x, y); await wait(120); }
// Tap a world coordinate (virtual px) in the current scene
export async function tapWorld(page, x, y) {
  const p = await page.evaluate(([x, y]) => window.__app.r.toScreen(x, y), [x, y]);
  await tap(page, p.x, p.y);
}
export async function clickText(page, text, opts = {}) {
  const loc = page.locator(opts.sel || 'button', { hasText: text }).first();
  await loc.click({ timeout: opts.timeout || 5000 });
  await wait(250);
}
// Advance any open dialogue until it closes (answering choices with the given index).
export async function skipDialogue(page, choice = 0, max = 200) {
  for (let i = 0; i < max; i++) {
    const state = await page.evaluate(() => {
      const d = document.querySelector('.dlg');
      if (!d) return 'none';
      if (d.querySelector('.choices .btn')) return 'choice';
      return 'text';
    });
    if (state === 'none') return i;
    if (state === 'choice') { await page.locator('.dlg .choices .btn').nth(choice).click(); await wait(200); continue; }
    await page.locator('.dlg').click({ position: { x: 400, y: 200 } });
    await wait(60);
  }
  return max;
}
