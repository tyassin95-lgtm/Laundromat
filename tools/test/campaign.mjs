// Full-campaign playthrough: plays every day of the story with the shift bot, spends evenings
// visiting places (story events first), talks to and gifts friends, sleeps, and reports the ending.
// Usage: SHOT_DIR=/tmp/shots node tools/test/campaign.mjs [--sell] [--days N] [--speed K]
import { launch, shot, wait, clickText, skipDialogue, state } from './shot.mjs';
import { playShift, setChooser } from './bot.mjs';

const args = process.argv.slice(2);
const SELL = args.includes('--sell');
const MAXD = +(args[args.indexOf('--days') + 1] || 0) || 28;
const SPEED = +(args[args.indexOf('--speed') + 1] || 0) || 3;

const PREFER = [SELL ? /^Sell\./ : /^Keep it/, /Don't\. They don't/, /Keep the doors open/, /Meet here/, /^Of course/, /We could fight/,
  /^Stay\. We need/, /cover the paint/, /neighbours/, /Get out of my/, /Go down and see/, /Come on in/];
const chooser = opts => { for (const re of PREFER) { const i = opts.findIndex(o => re.test(o)); if (i >= 0) return i; } return 0; };
const skip = (page, max = 300) => skipDialogue(page, chooser, max);
setChooser(chooser);

async function until(page, fn, ms = 30000, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await skip(page, 40); await wait(250); }
  return false;
}

async function giftAll(page) {
  return page.evaluate(async () => {
    const { CHARACTERS } = await import('./js/data/characters.js');
    const { ITEMS } = await import('./js/data/items.js');
    const app = window.__app, G = window.__game.G, sc = app.scene;
    const here = sc.npcs ? [...sc.npcs.keys()] : sc.visitors ? [...sc.visitors.keys()] : [];
    for (const who of here) {
      if (G.gifted[who] === G.day) continue;
      const c = CHARACTERS[who];
      let best = null, bs = 0;
      for (const k of Object.keys(G.inv)) {
        if (!(G.inv[k] > 0) || !ITEMS[k] || !ITEMS[k].gift) continue;
        const tags = ITEMS[k].tags || [k];
        const s = tags.some(t => c.loves.includes(t)) ? 3 : tags.some(t => c.likes.includes(t)) ? 2 : 0;
        if (s > bs) { bs = s; best = k; }
      }
      if (!best) continue;
      const orig = app.menus.pickGift; app.menus.pickGift = async () => best;
      app.story.giftTo(who).finally(() => { app.menus.pickGift = orig; });
      return who + ':' + best;
    }
    return null;
  });
}

async function talkAll(page) {
  for (let k = 0; k < 4; k++) {
    const who = await page.evaluate(() => {
      const app = window.__app, G = window.__game.G, sc = app.scene;
      const here = sc.npcs ? [...sc.npcs.keys()] : sc.visitors ? [...sc.visitors.values()].filter(v => v.state === 'here').map(v => v.id) : [];
      const w = here.find(id => G.talked[id] !== G.day);
      if (!w) return null;
      app.story.talk(w, { place: sc.loc || sc.name }).then(() => app.day.spend(10));
      return w;
    });
    if (!who) break;
    await wait(300); await skip(page);
    const g = await giftAll(page); if (g) { await wait(300); await skip(page); }
  }
  const g = await giftAll(page); if (g) { await wait(300); await skip(page); }
}

async function travel(page, loc) {
  await page.evaluate(l => { window.__app.day.travel(l); }, loc);
  await until(page, l => (window.__game.G.location === l) && !window.__app.switching, 20000);
  await wait(600); await skip(page);
}

