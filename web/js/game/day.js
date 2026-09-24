// Day flow: morning at home -> shift in the laundromat -> free evening -> sleep.
import { G, freshToday, weekday, isSunday, weekOf, addMoney, STORY_DAYS, WEEKDAYS_LONG, heartsOf, FRIENDS, addStat } from './state.js';
import * as L from './laundry.js';
import { Save } from './save.js';
import { UI } from '../ui/ui.js';
import { Sound } from '../engine/audio.js';
import { makeRng, money, clockStr, el } from '../engine/util.js';
import { LOCATIONS } from '../data/locations.js';
import { writeDiary } from '../data/diary.js';
import { comfortOf } from '../data/decor.js';

export const STORY_WEATHER = { 1: 'rain', 2: 'cloudy', 3: 'clear', 7: 'clear', 11: 'rain', 13: 'cloudy', 16: 'cloudy', 17: 'storm', 18: 'rain', 20: 'clear', 26: 'rain', 27: 'clear', 28: 'clear' };
const CHAPTERS = { 1: ['Week One', 'Spin Cycle', 'Everything Rosa left behind is still running. Mostly.'], 8: ['Week Two', 'Rinse', 'The offers start arriving in nicer envelopes.'],
  15: ['Week Three', 'Tumble', 'Storm season on Linden Street.'], 22: ['Week Four', 'Fold', 'Everything comes down to what you keep.'] };

export class DayFlow {
  constructor(app) { this.app = app; this.lateWarned = false; }

  weatherFor(day) {
    if (STORY_WEATHER[day]) return STORY_WEATHER[day];
    const r = makeRng(G.rngSeed + day * 101)();
    return r < 0.34 ? 'clear' : r < 0.62 ? 'cloudy' : 'rain';
  }

  // ------------------------------------------------------------------ morning
  async morning(opts = {}) {
    const app = this.app;
    G.phase = 'morning';
    G.location = 'home';
    G.time = isSunday(G.day) ? 9 * 60 : 7 * 60;
    G.weather = this.weatherFor(G.day);
    G.today = freshToday();
    this.lateWarned = false;
    if (!opts.silentCard) {
      const ch = CHAPTERS[G.day];
      if (ch && G.day <= STORY_DAYS) { await UI.dayCard(ch[0], ch[1], ch[2], 2600); }
      else await UI.dayCard(WEEKDAYS_LONG[weekday(G.day)], `Day ${G.day}`, weatherLine(G.weather), 1500);
    }
    await app.go('home', { from: 'bed' });
    Save.save();
    await app.story.trigger('home_morning');
    if (!app.scene || app.scene.name === 'title') return;   // the final choice ended the story
    await this.checkMail();
    app.hud.setGoal(G.goal || (isSunday(G.day) ? 'Sunday — the shop is closed. Rest, explore, see friends.' : 'Head downstairs and open the shop.'));
  }

  async checkMail() {
    // story letters are delivered by events ("mail" trigger); bills notices on Mondays after a week
    await this.app.story.trigger('mail');
  }

  // ------------------------------------------------------------------ shift
  async startShift() {
    const app = this.app;
    if (isSunday(G.day) && !G.flags.open_sundays) { UI.toast('The shop is closed on Sundays.', 'icon_calendar'); return; }
    G.phase = 'shift';
    G.time = Math.max(G.time, L.OPEN_AT);
    G.location = 'laundromat';
    L.planDay();
    await app.go('laundromat', { from: 'backdoor' });
    app.hud.setMode('shift');
    Sound.play('shop_bell', { vol: 0.4 });
    app.hud.setGoal(G.goal && G.goal.includes('downstairs') ? '' : G.goal);
    await app.story.trigger('shift_start');
    Save.save();
  }

  async askCloseEarly() {
    if (G.phase !== 'shift') return;
    const early = G.time < 17 * 60;
    const busy = G.orders.some(o => o.stage !== 'done');
    const txt = early
      ? `It's only ${clockStr(G.time)}. Closing early disappoints walk-ins${busy ? ', and you\'ll stay late to finish the open orders' : ''}.`
      : (busy ? 'You\'ll stay a little late to finish the open orders.' : 'Flip the sign and call it a day?');
    const yes = await UI.confirm('Close up for the day?', txt, 'Close up', 'Keep going');
    if (!yes) return;
    if (early) addStat('reputation', -Math.min(4, (17 * 60 - G.time) / 60));
    this.endShift();
  }

