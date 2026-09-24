// The Last Laundromat — bootstrap, main loop, scene switching and title menu.
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Assets } from './engine/assets.js';
import { Sound } from './engine/audio.js';
import { tweens } from './engine/tween.js';
import { el, sleep, DEBUG, escapeHtml, money } from './engine/util.js';
import { G, setState, newState, dateLabel } from './game/state.js';
import { Save } from './game/save.js';
import { Settings } from './game/settings.js';
import * as L from './game/laundry.js';
import { Story } from './game/story.js';
import { DayFlow } from './game/day.js';
import { Activities } from './game/activities.js';
import { CALLS } from './data/calls.js';
import { ROUTINES } from './data/characters.js';
import { comfortOf } from './data/decor.js';
import { UI } from './ui/ui.js';
import { Hud } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { Dialogue } from './ui/dialogue.js';
import { LaundromatScene } from './scenes/laundromat.js';
import { HomeScene } from './scenes/home.js';
import { StreetScene } from './scenes/street.js';
import { TitleScene } from './scenes/title.js';

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
  };
}

class App {
  constructor() {
    this.canvas = document.getElementById('view');
    this.r = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.uiBlock = 0;
    this.scene = null;
    this.laundry = L;
    this.routines = ROUTINES;
    this.calls = {};
    this.last = performance.now();
    this.switching = false;
    L.setComfortFn(() => comfortOf(G.placed) / 60);
  }