async function evening(page, day) {
  const rot = ['street', 'park', 'garden', 'riverside'];
  const want = await page.evaluate(() => ['street', 'park', 'garden', 'riverside', 'laundromat'].filter(l => window.__app.story.hasLocationEvent(l)));
  const plan = [...new Set([...want, rot[day % 4], rot[(day + 2) % 4]])].slice(0, 4);
  for (const loc of plan) {
    const t = await page.evaluate(() => window.__game.G.time);
    if (t > 21 * 60 + 30) break;
    await travel(page, loc);
    await talkAll(page);
    if (loc !== 'laundromat') await page.evaluate(() => { const s = window.__app.scene; if (s.loc === 'riverside' || s.loc === 'park') window.__app.activities.run('photo', { loc: s.loc, title: 'Evening' }).catch(() => {}); });
    await wait(400); await skip(page);
  }
  await travel(page, 'home');
}

async function morningHobby(page, day) {
  await page.evaluate(d => {
    const a = window.__app.activities, G = window.__game.G;
    if (G.flags.learned_knit && d % 2 === 0) return a.run('knit', { loc: 'home' });
    return a.run('sketch', { loc: 'home' });
  }, day);
  await wait(3500 / SPEED + 800); await skip(page);
}

const { browser, page, logs } = await launch();
page.setDefaultTimeout(8000);
await wait(1200);
await clickText(page, 'New game');
await wait(500);
await clickText(page, 'Begin');
await wait(1200);
await skip(page, 400);
await page.evaluate(k => window.__game.speed(k), SPEED);
const report = [];
const V = process.env.VERBOSE;
const log = (...a) => { if (V) console.log(new Date().toISOString().slice(11, 19), ...a); };
for (let d = 1; d <= MAXD; d++) {
  log('morning', d, JSON.stringify(await state(page)));
  const st0 = await state(page);
  if (st0.day !== d) { console.log('!! expected day', d, 'got', st0.day); }
  await skip(page);
  const sunday = (d - 1) % 7 === 6;
  if (d > 1) await morningHobby(page, d);
  log('hobby done');
  if (!sunday) {
    await page.evaluate(() => { window.__app.day.startShift(); });
    log('shift start');
    await until(page, () => window.__game.G.phase === 'shift' && window.__app.scene.name === 'laundromat', 15000);
    await skip(page);
    const r = await playShift(page, { maxSec: 600, log: !!V });
    log('shift end', r);
    if (r !== 'closed') console.log('!! shift', r);
    await skip(page);
  } else {
    await page.evaluate(() => { window.__game.G.phase = 'evening'; });
  }
  const ended = await page.evaluate(() => !!window.__game.G.flags.ending_done);
  if (ended) { report.push({ day: d, ending: await page.evaluate(() => window.__game.G.ending) }); break; }
  log('evening');
  await evening(page, d);
  const snap = await page.evaluate(() => { const G = window.__game.G; return { day: G.day, money: Math.round(G.money), rep: Math.round(G.reputation), comm: Math.round(G.community), pet: G.petition, hearts: Object.fromEntries(Object.entries(G.hearts).map(([k, v]) => [k, (v / 100).toFixed(1)])), time: Math.round(G.time) }; });
  console.log('day', d, JSON.stringify(snap));
  report.push(snap);
  if ([1, 7, 11, 17, 21, 26].includes(d)) await shot(page, `camp_d${d}_evening`);
  await page.evaluate(() => { window.__app.day.sleep(); });
  await until(page, dd => window.__game.G.day === dd + 1 || window.__game.G.flags.ending_done || !window.__app.scene || window.__app.scene.name === 'title', 60000, d);
  await skip(page);
  const st = await state(page);
  if (st.scene === 'title') { console.log('back at title after day', d); break; }
}
const fin = await page.evaluate(() => { const G = window.__game.G; return { ending: G.ending, endingsSeen: G.endingsSeen, flags: Object.keys(G.flags).filter(f => /hearing|ending|speaks|commission|maya_left|sold|keep/.test(f)), vars: { hearingScore: G.vars.hearingScore, speakers: G.vars.speakers } }; });
console.log('FINAL', JSON.stringify(fin));
await shot(page, 'camp_final');
const errs = logs.filter(l => /error|pageerror|missing node|unknown command|bad expression/i.test(l));
console.log('errors/warnings:', errs.length); for (const e of errs.slice(0, 30)) console.log('  ', e);
await browser.close();
