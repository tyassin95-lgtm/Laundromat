// Headless play-bot: drives a laundromat shift through the scene's own actions
// (the same code paths taps use), plays the fold/repair mini-games with real pointer input,
// and advances any dialogue/notice that opens. Used by the dev playthrough scripts.
import { wait, skipDialogue } from './shot.mjs';

// Play the fold mini-game by swiping along each arrow.
export async function playFold(page) {
  for (let i = 0; i < 8; i++) {
    const a = await page.evaluate(() => {
      const ar = document.querySelector('.mg .arrow');
      if (!ar) return null;
      const r = ar.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: ar.textContent };
    });
    if (!a) return;
    const d = { '➜': [1, 0], '⬅': [-1, 0], '⬆': [0, -1], '⬇': [0, 1] }[a.t] || [1, 0];
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let k = 1; k <= 6; k++) await page.mouse.move(a.x + d[0] * 20 * k, a.y + d[1] * 20 * k);
    await page.mouse.up();
    await wait(150);
  }
}

// Play the repair mini-game: tap the glowing bolt, then tap when the needle is in the zone.
export async function playRepair(page) {
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => {
      const b = document.querySelector('.mg .bolt.target');
      const g = document.querySelector('.mg .gauge');
      if (!document.querySelector('.mg .board.repair')) return { k: 'gone' };
      if (g && !g.classList.contains('hidden')) {
        const z = g.querySelector('.zone'), n = g.querySelector('.needle');
        const pos = parseFloat(n.style.left), a = +z.dataset.a, bb = +z.dataset.b;
        const r = g.getBoundingClientRect();
        return { k: 'gauge', inZone: pos > a + 2 && pos < bb - 2, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      if (b) { const r = b.getBoundingClientRect(); return { k: 'bolt', x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      return { k: 'wait' };
    });
    if (st.k === 'gone') return;
    if (st.k === 'bolt') { await page.mouse.click(st.x, st.y); await wait(60); continue; }
    if (st.k === 'gauge' && st.inZone) { await page.mouse.click(st.x, st.y); await wait(60); continue; }
    await wait(15);
  }
}

// One decision of the shift bot. Returns a short string describing what it did.
export async function botStep(page) {
  const mg = await page.evaluate(() => {
    if (document.querySelector('.mg .board.repair')) return 'repair';
    if (document.querySelector('.mg .garment')) return 'fold';
    return null;
  });
  if (mg === 'fold') { await playFold(page); return 'fold'; }
  if (mg === 'repair') { await playRepair(page); return 'repair'; }
  const blocked = await page.evaluate(() => !!document.querySelector('.modal, .dlg, .daycard'));
  if (blocked) { await skipDialogue(page, 0, 60); return 'dialogue'; }
  return page.evaluate(() => {
    const app = window.__app, sc = app.scene, G = window.__game.G, L = window.__game.L;
    if (G.phase !== 'shift') return 'closed';
    if (!sc || sc.name !== 'laundromat' || !sc.shiftRunning) return 'busy';
    if (sc.busy || sc.mode || app.paused()) return 'busy';
    const carried = sc.carried();
    // 1. hand finished friend laundry back in person
    for (const v of sc.visitors.values()) {
      const o = v.order && L.order(v.order);
      if (v.state === 'here' && o && o.stage === 'ready') { sc.tapVisitor(v); return 'handover ' + v.id; }
    }
    // 2. repair broken machines when empty-handed
    const broken = G.machines.find(m => m.broken);
    if (broken && !carried.length) {
      if (broken.kind === 'washer') sc.tapWasherSlot(broken.slot); else sc.tapDryerUnit(Math.floor(broken.slot / 2), broken.slot % 2 ? 400 : 250);
      return 'repair ' + broken.id;
    }
    // 3. progress what we're holding
    if (carried.length) {
      const o = carried[0], step = L.nextStep(o);
      if (step === 'wash') {
        const m = L.washers().find(L.isFree);
        if (!m) return 'wait-washer';
        sc.tapWasherSlot(m.slot); return 'wash ' + o.id;
      }
      if (step === 'dry') {
        const d = L.dryers().find(L.isFree);
        if (!d) return 'wait-dryer';
        sc.tapDryerUnit(Math.floor(d.slot / 2), d.slot % 2 ? 400 : 250); return 'dry ' + o.id;
      }
      if (step === 'fold') { sc.tapFold(); return 'fold ' + o.id; }
      sc.tapShelf(); return 'shelf ' + o.id;
    }
    // 4. unload finished machines holding our orders
    const done = G.machines.find(m => m.state === 'done' && m.load && m.load !== 'self' && !m.broken);
    if (done) {
      if (done.kind === 'washer') sc.tapWasherSlot(done.slot); else sc.tapDryerUnit(Math.floor(done.slot / 2), done.slot % 2 ? 400 : 250);
      return 'unload ' + done.id;
    }
    // 5. take a new bag from the counter
    if (G.orders.some(o => o.stage === 'counter')) { sc.tapCounter(); return 'counter'; }
    // 6. chores
    const p = L.Sim.puddles[0];
    if (p) { sc.mopPuddle(p); return 'mop'; }
    const l = L.Sim.litter[0];
    if (l) { sc.pickLitter(l); return 'litter'; }
    return 'idle';
  });
}

// Run the bot until the shift ends (or maxSec real seconds pass).
export async function playShift(page, { maxSec = 400, log = false } = {}) {
  const t0 = Date.now();
  let last = '';
  while ((Date.now() - t0) / 1000 < maxSec) {
    const r = await botStep(page);
    if (log && r !== last && r !== 'busy' && r !== 'idle') console.log('  bot:', r);
    last = r;
    if (r === 'closed') {
      await skipDialogue(page, 0, 100);
      return r;
    }
    await wait(r === 'busy' || r === 'idle' || r.startsWith('wait') ? 250 : 400);
  }
  return 'timeout';
}