  async boot() {
    const fill = document.querySelector('.boot-fill');
    const msg = document.querySelector('.boot-msg');
    const prog = p => { fill.style.width = Math.round(p * 100) + '%'; };
    Settings.load();
    this.r.quality = Settings.get('quality');
    this.r.resize();
    await Assets.fonts();
    await Assets.init(p => prog(p * 0.7));
    msg.textContent = 'Filling the detergent…';
    await Sound.loadAll(p => prog(0.7 + p * 0.22));
    msg.textContent = 'Turning on the lights…';
    await Promise.all(['linden', 'linden_lights', 'skyline', 'skyline_lights'].map(n => Assets.bg(n)));
    prog(1);
    this.hud = new Hud(this);
    this.menus = new Menus(this);
    this.story = new Story(this);
    this.day = new DayFlow(this);
    this.activities = new Activities(this);
    for (const [k, fn] of Object.entries(CALLS)) this.calls[k] = (...a) => fn(this, ...a);
    this.scenes = { laundromat: new LaundromatScene(this), home: new HomeScene(this), street: new StreetScene(this), title: new TitleScene(this) };

    this.input.on('tap', (x, y) => { Sound.unlock(); if (!this.paused() && this.scene && !this.switching) this.scene.onTap(x, y); });
    this.input.on('drag', dx => { if (!this.paused() && this.scene && this.scene.pan && this.scene.name !== 'title') this.scene.pan(dx); });
    window.addEventListener('resize', () => this.r.resize());
    document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.onPause(); else this.onResume(); });
    window.__onPause = () => this.onPause();
    window.__onResume = () => this.onResume();
    window.__onBack = () => this.onBack();
    window.__onInsets = (l, t, r, b) => this.setInsets(l, t, r, b);
    if (window.AndroidBridge && window.AndroidBridge.getSafeInsets) {
      const [l, t, r, b] = window.AndroidBridge.getSafeInsets().split(',').map(Number);
      this.setInsets(l, t, r, b);
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.onBack(); });

    await this.setScene('title');
    requestAnimationFrame(t => this.loop(t));
    document.getElementById('boot').classList.add('gone');
    setTimeout(() => document.getElementById('boot').remove(), 800);
    this.showTitleMenu();
    if (DEBUG) this.exposeDebug();
  }

  setInsets(l, t, r, b) {
    const s = document.documentElement.style;
    s.setProperty('--safe-l', (l || 0) + 'px'); s.setProperty('--safe-r', (r || 0) + 'px');
    s.setProperty('--safe-t', (t || 0) + 'px'); s.setProperty('--safe-b', (b || 0) + 'px');
  }

  loop(t) {
    const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000)) * (this.timeScale || 1);
    this.last = t;
    try {
      tweens.update(dt);
      Sound.update(dt);
      if (this.scene) { this.scene.update(dt); this.scene.draw(); }
      if (G && this.scene && this.scene.name !== 'title') G.playSeconds = (G.playSeconds || 0) + dt;
    } catch (e) { console.error(e); }
    requestAnimationFrame(tt => this.loop(tt));
  }

  paused() {
    return this.uiBlock > 0 || UI.hasModal() || Dialogue.isOpen() || !!document.querySelector('.mg, .epilogue, .credits, .daycard');
  }

  async blocking(fn) {
    this.uiBlock++;
    try { return await fn(); } finally { this.uiBlock--; }
  }

  async setScene(name, opts = {}) {
    if (this.scene) this.scene.exit();
    this.scene = this.scenes[name];
    this.r.cam.zoom = 1; this.r.cam.y = 0; this.r.cam.shake = 0;
    await this.scene.enter(opts);
  }

  // Scene change with a fade (unless the caller already faded).
  async go(name, opts = {}) {
    this.switching = true;
    const ctx = document.querySelector('.ctx'); if (ctx) ctx.remove();
    if (!opts.noFade) await UI.fadeOut(350);
    try { await this.setScene(name, opts); }
    finally { this.switching = false; }
    if (!opts.noFade) await UI.fadeIn(350);
  }

  // ------------------------------------------------------------------ title & game start
  showTitleMenu() {
    const old = document.querySelector('.title-screen'); if (old) old.remove();
    const t = el('div', 'title-screen');
    t.innerHTML = `<div class="logo"><div class="the">THE LAST</div><div class="name">Laundromat</div><div class="tag">a cosy story about keeping the lights on</div></div>`;
    const menu = el('div', 'menu');
    const peek = Save.peek();
    let hasContinue = false;
    if (peek && peek.ending === 'sold') {
      if (Save.hasCheckpoint()) { menu.appendChild(UI.button('Rewind to the last morning', () => this.rewind(), 'primary')); hasContinue = true; }
    } else if (peek) {
      menu.appendChild(UI.button(peek.ending ? 'Continue · Free play' : `Continue · Day ${peek.day}`, () => this.continueGame(), 'primary'));
      hasContinue = true;
    }
    menu.appendChild(UI.button('New game', () => this.newGameFlow(!!peek), hasContinue ? '' : 'primary'));
    menu.appendChild(UI.button('Settings', () => this.menus.openPause(), 'small'));
    menu.appendChild(UI.button('Credits', () => this.menus.credits(), 'small'));
    t.appendChild(menu);
    t.appendChild(el('div', 'corner-note', 'Tap anywhere to hear the rain'));
    document.getElementById('ui').appendChild(t);
    this.titleEl = t;
  }

  hideTitleMenu() { if (this.titleEl) { this.titleEl.remove(); this.titleEl = null; } }

  async toTitle() {
    UI.closeAll();
    Dialogue.close();
    this.uiBlock = 0;
    await UI.fadeOut(500);
    this.hud.setMode('hidden');
    this.hud.setGoal('');
    await this.setScene('title');
    await UI.fadeIn(600);
    this.showTitleMenu();
  }

  async newGameFlow(hasSave) {
    if (hasSave) {
      const ok = await UI.confirm('Start over?', 'This replaces your current save.', 'Start fresh', 'Cancel');
      if (!ok) return;
    }
    const name = await this.askName();
    if (!name) return;
    Save.wipe();
    setState(newState(name));
    this.hideTitleMenu();
    await this.prologue();
  }

  askName() {
    return new Promise(res => {
      const box = el('div', 'notice frame-notice');
      const inner = el('div', 'inner name-entry');
      inner.innerHTML = '<h2>Rosa\'s granddaughter</h2><p style="text-align:center">What\'s your name?</p>';
      const inp = el('input'); inp.maxLength = 12; inp.value = 'Nora'; inp.autocomplete = 'off';
      const w = el('div'); w.style.textAlign = 'center'; w.appendChild(inp); inner.appendChild(w);
      const act = el('div', 'actions');
      let m;
      act.appendChild(UI.button('Back', () => { res(null); m.close(true); }));
      act.appendChild(UI.button('Begin', () => { const v = inp.value.trim().replace(/[<>{}*]/g, '') || 'Nora'; res(v); m.close(true); }, 'primary'));
      inner.appendChild(act); box.appendChild(inner);
      m = UI.modal(box, { close: false });
      setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) { /* noop */ } }, 300);
    });
  }

  async prologue() {
    Sound.music('title', 1.5);
    await this.story.play('prologue');
    await UI.fadeOut(900);
    await this.day.morning({ silentCard: false });
    await UI.fadeIn(800);
  }

  // After selling, go back to the morning of the final decision.
  async rewind() {
    if (!Save.restoreCheckpoint()) { UI.toast('Nothing to rewind to.', null, 'bad'); return; }
    await this.continueGame();
  }

  async continueGame() {
    if (!Save.load()) { UI.toast('That save could not be read.', null, 'bad'); return; }
    this.hideTitleMenu();
    L.ensureMachineFields();
    await UI.fadeOut(500);
    if (G.phase === 'shift' && G.simSave) {
      Object.assign(L.Sim, G.simSave, { events: [] });
      G.location = 'laundromat';
      await this.setScene('laundromat', { from: 'backdoor' });
      this.hud.setMode('shift');
    } else if (G.phase === 'morning' || G.phase === 'shift') {
      G.phase = 'morning';
      await this.day.morning({ silentCard: true });
    } else {
      const loc = G.location || 'home';
      if (loc === 'home') await this.setScene('home', { from: 'door' });
      else if (loc === 'laundromat') await this.setScene('laundromat', { from: 'front' });
      else await this.setScene('street', { loc });
    }
    this.hud.setGoal(G.goal);
    this.hud.refresh();
    await UI.fadeIn(600);
    UI.toast(`Welcome back, ${G.name}. ${dateLabel()} · ${money(G.money)}`, 'icon_home');
  }

  saveMidShift() {
    G.simSave = { plan: L.Sim.plan, nextWalkIn: L.Sim.nextWalkIn, puddles: L.Sim.puddles, litter: L.Sim.litter, selfQueue: L.Sim.selfQueue, seq: L.Sim.seq };
    Save.save();
  }

  // ------------------------------------------------------------------ platform hooks
  onPause() {
    if (G && this.scene && this.scene.name !== 'title' && G.ending !== 'sold') {
      if (G.phase === 'shift') this.saveMidShift(); else Save.save();
    }
    Sound.pauseAll();
  }
  onResume() { Sound.resumeAll(); this.r.resize(); }

  onBack() {
    const ctx = document.querySelector('.ctx'); if (ctx) { ctx.remove(); return 'handled'; }
    if (document.querySelector('.mg, .epilogue, .credits, .daycard')) return 'handled';
    if (Dialogue.isOpen()) { Dialogue.tap(); return 'handled'; }
    if (UI.back()) return 'handled';
    if (this.scene && this.scene.name === 'title') {
      UI.confirm('Leave the laundromat?', 'Your progress is saved.', 'Exit', 'Stay').then(y => {
        if (y && window.AndroidBridge) window.AndroidBridge.exitApp();
      });
      return 'handled';
    }
    this.menus.openPause();
    return 'handled';
  }

  exposeDebug() {
    window.__game = {
      app: this, get G() { return G; }, L, Save, Sound, UI,
      skipTime: m => { G.time += m; },
      speed: k => { this.timeScale = k; },
      setDay: d => { G.day = d; },
    };
  }
}

const app = new App();
window.__app = app;
app.boot().catch(e => {
  console.error(e);
  const m = document.querySelector('.boot-msg');
  if (m) m.textContent = 'Something went wrong: ' + escapeHtml(e.message || String(e));
});