  async endShift() {
    const app = this.app;
    if (G.phase !== 'shift') return;
    const sc = app.scene;
    if (sc && sc.name === 'laundromat') { sc.shiftRunning = false; sc.jobs = []; sc.setCarry && sc.setCarry([]); }
    const res = L.closeShop();
    G.phase = 'evening';
    G.time = Math.max(G.time, L.CLOSE_AT);
    if (res.leftovers) { G.time += 25 * res.leftovers; addStat('energy', -5 * res.leftovers); }
    Sound.play('jingle_day', { vol: 0.6 });
    app.hud.setMode('free');
    if (sc && sc.updateSound) sc.updateSound();
    await this.shiftSummary(res);
    await app.story.trigger('shift_end');
    if (!G.flags.map_unlocked && G.day >= 1) { G.flags.map_unlocked = true; app.hud.setMode('free'); }
    app.hud.setGoal(G.goal || 'Evening. Head out the front door to explore — or go upstairs to rest.');
    this.sceneMusic();
    Save.save();
  }

  async shiftSummary(res) {
    const t = G.today;
    const rows = [
      ['Drop-off orders', t.orders],
      ['Late', t.late],
      ['Self-service', money(t.selfServe)],
      ['Tips', money(t.tips)],
      ['Spent today', '-' + money(t.expenses)],
    ];
    let html = `<h2>Closing time</h2>`;
    for (const [k, v] of rows) html += `<div class="summary-row"><span>${k}</span><span>${v}</span></div>`;
    html += `<div class="summary-row total"><span>Takings today</span><span class="pos">${money(t.income)}</span></div>`;
    if (res.leftovers) html += `<p style="text-align:center">You stayed late to finish ${res.leftovers} order${res.leftovers > 1 ? 's' : ''}.</p>`;
    html += `<p style="text-align:center;color:var(--ink-soft)">Cash on hand: <b>${money(G.money)}</b></p>`;
    await UI.notice(html, { ok: 'Lock up' });
  }

  // ------------------------------------------------------------------ evening / travel
  sceneMusic() {
    const app = this.app;
    if (app.story.musicOverride) return;
    const sc = app.scene;
    if (!sc) return;
    const night = G.time >= 20 * 60 || G.time < 6 * 60;
    let key = null;
    if (sc.name === 'laundromat') key = G.record && G.placed.lounge_table === 'record_player' ? G.record : (G.phase === 'shift' ? (G.day % 2 ? 'laundromat_day' : 'laundromat_day2') : 'laundromat_night');
    else if (sc.name === 'home') key = G.record && G.placed.h_table === 'record_player' ? G.record : (G.phase === 'morning' ? 'morning' : night ? 'home_night' : 'home');
    else if (sc.loc) key = LOCATIONS[sc.loc].music || 'street';
    if (key) Sound.music(key, 2.5);
  }

  async leaveLaundromat(where) {
    if (where === 'home') {
      if (G.phase === 'evening' || G.phase === 'night') { G.location = 'home'; await this.app.go('home', { from: 'door' }); await this.app.story.trigger('home_night'); }
      else await this.app.go('home', { from: 'door' });
    } else {
      await this.travel('street', { from: 'shop', noTime: true });
    }
  }

  openMap() {
    if (!G.flags.map_unlocked) { UI.toast('Finish your first day before exploring.', 'icon_map'); return; }
    if (G.phase === 'shift') { UI.toast('The shop is open — explore after closing.', 'icon_map'); return; }
    G.flags.map_opened = true;
    this.app.menus.openMap();
  }

  async travel(loc, opts = {}) {
    const app = this.app;
    const L0 = LOCATIONS[loc];
    if (!L0) return;
    if (!opts.noTime && G.location !== loc) G.time += L0.travel || 40;
    G.location = loc;
    if (L0.scene === 'home') { await app.go('home', { from: 'door' }); if (G.phase !== 'morning') await app.story.trigger('home_night'); return; }
    if (L0.scene === 'laundromat') { await app.go('laundromat', { from: 'front' }); await app.story.trigger('location', { loc }); return; }
    await app.go('street', { loc, from: opts.from });
    await app.story.trigger('location', { loc });
    this.checkLate();
  }

  checkLate() {
    if (G.phase === 'morning' || G.phase === 'shift') return;
    if (G.time >= 22 * 60 && !this.lateWarned) { this.lateWarned = true; UI.toast('It\'s getting late. Tomorrow comes early.', 'icon_clock'); }
    if (G.time >= 23 * 60 + 30 && this.app.scene && this.app.scene.name !== 'home') {
      UI.toast('You can barely keep your eyes open. Time to head home.', 'icon_home');
      setTimeout(() => this.travel('home'), 900);
    }
  }

