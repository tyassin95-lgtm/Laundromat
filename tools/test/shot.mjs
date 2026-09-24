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
  if (opts.clearStorage !== false) {
    // start from a clean slate (or from a saved localStorage snapshot), once per test
    await page.addInitScript((snap) => {
      try {
        if (!sessionStorage.getItem('kept')) {
          localStorage.clear();
          if (snap) for (const [k, v] of Object.entries(JSON.parse(snap))) localStorage.setItem(k, v);
          sessionStorage.setItem('kept', '1');
        }
      } catch (e) { }
    }, opts.storage ? fs.readFileSync(opts.storage, 'utf8') : null);
  }
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
// Advance through dialogue, notices and modals until nothing blocks the game.
// choice: index of the dialogue choice to pick (or a function (texts) => index).
export async function skipDialogue(page, choice = 0, max = 300, log = false, settle = 3) {
  let idle = 0;
  for (let i = 0; i < max; i++) {
    const st = await page.evaluate(() => {
      const modals = [...document.querySelectorAll('.modal')].filter(m => m.style.opacity !== '0');
      if (modals.length) {
        const m = modals[modals.length - 1];
        const btns = [...m.querySelectorAll('.btn')];
        return { k: 'modal', n: btns.length, labels: btns.map(b => b.innerText.trim()), txt: m.innerText.slice(0, 160).replace(/\s+/g, ' ') };
      }
      const d = document.querySelector('.dlg');
      if (d) {
        const ch = [...d.querySelectorAll('.choices .btn')].map(b => b.innerText);
        return ch.length ? { k: 'choice', ch } : { k: 'text', txt: (d.querySelector('.txt') || d).innerText.slice(0, 120) };
      }
      if (document.querySelector('.daycard, .mg, .epilogue')) return { k: 'wait' };
      if (document.querySelector('.fader.on')) return { k: 'wait' };
      return { k: 'none' };
    });
    if (log && st.k !== 'wait') console.log('  ', st.k, st.txt || st.ch || '');
    if (st.k === 'none') { if (++idle > settle) return i; await wait(settle > 1 ? 150 : 60); continue; }
    idle = 0;
    if (st.k === 'wait') { await wait(300); continue; }
    if (st.k === 'modal') {
      const m = page.locator('.modal').last();
      const prim = m.locator('.btn.primary');
      const want = typeof choice === 'function' && st.labels.length > 1 ? choice(st.labels) : -1;
      if (want >= 0) await m.locator('.btn').nth(want).click({ timeout: 3000 }).catch(() => {});
      else if (await prim.count()) await prim.first().click({ timeout: 3000 }).catch(() => {});
      else if (st.n) await m.locator('.btn').last().click({ timeout: 3000 }).catch(() => {});
      else await m.click({ position: { x: 5, y: 5 }, timeout: 3000 }).catch(() => {});
      await wait(250);
      continue;
    }
    if (st.k === 'choice') {
      let idx = typeof choice === 'function' ? choice(st.ch) : choice;
      if (idx < 0) idx = 0;
      await page.locator('.dlg .choices .btn').nth(Math.min(idx, st.ch.length - 1)).click({ timeout: 3000 }).catch(() => {});
      await wait(200); continue;
    }
    await page.locator('.dlg').click({ position: { x: 400, y: 100 }, timeout: 3000 }).catch(() => {});
    await wait(70);
  }
  return max;
}

export async function state(page) {
  return page.evaluate(() => {
    const g = window.__game.G;
    return { scene: window.__app.scene && window.__app.scene.name, day: g.day, phase: g.phase, time: g.time, money: g.money, goal: g.goal, loc: g.location };
  });
}