  // Spend time on an activity (evening or morning). Returns false if not enough time.
  spend(min) {
    G.time += min;
    this.app.hud.refresh();
    this.checkLate();
    return true;
  }

  // ------------------------------------------------------------------ sleep
  async sleep() {
    const app = this.app;
    if (G.phase === 'morning') {
      const yes = await UI.confirm('Go back to bed?', 'You just got up. Skip today and sleep until tomorrow?', 'Sleep', 'Stay up');
      if (!yes) return;
    }
    const endingBefore = G.ending;
    await app.story.trigger('sleep');
    if (G.ending !== endingBefore) return;          // a story ending played instead
    G.phase = 'night';
    Sound.music(null, 1.5);
    await UI.fadeOut(900);
    // energy: late nights cost you
    const late = Math.max(0, G.time - 23 * 60) / 60;
    G.energy = Math.max(55, 100 - late * 15);
    G.stats.days++;
    writeDiary();
    const endOfWeek = isSunday(G.day);
    if (endOfWeek) await this.payBills();
    // advance
    G.day += 1;
    for (const m of G.machines) m.lint = m.kind === 'dryer' ? Math.min(8, m.lint || 0) : 0;
    G.goal = '';
    if (G.day > STORY_DAYS && !G.ending) { G.day = STORY_DAYS; }
    await this.morning();
    await UI.fadeIn(600);
  }

  billsFor(day) {
    const wk = weekOf(day);
    const cycles = G.vars.weekCycles || 0;
    const items = [
      ['Rosa\'s loan payment', 150],
      ['Water & gas', 55 + Math.round(cycles * 0.7)],
      ['Electric', 35 + Math.round(cycles * 0.4)],
      ['Insurance', 25],
    ];
    if (G.flags.tax_reassessed) items.push(['Property tax (reassessed)', 75]);
    if (G.flags.poster_deal) items.push(['Crestline window ad', -120]);
    if (wk >= 5) items[0][1] = 150;
    return items;
  }

  async payBills() {
    const items = this.billsFor(G.day);
    let total = 0;
    let html = '<h2>Week\'s bills</h2>';
    for (const [k, v] of items) { total += v; html += `<div class="summary-row"><span>${k}</span><span class="${v < 0 ? 'pos' : ''}">${v < 0 ? '+' : ''}${money(Math.abs(v))}</span></div>`; }
    html += `<div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>`;
    addMoney(-total, `Weekly bills (week ${weekOf(G.day)})`);
    G.billsPaid.push({ week: weekOf(G.day), total });
    G.vars.weekCycles = 0;
    if (G.money < 0) {
      G.debt = -G.money;
      G.flags.in_debt = true;
      html += `<p style="text-align:center" class="neg">You're ${money(-G.money)} in the red. The bank has started calling.</p>`;
    } else {
      delete G.flags.in_debt;
      html += `<p style="text-align:center">Paid in full. ${money(G.money)} left in the till.</p>`;
    }
    Sound.play(G.money < 0 ? 'jingle_sad' : 'jingle_week', { vol: 0.6 });
    await UI.fadeIn(300);
    await UI.notice(html, { ok: 'Onward' });
    await UI.fadeOut(300);
  }

  // ------------------------------------------------------------------ cut to a scene mid-script
  async cutTo(name, arg) {
    await UI.fadeOut(400);
    G.location = name;
    if (name === 'laundromat') await this.app.go('laundromat', { from: arg || 'backdoor', noFade: true });
    else if (name === 'home') await this.app.go('home', { from: arg || 'door', noFade: true });
    else await this.app.go('street', { loc: name, from: arg, noFade: true });
    await UI.fadeIn(400);
  }

  // ------------------------------------------------------------------ ending
  async ending(id) {
    G.ending = id;
    if (!G.endingsSeen.includes(id)) G.endingsSeen.push(id);
    G.flags.ending_done = true;
    Save.save();
    await this.app.menus.playEnding(id);
    // after the credits, the shop keeps going (or not)
    if (id === 'sold') { await this.app.toTitle(); return; }
    G.flags.epilogue = true;
    G.goal = 'Free play — keep Rosa\'s running as long as you like.';
    Save.save();
    await this.app.toTitle();
  }
}

function weatherLine(w) {
  return { clear: 'Clear skies over Linden Street.', cloudy: 'A soft grey sky.', rain: 'Rain on the windows.', storm: 'Storm warnings all day.' }[w] || '';
}

export { comfortOf };
