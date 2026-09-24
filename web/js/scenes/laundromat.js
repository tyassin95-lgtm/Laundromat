// Rosa's laundromat: the core management scene.
import { Scene, nightness } from './scene.js';
import { Actor } from '../engine/actor.js';
import { Assets } from '../engine/assets.js';
import { Sound } from '../engine/audio.js';
import { GlassRain } from '../engine/particles.js';
import { tweens } from '../engine/tween.js';
import { clamp, rand, clockStr, money } from '../engine/util.js';
import { G, addStat, addMoney, heartsOf, giveItem, takeItem, weekday } from '../game/state.js';
import * as L from '../game/laundry.js';
import { SHOP_SLOTS, DECOR, SUPPLIES } from '../data/decor.js';
import { SERVICES, FRIEND_ORDERS } from '../data/regulars.js';
import { CHARACTERS, ROUTINES } from '../data/characters.js';
import { UI } from '../ui/ui.js';
import { foldGame, repairGame } from '../ui/minigames.js';
import { vibrate, Settings } from '../game/settings.js';

const WASHER_X = i => 600 + i * 150;
const WASHER_BASE = 508, WASHER_H = 212;
const DRYER_X = u => 1340 + u * 140;
const DRYER_H = 300;
const COUNTER = { x: 220, base: 578, h: 150 };
const SHELF = { x: 180, base: 488, h: 236 };
const FOLD = { x: 452, base: 604, h: 240 };
const BENCH = { x: 1682, base: 646, h: 225 };
const SUPPLY = { x: 452, y: 264, w: 132 };
const CLOCK = { x: 1270, y: 152, s: 62 };
const PK = 262 / 490;     // player pose scale

const GEOM = {
  machine_washer_idle: [{ cx: 0.635, cy: 0.548, r: 0.2 }],
  machine_washer_running: [{ cx: 0.635, cy: 0.548, r: 0.2 }],
  machine_washer_open: [{ cx: 0.574, cy: 0.55, r: 0.18 }],
  machine_washer_orange: [{ cx: 0.63, cy: 0.486, r: 0.19 }],
  machine_washer_blue: [{ cx: 0.636, cy: 0.485, r: 0.19 }],
  machine_stack_unit: [{ cx: 0.614, cy: 0.247, r: 0.175 }, { cx: 0.614, cy: 0.685, r: 0.175 }],
};

export const GLASS = [
  { x: 567, y: 103, w: 286, h: 104 },
  { x: 1569, y: 89, w: 222, h: 342 },
  { x: 1820, y: 158, w: 78, h: 236 },
  { x: 1822, y: 84, w: 74, h: 44 },
];

const LAUNDRY_COLORS = ['#7fa0b0', '#c9b88f', '#b86a4a', '#6f8f6a', '#d9cfbf', '#5f6f8f', '#c48fa0', '#e0c070', '#8a6a9a'];

export class LaundromatScene extends Scene {
  constructor(app) {
    super(app, { worldW: 1920, interior: true, walkBand: [540, 692] });
    this.name = 'laundromat';
    this.player = new Actor({ id: 'me', player: true, h: 262, x: 60, y: 560, speed: 330 });
    this.player.hitW = 90;
    this.carry = [];               // order ids in hand
    this.jobs = [];
    this.busy = false;
    this.mode = null;              // null | 'fold' | 'sit'
    this.visitors = new Map();     // id -> {actor, leaveAt, state}
    this.glass = new GlassRain(GLASS);
    this.ripples = [];
    this.machineAnim = {};         // machine id -> {open: seconds}
    this.clockTicked = -1;
    this.shiftRunning = false;
    this.warnedClosing = false;
  }

  // ------------------------------------------------------------------ lifecycle
  async enter(opts = {}) {
    this.bg = await Assets.bg('laundromat');
    this.outside = await Assets.bg('outside');
    this.outsideLights = await Assets.bg('outside_lights');
    L.ensureMachineFields();
    this.buildEntities();
    this.actors = [this.player];
    this.visitors.clear();
    this.carry = [];
    this.mode = null;
    this.player.visible = true;
    this.player.carrying = false;
    this.player.stop();
    const from = opts.from || 'backdoor';
    if (from === 'backdoor') { this.player.x = 58; this.player.y = 552; this.player.facing = 1; }
    else if (from === 'front') { this.player.x = 1858; this.player.y = 590; this.player.facing = -1; }
    else { this.player.x = opts.x || 900; this.player.y = opts.y || 620; }
    this.follow(this.player, 0, true);
    this.shiftRunning = G.phase === 'shift';
    this.placeNightVisitors();
    this.updateSound();
    this.app.hud.setMode(this.shiftRunning ? 'shift' : 'free');
    this.app.hud.refresh();
  }

  exit() {
    this.jobs = []; this.busy = false;
    for (const v of this.visitors.values()) this.actors = this.actors.filter(a => a !== v.actor);
  }

  updateSound() {
    const night = nightness(G.time);
    const running = G.machines.filter(m => m.state === 'running' && !m.broken);
    const washing = running.filter(m => m.kind === 'washer').length;
    const drying = running.filter(m => m.kind === 'dryer').length;
    const rain = G.weather === 'rain' ? 0.55 : G.weather === 'storm' ? 0.9 : 0;
    const layers = { amb_laundromat: 0.35 + 0.1 * night };
    if (washing) layers.amb_washer_slosh = Math.min(0.55, 0.22 + washing * 0.1);
    if (drying) layers.amb_dryer = Math.min(0.6, 0.25 + drying * 0.1);
    if (rain) layers.amb_rain_in = rain;
    if (G.record && G.placed.lounge_table === 'record_player') layers.amb_vinyl = 0.25;
    Sound.setAmbience(layers, 1.2);
    this.soundSig = `${washing}|${drying}|${rain}|${G.record}`;
  }

  // ------------------------------------------------------------------ entities
  buildEntities() {
    this.ents = [];
    const E = e => { this.ents.push(e); return e; };
    // washers (5 slots)
    for (let i = 0; i < L.WASHER_SLOTS; i++) {
      const x = WASHER_X(i);
      E({
        id: 'wslot' + i, z: WASHER_BASE,
        m: () => L.washers().find(m => m.slot === i),
        draw: (r) => this.drawWasherSlot(r, i, x),
        hit: () => ({ x: x - 75, y: WASHER_BASE - WASHER_H, w: 150, h: WASHER_H }),
        tap: () => this.tapWasherSlot(i),
      });
    }
    // dryer units (2)
    for (let u = 0; u < L.DRYER_UNITS; u++) {
      const x = DRYER_X(u);
      E({ id: 'dunit' + u, z: WASHER_BASE + 1, draw: (r) => this.drawDryerUnit(r, u, x),
        hit: () => ({ x: x - 68, y: WASHER_BASE - DRYER_H, w: 136, h: DRYER_H }),
        tap: (wx, wy) => this.tapDryerUnit(u, wy) });
    }
    // pickup shelf (behind the counter)
    E({ id: 'shelf', z: SHELF.base, draw: (r) => this.drawShelf(r),
      hit: () => ({ x: SHELF.x - 70, y: SHELF.base - SHELF.h, w: 140, h: SHELF.h }), tap: () => this.tapShelf() });
    // counter with bags waiting
    E({ id: 'counter', z: COUNTER.base, draw: (r) => this.drawCounter(r),
      hit: () => ({ x: COUNTER.x - 85, y: COUNTER.base - COUNTER.h - 40, w: 170, h: COUNTER.h + 40 }), tap: () => this.tapCounter() });
    // folding table
    E({ id: 'fold', z: FOLD.base, draw: (r) => this.drawFold(r),
      hit: () => ({ x: FOLD.x - 75, y: FOLD.base - 130, w: 150, h: 130 }), tap: () => this.tapFold() });
    // bench
    E({ id: 'bench', z: BENCH.base, draw: (r) => this.drawBench(r),
      hit: () => ({ x: BENCH.x - 88, y: BENCH.base - 95, w: 176, h: 95 }), tap: () => this.tapBench() });
    // supply shelf on the wall
    E({ id: 'supply', z: 60, draw: (r) => this.drawSupply(r),
      hit: () => ({ x: SUPPLY.x - SUPPLY.w / 2, y: SUPPLY.y - 110, w: SUPPLY.w, h: 112 }), tap: () => this.tapSupply() });
    // wall clock + price board text
    E({ id: 'clock', z: 55, draw: (r) => this.drawClock(r), hit: () => ({ x: CLOCK.x - 32, y: CLOCK.y - 32, w: 64, h: 64 }),
      tap: () => UI.toast(`${clockStr(G.time)} — ${this.shiftRunning ? 'open until 6:00 PM' : 'closed'}`, 'icon_clock') });
    E({ id: 'prices', z: 54, draw: (r) => this.drawPriceBoard(r), hit: () => ({ x: 222, y: 120, w: 180, h: 112 }),
      tap: () => this.app.menus.openCatalog('prices') });
    // doors
    E({ id: 'backdoor', z: 50, hit: () => ({ x: 8, y: 196, w: 92, h: 276 }), tap: () => this.tapBackDoor() });
    E({ id: 'frontdoor', z: 50, hit: () => ({ x: 1808, y: 150, w: 100, h: 322 }), tap: () => this.tapFrontDoor() });
    // decor slots
    for (const [slot, pos] of Object.entries(SHOP_SLOTS)) {
      const e = E({
        id: 'slot:' + slot, slot,
        z: () => this.slotZ(slot),
        hidden: false,
        draw: (r) => this.drawSlot(r, slot, pos),
        hit: () => this.slotHit(slot, pos),
        tap: () => this.tapSlot(slot),
      });
      e.tapZ = slot === 'rug' ? 1 : undefined;
    }
    // puddles & litter (dynamic, flat on floor)
    E({ id: 'floorstuff', z: 480, draw: (r) => this.drawFloorStuff(r) });
    E({ id: 'floorhits', z: 481, hit: () => ({ x: 0, y: 0, w: 0, h: 0 }), tap: null });
  }

  slotZ(slot) {
    if (slot === 'rug') return 470;
    const p = SHOP_SLOTS[slot];
    if (['hang1', 'hang2', 'lights', 'wall_a', 'wall_b'].includes(slot)) return 52;
    if (slot === 'sill' || slot === 'sill2' || slot === 'counter_top') return slot === 'counter_top' ? COUNTER.base + 1 : 470;
    return p.y;
  }

  slotHit(slot, pos) {
    const id = G.placed[slot];
    if (!id) return null;
    const d = DECOR[id];
    const im = Assets.img(d.sprite);
    if (!im) return null;
    const k = d.h ? d.h / im.naturalHeight : d.w / im.naturalWidth;
    const w = im.naturalWidth * k, h = im.naturalHeight * k;
    const ay = d.ay ?? 1;
    let y = pos.y - h * ay;
    if (slot === 'lounge_table') y -= 96;
    return { x: pos.x - w / 2, y, w, h };
  }

  // ------------------------------------------------------------------ input
  onTap(px, py) {
    const w = this.r.toWorld(px, py);
    if (this.mode === 'sit') { this.standUp(); return; }
    if (this.mode === 'fold') return;
    this.ripples.push({ x: w.x, y: w.y, t: 0 });
    // visitors first
    for (const v of this.visitors.values()) {
      const b = v.actor.bounds();
      if (w.x > b.x - 10 && w.x < b.x + b.w + 10 && w.y > b.y && w.y < b.y + b.h + 10) { this.tapVisitor(v); return; }
    }
    // floor items (puddles, litter)
    for (const p of L.Sim.puddles) if (Math.abs(w.x - p.x) < 60 * p.size && Math.abs(w.y - p.y) < 26) { this.mopPuddle(p); return; }
    for (const l of L.Sim.litter) if (Math.abs(w.x - l.x) < 34 && Math.abs(w.y - l.y) < 30) { this.pickLitter(l); return; }
    const e = this.hitTest(w.x, w.y);
    if (e) { e.tap(w.x, w.y); return; }
    if (w.y > 470) this.walkFloor(w.x, w.y);
  }

  walkFloor(x, y) {
    this.jobs = [];
    const tx = clamp(x, 40, this.worldW - 40), ty = clamp(y, this.walkBand[0], this.walkBand[1]);
    this.player.walkTo(tx, ty).then(() => { });
    this.stepSounds = true;
  }

  queue(job) {
    if (this.jobs.length >= 3) this.jobs.shift();
    this.jobs.push(job);
    if (!this.busy) this.runJobs();
  }

  async runJobs() {
    this.busy = true;
    while (this.jobs.length) {
      const j = this.jobs.shift();
      if (j.x !== undefined) {
        const ok = await this.player.walkTo(j.x, j.y);
        if (ok === false) continue;
      }
      if (j.face) this.player.facing = j.face;
      try { await j.run(); } catch (e) { console.error(e); }
    }
    this.busy = false;
  }

  canCarryMore() { return this.carry.length < (G.upgrades.includes('cart') ? 2 : 1); }
  carried() { return this.carry.map(id => L.order(id)).filter(Boolean); }
  firstNeeding(step) { return this.carried().find(o => L.nextStep(o) === step); }

  setCarry(ids) {
    this.carry = ids;
    this.player.carrying = ids.length > 0;
    this.app.hud.refreshTickets();
  }

  // ------------------------------------------------------------------ counter
  tapCounter() {
    const waiting = G.orders.filter(o => o.stage === 'counter');
    if (this.carry.length && (!waiting.length || !this.canCarryMore())) {
      // hands full: set the load down on the counter to come back to later
      const held = this.carried();
      const o = held[held.length - 1];
      if (!o) return;
      if (L.nextStep(o) === 'shelf') return this.tapShelf();
      this.queue({ x: COUNTER.x + 10, y: 548, face: 1, run: async () => {
        if (!this.carry.includes(o.id)) return;
        this.player.setPose('load', 0.4);
        o.stage = 'counter';
        this.setCarry(this.carry.filter(id => id !== o.id));
        Sound.play('cloth2', { vol: 0.8 });
        UI.toast(`${o.name}'s laundry is back on the counter for now.`, 'icon_basket');
      } });
      return;
    }
    if (!waiting.length) { UI.toast('No bags waiting at the counter.', 'icon_basket'); return; }
    if (!this.canCarryMore()) { UI.toast('Your hands are full.', 'icon_basket', 'bad'); return; }
    this.queue({ x: COUNTER.x + 10, y: 548, face: 1, run: async () => {
      const o = G.orders.find(q => q.stage === 'counter');
      if (!o || !this.canCarryMore()) return;
      o.stage = 'carried';
      this.setCarry([...this.carry, o.id]);
      Sound.play('cloth1', { vol: 0.9 });
      this.player.squash = 0.06;
      addStat('energy', -1);
      if (o.note && !o.noteRead) { o.noteRead = true; await this.app.menus.readNote(o); }
      this.app.story.trigger('picked', { o });
    } });
  }

  // ------------------------------------------------------------------ washers
  tapWasherSlot(i) {
    const m = L.washers().find(q => q.slot === i);
    if (!m) { this.app.menus.openCatalog('machines'); return; }
    const x = WASHER_X(i);
    this.tapMachine(m, { x: x - 44, y: 522, face: 1, pose: 'load' });
  }

  tapDryerUnit(u, wy) {
    const drums = L.dryers().filter(d => Math.floor(d.slot / 2) === u);
    if (!drums.length) { this.app.menus.openCatalog('machines'); return; }
    const x = DRYER_X(u);
    // pick the drum the player most likely meant
    const mid = WASHER_BASE - DRYER_H * 0.5;
    let drum = drums.find(d => (d.slot % 2 === 0) === (wy < mid)) || drums[0];
    // if carrying something that needs drying and the tapped drum is busy, use the other one
    const needs = this.firstNeeding('dry');
    if (needs && !L.isFree(drum)) drum = drums.find(L.isFree) || drum;
    const top = drum.slot % 2 === 0;
    this.tapMachine(drum, top ? { x: x - 14, y: 522, face: 1, pose: 'reach' } : { x: x - 50, y: 522, face: 1, pose: 'load' });
  }

  tapMachine(m, spot) {
    const kind = m.kind;
    if (m.broken) { this.queue(Object.assign({}, spot, { pose: null, run: () => this.doRepair(m) })); return; }
    if (m.state === 'running') {
      const left = Math.max(1, Math.ceil(m.dur - m.t));
      UI.toast(`${kind === 'washer' ? 'Washing' : 'Drying'} — ${left} min left${m.load === 'self' ? ' (self-service)' : ''}`, kind === 'washer' ? 'icon_washer' : 'icon_dryer');
      return;
    }
    if (m.state === 'done') {
      if (m.load === 'self') { UI.toast('A customer\'s load. They\'ll be right back for it.', 'icon_basket'); return; }
      // hands full? swap: take the finished load out and put the one you're holding in
      const swapIn = this.canCarryMore() ? null : this.firstNeeding(kind === 'washer' ? 'wash' : 'dry');
      if (!this.canCarryMore() && !swapIn) { UI.toast('Your hands are full. (Tap the counter to set a load down.)', 'icon_basket', 'bad'); return; }
      if (swapIn && kind === 'washer' && (G.inv.detergent || 0) < L.modelOf(m).soap) { this.askDetergent(); return; }
      this.queue(Object.assign({}, spot, { run: async () => {
        if (m.state !== 'done') return;
        const swapping = !!swapIn && !this.canCarryMore() && this.carry.includes(swapIn.id);
        if (!swapping && !this.canCarryMore()) return;
        await this.machineAction(m, spot.pose, swapping ? 0.9 : 0.55);
        const id = L.unload(m);
        const o = L.order(id);
        let carry = this.carry;
        if (swapping && L.startCycle(m, swapIn.id).ok) {
          this.loadedInto(m, swapIn);
          carry = carry.filter(x => x !== swapIn.id);
        }
        if (o) { o.stage = 'carried'; o.machine = null; carry = [...carry, o.id]; }
        this.setCarry(carry);
        Sound.play(rand.pick(['cloth2', 'cloth3']), { vol: 0.9 });
        addStat('energy', -1);
        this.updateSound();
        if (swapping) await this.app.story.trigger('loaded', { o: swapIn, m });
        this.app.story.trigger('unloaded', { o, m });
      } }));
      return;
    }
    // free machine
    const o = this.firstNeeding(kind === 'washer' ? 'wash' : 'dry');
    if (!o) {
      if (kind === 'dryer' && m.lint >= 5) { this.queue(Object.assign({}, spot, { run: () => this.doLint(m) })); return; }
      if (m.cond < 45) { this.offerTuneUp(m, spot); return; }
      const holding = this.carried()[0];
      if (holding) UI.toast(`${holding.name}'s laundry needs ${L.nextStep(holding) === 'fold' ? 'folding' : L.nextStep(holding) === 'shelf' ? 'to go on the pickup shelf' : L.nextStep(holding) === 'dry' ? 'a dryer' : 'a washer'}.`, 'icon_basket');
      else UI.toast(`${L.modelOf(m).name} · condition ${Math.round(m.cond)}%`, kind === 'washer' ? 'icon_washer' : 'icon_dryer');
      return;
    }
    if (kind === 'washer' && (G.inv.detergent || 0) < L.modelOf(m).soap) { this.askDetergent(); return; }
    this.queue(Object.assign({}, spot, { run: async () => {
      if (!L.isFree(m) || !this.carry.includes(o.id)) return;
      await this.machineAction(m, spot.pose, 0.7);
      const res = L.startCycle(m, o.id);
      if (!res.ok) { UI.toast(res.reason === 'soap' ? 'Out of detergent!' : 'Machine unavailable.', null, 'bad'); return; }
      this.loadedInto(m, o);
      this.setCarry(this.carry.filter(id => id !== o.id));
      this.updateSound();
      this.app.story.trigger('loaded', { o, m });
    } }));
  }

  // Bookkeeping after an order goes into a machine.
  loadedInto(m, o) {
    const kind = m.kind;
    if (kind === 'washer' && o.softener && (G.inv.softener || 0) >= 1) { G.inv.softener -= 1; o.softenerOk = true; }
    if (kind === 'washer' && o.softener) o.softenerWanted = true;
    if (kind === 'washer' && o.gentle && m.model === 'eco') o.gentleOk = true;
    o.machine = m.id;
    o.stage = kind === 'washer' ? 'washing' : 'drying';
    Sound.play('machine_door', { vol: 0.8 });
    Sound.play('machine_start', { vol: 0.5, delay: 0.25 });
    addStat('energy', -1);
    vibrate(12);
  }

  askDetergent() {
    Sound.play('error', { vol: 0.5 });
    UI.confirm('Out of detergent', 'The supply shelf is empty. Order a jug now?', `Buy (${money(SUPPLIES.detergent.price)})`, 'Later').then(yes => {
      if (yes) this.app.menus.buySupply('detergent');
    });
  }

  async machineAction(m, pose, secs) {
    this.machineAnim[m.id] = { open: secs + 0.2 };
    Sound.play('latch', { vol: 0.5 });
    this.player.setPose(pose || 'load', secs);
    await tweens.wait(secs);
  }

  offerTuneUp(m, spot) {
    this.app.menus.contextMenu(this.r.toScreen(spot.x + 60, WASHER_BASE - 230), `${L.modelOf(m).name} · ${Math.round(m.cond)}%`, [
      { label: 'Tune up (20 min)', icon: 'icon_wrench', run: () => this.queue(Object.assign({}, spot, { run: () => this.doTuneUp(m) })) },
    ]);
  }

  async doTuneUp(m) {
    this.player.setPose('load', 1.2);
    Sound.play('ratchet', { vol: 0.7 });
    await tweens.wait(1.2);
    m.cond = clamp(m.cond + 22 + G.skills.repair * 4, 0, 100);
    G.time += 20;
    addStat('energy', -4);
    UI.toast(`Tuned up · condition ${Math.round(m.cond)}%`, 'icon_wrench');
  }

  async doRepair(m) {
    if ((G.inv.parts || 0) < 1) {
      const yes = await UI.confirm('No spare parts', 'This needs a new belt or seal. Order a parts kit?', `Buy (${money(SUPPLIES.parts.price)})`, 'Later');
      if (!yes) return;
      if (!this.app.menus.buySupply('parts')) return;
    }
    this.player.setPose('load', 30);
    const q = await this.app.blocking(() => repairGame({ bolts: m.cond < 10 ? 4 : 3 }));
    this.player.setPose('idle');
    takeItem('parts', 1);
    L.repair(m, q);
    G.time += 25;
    addStat('energy', -6);
    this.particles.emit('sparkle', this.machineTop(m).x, this.machineTop(m).y + 40, 10);
    UI.toast(`Repaired! ${L.modelOf(m).name} is running again.`, 'icon_wrench');
    if (q > 0.8 && G.skills.repair < 5) { G.vars.repairXp = (G.vars.repairXp || 0) + 1; }
    this.app.story.trigger('repaired', { m, q });
  }

  async doLint(m) {
    this.player.setPose('load', 0.8);
    await tweens.wait(0.8);
    L.cleanLint(m);
    const p = this.machineTop(m);
    this.particles.emit('lint', p.x, p.y + 120, 14);
    Sound.play('cloth4', { vol: 0.7 });
    addStat('cleanliness', 2);
    UI.toast('Lint trap cleaned. Dryer runs faster.', 'icon_dryer');
  }

  // ------------------------------------------------------------------ folding & shelf
  tapFold() {
    const o = this.firstNeeding('fold');
    if (!o) {
      const any = this.carried()[0];
      if (any) UI.toast(`${any.name}'s laundry isn't ready to fold yet.`, 'icon_towels');
      else UI.toast('The folding table. Bring dry laundry here.', 'icon_towels');
      return;
    }
    this.queue({ x: FOLD.x, y: FOLD.base + 12, face: 1, run: async () => {
      if (!this.carry.includes(o.id)) return;
      this.mode = 'fold';
      this.player.visible = false;
      this.foldAnim = 0;
      o.stage = 'folding';
      const q = await this.app.blocking(() => foldGame({ color: o.color }));
      o.fold = q;
      if (q > 0.85) G.stats.perfectFolds = (G.stats.perfectFolds || 0) + 1;
      if (q > 0.75 && G.skills.fold < 5) { G.vars.foldXp = (G.vars.foldXp || 0) + 1; if (G.vars.foldXp % 12 === 0) { G.skills.fold++; UI.toast('Folding skill up!', 'icon_star'); } }
      addStat('energy', -2);
      await tweens.wait(0.3);
      this.mode = null;
      this.player.visible = true;
      o.stage = 'carried';
      // straight to the pickup shelf
      await this.player.walkTo(SHELF.x + 26, 548);
      await this.placeOnShelf(o);
    } });
  }

  tapShelf() {
    const o = this.firstNeeding('shelf');
    if (!o) {
      const ready = G.shelf.length;
      UI.toast(ready ? `${ready} order${ready > 1 ? 's' : ''} waiting for pickup.` : 'The pickup shelf is empty.', 'icon_towels');
      return;
    }
    this.queue({ x: SHELF.x + 26, y: 548, face: -1, run: () => this.placeOnShelf(o) });
  }

  async placeOnShelf(o) {
    if (!this.carry.includes(o.id)) return;
    this.player.facing = -1;
    this.player.setPose('reach', 0.6);
    Sound.play('cloth3', { vol: 0.8 });
    await tweens.wait(0.6);
    this.setCarry(this.carry.filter(id => id !== o.id));
    L.finishOrder(o);
    this.particles.emit('sparkle', SHELF.x, SHELF.base - 150, 6);
    this.app.story.trigger('ready', { o });
  }

  // ------------------------------------------------------------------ bench & rest
  tapBench() {
    if (this.carry.length) { UI.toast('Put the laundry somewhere first.', 'icon_basket'); return; }
    this.queue({ x: BENCH.x, y: BENCH.base + 10, run: async () => {
      this.mode = 'sit';
      this.player.visible = false;
      this.sitT = 0;
      Sound.play('thud', { vol: 0.4 });
      UI.toast('Taking a breather… (tap to get up)', 'icon_heart');
    } });
  }

  standUp() {
    this.mode = null;
    this.player.visible = true;
    this.player.y = BENCH.base + 14;
    this.player.setPose('stretch', 0.9);
  }

  // ------------------------------------------------------------------ supplies, doors, slots
  tapSupply() { this.app.menus.openCatalog('supplies'); }

  tapBackDoor() {
    if (this.shiftRunning) {
      UI.toast('Upstairs has to wait — the shop is open.', 'icon_home');
      return;
    }
    this.queue({ x: 62, y: 548, run: () => this.app.day.leaveLaundromat('home') });
  }

  tapFrontDoor() {
    if (this.shiftRunning) {
      if (G.time >= 16 * 60) { this.app.day.askCloseEarly(); return; }
      UI.toast('The shop is open until 6. Customers come in through here.', 'icon_clock');
      return;
    }
    this.queue({ x: 1856, y: 580, run: () => this.app.day.leaveLaundromat('street') });
  }

  tapSlot(slot) {
    const id = G.placed[slot];
    if (!id) return;
    const d = DECOR[id];
    if (d.fn === 'music') { this.app.menus.recordPicker(); return; }
    if (d.fn === 'tea') { this.queue({ x: SHOP_SLOTS[slot].x - 60, y: 650, face: 1, run: () => this.makeTea() }); return; }
    if (d.fn === 'community' || d.fn === 'notes') { this.app.menus.communityBoard(); return; }
    UI.toast(`${d.name} — ${d.blurb}`, null);
  }

  async makeTea() {
    if (!takeItem('tea', 1)) { UI.toast('Out of tea. (Order a tin from the supplies catalog.)', 'item_teacup', 'bad'); return; }
    this.player.setPose('load', 1.0);
    Sound.play('kettle', { vol: 0.5 });
    await tweens.wait(1.0);
    Sound.play('cup', { vol: 0.8 });
    addStat('energy', 14);
    G.time += 10;
    this.particles.emit('steam', SHOP_SLOTS.lounge_table.x, SHOP_SLOTS.lounge_table.y - 150, 8);
    UI.toast('A cup of tea. +energy', 'item_teacup');
  }

  // ------------------------------------------------------------------ floor chores
  mopPuddle(p) {
    this.queue({ x: p.x - 40, y: p.y + 6, face: 1, run: async () => {
      if (!L.Sim.puddles.includes(p)) return;
      this.player.setPose('mop', 1.3);
      Sound.play('mop', { vol: 0.9 });
      for (let i = 0; i < 3; i++) setTimeout(() => this.particles.emit('splash', p.x, p.y, 4), i * 300);
      await tweens.wait(1.3);
      L.clearPuddle(p.id);
      addStat('energy', -2);
      this.particles.emit('sparkle', p.x, p.y - 10, 5);
    } });
  }

  pickLitter(l) {
    this.queue({ x: l.x - 30, y: l.y + 4, face: 1, run: async () => {
      if (!L.Sim.litter.includes(l)) return;
      this.player.setPose('load', 0.5);
      await tweens.wait(0.5);
      L.Sim.litter = L.Sim.litter.filter(q => q !== l);
      if (l.kind === 'sock') this.app.menus.foundSock('shop');
      else { addStat('cleanliness', 3); UI.toast('Lint bunny caught.', 'icon_dryer'); }
      Sound.play('pop', { vol: 0.6 });
    } });
  }

  // ------------------------------------------------------------------ visitors
  spawnVisitor(id, opts = {}) {
    if (this.visitors.has(id)) return this.visitors.get(id);
    const c = CHARACTERS[id];
    const a = new Actor({ id, sprite: c.sprite, h: c.h, x: 1858, y: 560, speed: 190 });
    a.facing = -1;
    this.actors.push(a);
    const v = { id, actor: a, state: 'enter', leaveAt: G.time + (opts.stay || 60), order: null };
    this.visitors.set(id, v);
    Sound.play('shop_bell', { vol: 0.7 });
    this.doorOpen = 0.8;
    const dest = opts.to || (opts.order ? { x: COUNTER.x + 128, y: 620 } : this.freeLoungeSpot());
    a.walkTo(dest.x, dest.y).then(async () => {
      v.state = 'here';
      a.facing = dest.x < 900 ? -1 : (dest.face || -1);
      if (opts.order) this.dropOffFriendOrder(v);
      await this.app.story.trigger('arrive', { who: id, v });
      if (v.order && v.state === 'here') {
        const spot = this.freeLoungeSpot();
        await a.walkTo(spot.x, spot.y); a.facing = spot.face || -1;
      }
    });
    return v;
  }

  // After close, Maya does her laundry here on her nights off (she's already in when you arrive).
  placeNightVisitors() {
    delete G.vars.maya_here;
    if (this.shiftRunning || G.time < 20 * 60 || !G.flags.met_maya || !this.app.story.canVisit('maya')) return;
    const forced = G.vars.at_maya;
    const nights = ROUTINES.maya.evening.laundromat_night || [];
    if (forced ? forced !== 'laundromat' : !nights.includes(weekday(G.day))) return;
    const c = CHARACTERS.maya;
    const a = new Actor({ id: 'maya', sprite: c.sprite, h: c.h, x: 820, y: 604, speed: 190 });
    a.facing = -1;
    this.actors.push(a);
    this.visitors.set('maya', { id: 'maya', actor: a, state: 'here', leaveAt: 26 * 60, order: null, pinned: true });
    if (G.talked.maya !== G.day) a.say('…', 99999);
    G.vars.maya_here = true;
  }

  freeLoungeSpot() {
    const spots = [{ x: 1600, y: 668, face: -1 }, { x: 1470, y: 652, face: -1 }, { x: 1760, y: 690, face: -1 }, { x: 1290, y: 668, face: -1 }];
    for (const s of spots) {
      let taken = false;
      for (const v of this.visitors.values()) if (Math.abs(v.actor.x - s.x) < 60 && Math.abs(v.actor.y - s.y) < 30) taken = true;
      if (!taken) return s;
    }
    return spots[0];
  }

  dropOffFriendOrder(v) {
    const spec = FRIEND_ORDERS[v.id];
    if (!spec) return;
    const o = L.createOrder(Object.assign({ who: v.id, name: CHARACTERS[v.id].name, personal: true }, spec, { dueIn: 150 }));
    o.personal = true;
    v.order = o.id;
    v.actor.say('basket', 3);
  }

  async tapVisitor(v) {
    const a = v.actor;
    if (v.state !== 'here') return;
    // hand over finished laundry in person
    const o = v.order && L.order(v.order);
    const talkX = a.x + (a.x > 1000 ? -110 : 110);
    await this.player.walkTo(clamp(talkX, 60, 1860), clamp(a.y + 6, 540, 692));
    this.player.facing = a.x > this.player.x ? 1 : -1;
    a.facing = -this.player.facing;
    if (o && o.stage === 'ready') {
      await this.handOver(v, o);
      return;
    }
    this.app.menus.contextMenu(this.r.toScreen(a.x, a.y - a.dispH - 20), CHARACTERS[v.id].name, [
      { label: 'Talk', icon: 'icon_speech', run: () => { if (a.emote === '…') a.emote = null; return this.app.story.talk(v.id, { place: 'laundromat', v }); } },
      { label: 'Give gift', icon: 'icon_heart', run: () => this.app.story.giftTo(v.id) },
    ]);
  }

  async handOver(v, o) {
    this.player.setPose('wave', 0.6);
    const r = L.pickup(o);
    const pos = this.r.toScreen(v.actor.x, v.actor.y - v.actor.dispH);
    UI.moneyPop(r.pay + r.tip, pos.x, pos.y);
    Sound.play('register', { vol: 0.7 });
    Sound.play('coins', { vol: 0.8 });
    v.order = null;
    await this.app.story.trigger('handover', { who: v.id, q: r.q, onTime: r.onTime });
    this.app.story.addHearts(v.id, r.onTime ? 12 + Math.round(r.q * 10) : 4, true);
    this.app.hud.refresh();
  }

  visitorLeave(v) {
    if (v.state === 'leaving') return;
    v.state = 'leaving';
    // laundry they dropped off stays: it goes on the pickup shelf like anyone else's
    const o = v.order && L.order(v.order);
    if (o && o.stage !== 'done') { o.personal = false; v.order = null; this.app.hud.refreshTickets(); }
    v.actor.walkTo(1858, 570).then(() => {
      Sound.play('shop_bell', { vol: 0.5 });
      this.doorOpen = 0.8;
      tweens.to(v.actor, { alpha: 0 }, 0.3).then(() => {
        this.actors = this.actors.filter(x => x !== v.actor);
        this.visitors.delete(v.id);
      });
    });
  }

  scheduleVisitors() {
    if (!this.shiftRunning) return;
    const wd = weekday(G.day);
    for (const id of ['walt', 'maya', 'june', 'remy']) {
      if (this.visitors.has(id) || G.vars['visited_' + id] === G.day) continue;
      if (!this.app.story.canVisit(id)) continue;
      const rt = ROUTINES[id];
      for (const s of rt.shift) {
        if (!s.days.includes(wd)) continue;
        if (G.time < s.at || G.time > s.at + 60) continue;
        if (s.chance && ((G.rngSeed + G.day * 13 + id.length) % 100) / 100 > s.chance) continue;
        G.vars['visited_' + id] = G.day;
        const laundryDay = s === rt.shift[0];
        this.spawnVisitor(id, { order: laundryDay && FRIEND_ORDERS[id], stay: s.stay });
        break;
      }
    }
    for (const v of this.visitors.values()) {
      if (v.state !== 'here' || v.pinned) continue;
      const o = v.order && L.order(v.order);
      if (o && o.stage !== 'done') { if (o.stage === 'ready') v.actor.say('basket', 1); continue; }
      if (G.time >= v.leaveAt) this.visitorLeave(v);
    }
  }

  // ------------------------------------------------------------------ update
  update(dt) {
    super.update(dt);
    const paused = this.app.paused();
    if (!paused) {
      for (const a of this.actors) a.update(dt);
      if (this.shiftRunning) {
        const pace = { relaxed: 1.4, normal: 2, brisk: 3 }[Settings.get('pace') || 'normal'] || 2;
        const dm = dt * pace;
        G.time += dm;
        L.tick(dm);
        this.processEvents();
        if (Math.floor(G.time) !== this.clockTicked) {
          this.clockTicked = Math.floor(G.time);
          this.scheduleVisitors();
          this.app.story.onMinute();
          if (!this.warnedClosing && G.time >= 17 * 60 + 30) { this.warnedClosing = true; UI.toast('Closing in half an hour.', 'icon_clock'); }
          if (G.time >= L.CLOSE_AT && !this.busy && this.mode === null) { this.shiftRunning = false; this.app.day.endShift(); }
          this.app.hud.refresh();
        }
        if (this.soundSigT === undefined || (this.soundSigT -= dt) <= 0) { this.soundSigT = 2; this.updateSound(); }
      } else {
        for (const v of this.visitors.values()) if (v.state === 'here' && !v.pinned && G.time >= v.leaveAt) this.visitorLeave(v);
      }
      if (this.mode === 'sit') {
        this.sitT += dt;
        if (this.sitT > 1.5) { this.sitT = 0; addStat('energy', 1.2); G.time += 1; }
      }
    }
    this.particles.update(dt);
    this.glass.intensity = G.weather === 'rain' ? 0.8 : G.weather === 'storm' ? 1 : 0;
    this.glass.update(dt);
    this.follow(this.player, dt);
    this.ripples = this.ripples.filter(r => (r.t += dt) < 0.45);
    if (this.doorOpen > 0) this.doorOpen -= dt;
    for (const k in this.machineAnim) { this.machineAnim[k].open -= dt; if (this.machineAnim[k].open <= 0) delete this.machineAnim[k]; }
    // footsteps
    if (this.player.moving) {
      this.stepT = (this.stepT || 0) + dt;
      if (this.stepT > 0.3) { this.stepT = 0; Sound.play(rand.pick(['step_tile1', 'step_tile2', 'step_tile3']), { vol: 0.5, jitter: 0.08 }); }
    }
    // ambient particles
    if (Math.random() < dt * 1.5 && nightness(G.time) < 0.6) this.particles.emit('dust', 1560 + Math.random() * 240, 250 + Math.random() * 300, 1);
    for (const m of G.machines) {
      if (m.broken && Math.random() < dt * 0.8) { const p = this.machineTop(m); this.particles.emit('smoke', p.x + 20, p.y + 20, 1); }
      if (m.state === 'running' && m.kind === 'washer' && Math.random() < dt * 0.35) { const p = this.machineTop(m); this.particles.emit('bubble', p.x + 10, p.y + 110, 1); }
    }
    if (G.record && G.placed.lounge_table === 'record_player' && Math.random() < dt * 0.6) this.particles.emit('note', SHOP_SLOTS.lounge_table.x, SHOP_SLOTS.lounge_table.y - 170, 1);
  }

  processEvents() {
    const ev = L.Sim.events.splice(0);
    for (const e of ev) {
      switch (e.type) {
        case 'orderArrived':
          if (!e.o.personal) { Sound.play('bell_small', { vol: 0.8 }); this.doorOpen = 0.6; UI.toast(`${e.o.name} dropped off laundry.`, 'icon_basket'); }
          e.o.color = rand.pick(LAUNDRY_COLORS);
          this.app.hud.refreshTickets();
          break;
        case 'cycleDone': {
          if (e.m.load !== 'self') { Sound.play('machine_done', { vol: 0.6 }); vibrate(20); }
          this.app.hud.refreshTickets();
          this.updateSound();
          break;
        }
        case 'broke': {
          Sound.play('machine_error', { vol: 0.8 }); Sound.play('clank2', { vol: 0.7, delay: 0.2 });
          const p = this.machineTop(e.m); this.particles.emit('smoke', p.x, p.y + 30, 8);
          UI.toast(`${e.m.kind === 'washer' ? 'A washer' : 'A dryer'} broke down! Tap it to repair.`, 'icon_wrench', 'bad', 3500);
          this.updateSound();
          break;
        }
        case 'walkIn':
          Sound.play('shop_bell', { vol: 0.35 }); this.doorOpen = 0.7; this.walkInGhost = 1.2;
          Sound.play('coin', { vol: 0.5, delay: 0.8 });
          { const p = this.machineTop(e.m); setTimeout(() => this.particles.emit('coin', p.x, p.y, 1), 800); }
          this.updateSound();
          break;
        case 'walkInTurnedAway':
          if (!this.warnedFull || G.time - this.warnedFull > 90) { this.warnedFull = G.time; UI.toast('A walk-in left — no free washers.', 'icon_washer', 'bad'); }
          break;
        case 'pickedUp': {
          if (e.o.personal) break;
          Sound.play('shop_bell', { vol: 0.35 }); Sound.play('coins', { vol: 0.7, delay: 0.3 });
          const pos = this.r.toScreen(SHELF.x, SHELF.base - 200);
          UI.moneyPop(e.pay + e.tip, pos.x, pos.y);
          this.particles.emit('coin', SHELF.x + 60, SHELF.base - 120, 2);
          if (!e.onTime) UI.toast(`${e.o.name} got their laundry late.`, 'icon_clock', 'bad');
          else if (e.tip > 0) UI.toast(`${e.o.name} picked up — tip ${money(e.tip)}!`, 'icon_coin');
          this.app.hud.refresh(); this.app.hud.refreshTickets();
          break;
        }
        case 'orderLate': this.app.hud.refreshTickets(); break;
        case 'puddle': if (Math.random() < 0.5) Sound.play('drop', { vol: 0.25 }); break;
        case 'selfMove': this.updateSound(); break;
        default: break;
      }
    }
  }

  machineTop(m) {
    if (m.kind === 'washer') return { x: WASHER_X(m.slot), y: WASHER_BASE - WASHER_H };
    const u = Math.floor(m.slot / 2);
    return { x: DRYER_X(u), y: WASHER_BASE - DRYER_H + (m.slot % 2 ? DRYER_H * 0.45 : 0) };
  }

  // ------------------------------------------------------------------ drawing
  draw() {
    const r = this.r, c = r.ctx;
    r.clear('#1a1410');
    r.world();
    this.drawOutside(r);
    if (this.bg) c.drawImage(this.bg, 0, 0, this.worldW, 720);
    this.glass.draw(c);
    this.drawGlassDecal(r);
    for (const { d } of this.sortedDrawables()) d.draw(r, this.t);
    this.particles.draw(c);
    // lighting
    const night = nightness(G.time);
    const lights = [];
    const lampI = 0.3 + 0.7 * night;
    for (const lx of [250, 720, 1070, 1500]) {
      lights.push({ x: lx, y: 150, r: 430, c: [255, 214, 160], i: lampI * 0.8 });
      lights.push({ x: lx, y: 600, r: 340, c: [255, 200, 150], i: lampI * 0.45, sy: 0.55 });
    }
    lights.push({ x: 1680, y: 330, r: 560, c: [215, 228, 255], i: 0.55 * (1 - night) });
    lights.push({ x: 710, y: 160, r: 330, c: [215, 228, 255], i: 0.35 * (1 - night) });
    if (G.placed.lights) lights.push({ x: SHOP_SLOTS.lights.x, y: 170, r: 300, c: [255, 190, 110], i: 0.5 * night + 0.1 });
    if (G.placed.floor_l1 === 'floor_lamp') lights.push({ x: SHOP_SLOTS.floor_l1.x + 30, y: 470, r: 260, c: [255, 196, 120], i: 0.4 + 0.4 * night });
    for (const s of ['sill', 'sill2']) if (G.placed[s] === 'lantern') lights.push({ x: SHOP_SLOTS[s].x, y: 420, r: 200, c: [255, 180, 90], i: 0.5 * night });
    if (this.powerOut) { lights.length = 0; for (const s of ['sill', 'sill2', 'counter_top']) lights.push({ x: SHOP_SLOTS[s].x, y: 430, r: 360, c: [255, 170, 80], i: 0.9 }); }
    r.applyLighting(this.ambientColor(), lights, r.cam.x);
    // bloom
    if (!this.powerOut) for (const lx of [250, 720, 1070, 1500]) r.glow(lx, 128, 70, [255, 225, 160], 0.35 * lampI);
    if (G.placed.lights) this.drawStringGlow(r, night);
    if (this.powerOut) r.glow(SHOP_SLOTS.sill.x, 420, 90, [255, 190, 100], 0.4);
    this.drawIndicators(r);
    for (const a of this.actors) a.drawEmote(r, this.t);
    for (const rp of this.ripples) {
      c.save(); c.globalAlpha = 1 - rp.t / 0.45; c.strokeStyle = '#fff3d0'; c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(rp.x, rp.y, 10 + rp.t * 70, (10 + rp.t * 70) * 0.35, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    r.vignette(0.35);
  }

  ambientColor() {
    const a = this.ambient();
    if (this.powerOut) return [58, 56, 78];
    return a;
  }

  drawOutside(r) {
    const c = r.ctx;
    const night = nightness(G.time);
    if (this.outside) {
      c.drawImage(this.outside, 0, 0, this.worldW, 720);
      this.tintOutdoors(r);
      if (this.outsideLights && night > 0.05) { c.save(); c.globalAlpha = night; c.globalCompositeOperation = 'lighter'; c.drawImage(this.outsideLights, 0, 0, this.worldW, 720); c.restore(); }
    } else {
      const g = c.createLinearGradient(0, 0, 0, 480);
      g.addColorStop(0, night > 0.5 ? '#1c2640' : '#9fb7c6'); g.addColorStop(1, night > 0.5 ? '#3a4660' : '#d8d2bf');
      c.fillStyle = g; c.fillRect(0, 0, this.worldW, 480);
    }
    // passers-by with umbrellas behind the storefront
    if (this.walkInGhost > 0) this.walkInGhost -= 1 / 60;
    const tt = this.t;
    for (let i = 0; i < 2; i++) {
      const period = 17 + i * 6;
      const ph = ((tt + i * 9) % period) / period;
      const x = 1540 + ph * 300, y = 430;
      c.save(); c.globalAlpha = 0.35 + 0.2 * night; c.fillStyle = '#1b2230';
      c.beginPath(); c.ellipse(x, y - 60, 12, 16, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(x - 13, y - 48, 26, 52);
      if (G.weather !== 'clear') { c.beginPath(); c.ellipse(x, y - 86, 34, 14, 0, Math.PI, 0); c.fill(); c.fillRect(x - 1, y - 86, 2, 30); }
      c.restore();
    }
  }

  drawGlassDecal(r) {
    const c = r.ctx;
    c.save();
    c.translate(1680, 190);
    c.scale(-1, 1);
    c.font = '46px Pacifico';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(240,210,150,0.55)';
    c.strokeStyle = 'rgba(80,40,20,0.35)'; c.lineWidth = 3;
    c.strokeText(G.shop, 0, 0);
    c.fillText(G.shop, 0, 0);
    c.font = '700 17px Fraunces';
    c.fillStyle = 'rgba(240,220,180,0.5)';
    c.fillText('LAUNDROMAT · WASH & FOLD', 0, 34);
    c.restore();
    // door sign
    c.save();
    const open = this.shiftRunning;
    c.translate(1859, 262);
    c.fillStyle = open ? '#e8b04e' : '#8a7a6a';
    c.strokeStyle = '#3a2a1e'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(-30, -13, 60, 26, 5); c.fill(); c.stroke();
    c.fillStyle = '#3a2a1e'; c.font = '700 15px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(open ? 'OPEN' : 'CLOSED', 0, 1);
    c.restore();
  }

  drawStringGlow(r, night) {
    const pos = SHOP_SLOTS.lights;
    for (let i = 0; i < 6; i++) {
      const x = pos.x - 100 + i * 40, y = pos.y + 22 + Math.sin(i * 1.1) * 8;
      r.glow(x, y, 26, [255, 200, 120], 0.25 + 0.4 * night * (0.85 + 0.15 * Math.sin(this.t * 2 + i)));
    }
  }

  machineSprite(m) {
    const model = L.modelOf(m);
    if (m.kind === 'dryer') return 'machine_stack_unit';
    if (m.model !== 'classic') return model.sprite;
    if (this.machineAnim[m.id]) return 'machine_washer_open';
    if (m.state === 'running' && !m.broken) return 'machine_washer_running';
    return 'machine_washer_idle';
  }

  drawWasherSlot(r, i, x) {
    const c = r.ctx;
    const m = L.washers().find(q => q.slot === i);
    if (!m) {
      // empty bay: hose marks and a dust outline
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#5a4a3a'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.strokeRect(x - 66, WASHER_BASE - 190, 132, 186); c.setLineDash([]);
      c.fillStyle = 'rgba(40,30,20,0.25)'; c.beginPath(); c.ellipse(x, WASHER_BASE + 2, 70, 9, 0, 0, Math.PI * 2); c.fill();
      c.restore();
      this.drawAddBadge(r, x, WASHER_BASE - 96);
      return;
    }
    const sprite = this.machineSprite(m);
    const shake = m.state === 'running' && !m.broken ? Math.sin(this.t * 38 + i) * 0.9 : 0;
    const k = WASHER_H / (Assets.img(sprite)?.naturalHeight || 458);
    c.save(); c.globalAlpha = 0.3; c.fillStyle = '#1a120c'; c.beginPath(); c.ellipse(x + 8, WASHER_BASE - 2, 76, 10, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const box = r.sprite(sprite, x + shake, WASHER_BASE, { h: WASHER_H, ax: sprite === 'machine_washer_open' ? 0.42 : 0.5 });
    if (!box) return;
    if (m.state === 'running' && !m.broken) this.drawDrum(r, box, (GEOM[sprite] || GEOM.machine_washer_idle)[0], m, 1);
    if (m.state === 'done' && m.load !== 'self') this.drawDrum(r, box, (GEOM[sprite] || GEOM.machine_washer_idle)[0], m, 0);
    if (m.broken) this.drawOutOfOrder(r, x, WASHER_BASE - WASHER_H * 0.55);
    void k;
  }

  drawDryerUnit(r, u, x) {
    const c = r.ctx;
    const drums = L.dryers().filter(d => Math.floor(d.slot / 2) === u);
    if (!drums.length) {
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#5a4a3a'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.strokeRect(x - 62, WASHER_BASE - 280, 124, 276); c.setLineDash([]); c.restore();
      this.drawAddBadge(r, x, WASHER_BASE - 140);
      return;
    }
    const running = drums.some(d => d.state === 'running' && !d.broken);
    const shake = running ? Math.sin(this.t * 30 + u) * 0.7 : 0;
    c.save(); c.globalAlpha = 0.3; c.fillStyle = '#1a120c'; c.beginPath(); c.ellipse(x + 6, WASHER_BASE - 2, 70, 10, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const box = r.sprite('machine_stack_unit', x + shake, WASHER_BASE, { h: DRYER_H });
    if (!box) return;
    for (const d of drums) {
      const g = GEOM.machine_stack_unit[d.slot % 2];
      if (d.state === 'running' && !d.broken) this.drawDrum(r, box, g, d, 1);
      else if (d.state === 'done' && d.load !== 'self') this.drawDrum(r, box, g, d, 0);
      if (d.broken) this.drawOutOfOrder(r, x, box.y + box.h * g.cy);
      if (d.lint >= 5 && !d.broken) {
        c.save(); c.fillStyle = 'rgba(210,205,195,0.9)'; c.beginPath();
        const lx = box.x + box.w * 0.25, ly = box.y + box.h * (g.cy + 0.12);
        for (let k2 = 0; k2 < 5; k2++) c.arc(lx + k2 * 5, ly + Math.sin(k2) * 3, 5, 0, Math.PI * 2);
        c.fill(); c.restore();
      }
    }
    // the cat naps on warm dryers some days
    if (u === 0 && G.flags.cat_in_shop && running) {
      r.sprite('item_cat_bed', x - 4, box.y + 6, { h: 44 });
    }
  }

  // A soft "+" on an empty bay: tap to buy a machine for it.
  drawAddBadge(r, x, y) {
    const c = r.ctx, p = 1 + Math.sin(this.t * 2.2) * 0.04;
    c.save(); c.translate(x, y); c.scale(p, p);
    c.globalAlpha = 0.75;
    c.fillStyle = '#f7ecd4'; c.strokeStyle = '#2b5a60'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(0, 0, 17, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#2b5a60'; c.fillRect(-8, -2, 16, 4); c.fillRect(-2, -8, 4, 16);
    c.restore();
  }

  // Tumbling laundry inside a drum window.
  drawDrum(r, box, g, m, spin) {
    const c = r.ctx;
    const cx = box.x + box.w * g.cx, cy = box.y + box.h * g.cy, rad = box.w * g.r;
    const o = m.load && m.load !== 'self' ? L.order(m.load) : null;
    const col = (o && o.color) || (m.selfColor || (m.selfColor = rand.pick(LAUNDRY_COLORS)));
    c.save();
    c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(30,34,40,0.55)'; c.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    const rot = spin ? this.t * (m.kind === 'washer' ? 5.5 : 3.2) : 0;
    const blobs = [col, '#e9e2d4', col, '#8aa0b8', col];
    for (let i = 0; i < blobs.length; i++) {
      const a = rot + i * 1.26;
      const rr = rad * (spin ? 0.45 : 0.3);
      const bx = cx + Math.cos(a) * rr * (spin ? 1 : 0.6), by = cy + (spin ? Math.sin(a) * rr : rad * 0.45);
      c.fillStyle = blobs[i];
      c.globalAlpha = 0.85;
      c.beginPath(); c.ellipse(bx, by, rad * 0.45, rad * 0.3, a, 0, Math.PI * 2); c.fill();
    }
    if (spin && m.kind === 'washer') {
      c.globalAlpha = 0.35; c.fillStyle = '#bcd8e8';
      c.fillRect(cx - rad, cy + rad * 0.25 + Math.sin(this.t * 3) * 3, rad * 2, rad);
    }
    c.globalAlpha = 0.35; c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(cx - rad * 0.35, cy - rad * 0.4, rad * 0.35, rad * 0.18, -0.6, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  drawOutOfOrder(r, x, y) {
    const c = r.ctx;
    c.save();
    c.translate(x - 6, y - 10); c.rotate(-0.08);
    c.fillStyle = '#f3e3c3'; c.strokeStyle = '#3a2a1e'; c.lineWidth = 1.5;
    c.fillRect(-40, -18, 80, 36); c.strokeRect(-40, -18, 80, 36);
    c.fillStyle = 'rgba(200,190,150,0.8)'; c.fillRect(-46, -22, 14, 8); c.fillRect(32, -22, 14, 8);
    c.fillStyle = '#b3402f'; c.font = '700 12px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('OUT OF', 0, -5); c.fillText('ORDER', 0, 9);
    c.restore();
  }

  drawShelf(r) {
    const box = r.sprite('furn_tall_shelf', SHELF.x, SHELF.base, { h: SHELF.h });
    if (!box) return;
    const levels = [0.33, 0.61, 0.9];
    const ready = G.shelf.map(id => L.order(id)).filter(Boolean);
    ready.forEach((o, i) => {
      const lv = levels[Math.floor(i / 3) % 3];
      const x = box.x + box.w * (0.26 + (i % 3) * 0.24);
      const y = box.y + box.h * lv - 2;
      r.sprite(o.service === 'wash_dry' ? 'item_drawstring_bag' : 'item_towels', x, y, { h: 34 });
    });
  }

  drawCounter(r) {
    r.sprite('furn_counter', COUNTER.x, COUNTER.base, { h: COUNTER.h });
    // a little bell on the counter
    const c = r.ctx;
    c.save(); c.fillStyle = '#d9a441'; c.strokeStyle = '#3a2a1e'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(COUNTER.x - 40, COUNTER.base - COUNTER.h + 14, 9, Math.PI, 0); c.fill(); c.stroke();
    c.fillRect(COUNTER.x - 52, COUNTER.base - COUNTER.h + 14, 24, 3); c.restore();
    const waiting = G.orders.filter(o => o.stage === 'counter');
    waiting.slice(0, 3).forEach((o, i) => {
      r.sprite(o.bag, COUNTER.x + 10 + i * 34 - (waiting.length - 1) * 17, COUNTER.base - COUNTER.h + 16 + (i % 2) * 3, { h: 58 });
    });
  }

  drawFold(r) {
    if (this.mode === 'fold') {
      this.foldAnim = (this.foldAnim || 0) + 1 / 60;
      const bob = Math.sin(this.foldAnim * 6) * 1.5;
      r.sprite('player_fold_body', FOLD.x, FOLD.base + bob * 0.3, { h: FOLD.h });
    }
    r.sprite('prop_fold_table', FOLD.x, FOLD.base, { h: FOLD.h });
  }

  drawBench(r) {
    if (this.mode === 'sit') r.sprite('player_sit', BENCH.x, BENCH.base, { h: BENCH.h });
    else r.sprite('prop_bench', BENCH.x, BENCH.base, { h: BENCH.h });
  }

  drawSupply(r) {
    const box = r.sprite('decor_wall_shelf', SUPPLY.x, SUPPLY.y, { w: SUPPLY.w });
    if (!box) return;
    const n = Math.ceil(G.inv.detergent || 0);
    const jugs = Math.min(4, Math.ceil(n / 5));
    for (let i = 0; i < jugs; i++) r.sprite('item_detergent', box.x + 22 + i * 26, box.y + box.h * 0.36, { h: 38 });
    if ((G.inv.softener || 0) > 0) r.sprite('item_softener', box.x + 30, box.y + box.h * 0.9, { h: 34 });
    if ((G.inv.parts || 0) > 0) r.sprite('item_coin_tray', box.x + 84, box.y + box.h * 0.9, { h: 20 });
    if ((G.inv.tea || 0) > 0) r.sprite('item_teacup', box.x + 108, box.y + box.h * 0.9, { h: 22 });
  }

  drawClock(r) {
    const c = r.ctx;
    r.sprite('icon_clock', CLOCK.x, CLOCK.y, { h: CLOCK.s, ay: 0.5 });
    const t = G.time;
    const hA = ((t / 60) % 12) / 12 * Math.PI * 2 - Math.PI / 2;
    const mA = (t % 60) / 60 * Math.PI * 2 - Math.PI / 2;
    c.save(); c.strokeStyle = '#2a1c14'; c.lineCap = 'round';
    c.lineWidth = 3.2; c.beginPath(); c.moveTo(CLOCK.x, CLOCK.y); c.lineTo(CLOCK.x + Math.cos(hA) * 12, CLOCK.y + Math.sin(hA) * 12); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(CLOCK.x, CLOCK.y); c.lineTo(CLOCK.x + Math.cos(mA) * 18, CLOCK.y + Math.sin(mA) * 18); c.stroke();
    c.restore();
  }

  drawPriceBoard(r) {
    const c = r.ctx;
    const mul = G.policies.prices === 'low' ? 0.85 : G.policies.prices === 'high' ? 1.2 : 1;
    c.save();
    c.fillStyle = 'rgba(240,236,220,0.85)';
    c.font = '700 17px Caveat'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('Self-serve wash  $3.50', 234, 146);
    c.fillText('Dry (40 min)  $2.50', 234, 168);
    c.fillText(`Wash & fold  $${Math.round(16 * mul)}`, 234, 190);
    c.fillText(`Rush  $${Math.round(24 * mul)}`, 234, 212);
    if (G.policies.pwyc) { c.fillStyle = 'rgba(240,200,120,0.95)'; c.fillText('Sundays: pay what you can ♥', 234, 229); }
    c.restore();
  }

  drawSlot(r, slot, pos) {
    const id = G.placed[slot];
    if (!id) return;
    const d = DECOR[id];
    if (!d) return;
    const opt = d.h ? { h: d.h } : { w: d.w };
    if (d.ay !== undefined) opt.ay = d.ay;
    let y = pos.y;
    if (slot === 'lounge_table') { r.sprite('street_cafe_table', pos.x, pos.y, { h: 104 }); y = pos.y - 96; }
    if (slot === 'hang1' || slot === 'hang2') {
      const sway = Math.sin(this.t * 1.3 + pos.x) * 0.02;
      r.sprite(d.sprite, pos.x, y - (d.h || 100), { h: d.h, ay: 0, rot: sway });
      return;
    }
    if (d.flat) { r.ctx.save(); r.ctx.globalAlpha = 0.95; r.sprite(d.sprite, pos.x, y, { w: d.w, sy: 0.55 }); r.ctx.restore(); return; }
    r.sprite(d.sprite, pos.x, y, opt);
    if (d.fn === 'tea' && Math.random() < 0.02) this.particles.emit('steam', pos.x - 10, y - (d.h || 50), 1);
  }

  drawFloorStuff(r) {
    for (const p of L.Sim.puddles) {
      r.sprite('street_puddle', p.x, p.y + 12, { w: 120 * p.size, sy: 0.6, alpha: 0.75 });
    }
    for (const l of L.Sim.litter) {
      if (l.kind === 'sock') r.sprite('item_sock', l.x, l.y, { h: 30, rot: 0.9 });
      else { const c = r.ctx; c.save(); c.fillStyle = '#cfc8b8'; c.strokeStyle = 'rgba(60,50,40,0.5)'; c.beginPath(); c.arc(l.x, l.y - 6, 9, 0, Math.PI * 2); c.arc(l.x + 8, l.y - 9, 7, 0, Math.PI * 2); c.fill(); c.stroke(); c.restore(); }
    }
  }

  // Progress rings, "ready" bubbles and hints for where the carried laundry can go.
  drawIndicators(r) {
    const c = r.ctx;
    const t = this.t;
    const bubble = (x, y, icon, color, label, bounce) => {
      const yy = y + (bounce ? Math.sin(t * 5) * 4 : 0);
      c.save();
      c.fillStyle = color || '#f7ecd4'; c.strokeStyle = '#3a2a1e'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, yy, 19, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 6, yy + 16); c.lineTo(x, yy + 26); c.lineTo(x + 6, yy + 16); c.fill();
      if (icon) { const im = Assets.img(icon); if (im) c.drawImage(im, x - 13, yy - 13, 26, 26); }
      if (label) { c.fillStyle = '#3a2a1e'; c.font = '700 18px Fraunces'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, yy + 1); }
      c.restore();
    };
    const ring = (x, y, p, icon) => {
      c.save();
      c.fillStyle = 'rgba(247,236,212,0.92)'; c.beginPath(); c.arc(x, y, 17, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(58,42,30,0.25)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#3f6c74'; c.beginPath(); c.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
      const im = Assets.img(icon); if (im) c.drawImage(im, x - 9, y - 9, 18, 18);
      c.restore();
    };
    for (const m of G.machines) {
      const p = this.machineTop(m);
      const x = p.x + (m.kind === 'dryer' ? 52 : 0), y = p.y - 24 + (m.kind === 'dryer' ? 20 : 0);
      if (m.broken) bubble(x, y, 'icon_wrench', '#f4c9b8', null, true);
      else if (m.state === 'running') { if (m.load !== 'self' || true) ring(x, y, m.t / m.dur, m.load === 'self' ? 'icon_coin' : (m.kind === 'washer' ? 'icon_washer' : 'icon_dryer')); }
      else if (m.state === 'done' && m.load !== 'self') bubble(x, y, null, '#e8d38a', '✓', true);
      else if (m.kind === 'dryer' && m.lint >= 5) bubble(x, y, 'icon_dryer', '#ddd7cc', null, false);
    }
    // counter bell
    if (G.orders.some(o => o.stage === 'counter')) bubble(COUNTER.x + 10, COUNTER.base - COUNTER.h - 58, 'icon_basket', '#f7ecd4', null, true);
    // hints for carried laundry
    const o = this.carried()[0];
    if (o) {
      const step = L.nextStep(o);
      const hint = (x, y) => { c.save(); c.fillStyle = `rgba(232,176,78,${0.55 + 0.35 * Math.sin(t * 6)})`; c.beginPath(); c.moveTo(x - 12, y - 16); c.lineTo(x + 12, y - 16); c.lineTo(x, y); c.closePath(); c.fill(); c.strokeStyle = '#3a2a1e'; c.lineWidth = 1.5; c.stroke(); c.restore(); };
      // free machines of the right kind, or (hands full) finished ones you can swap with
      const full = !this.canCarryMore();
      const ok = m => L.isFree(m) || (full && m.state === 'done' && m.load && m.load !== 'self' && !m.broken);
      if (step === 'wash') for (const m of L.washers()) { if (ok(m)) { const p = this.machineTop(m); hint(p.x, p.y - 8 + Math.sin(t * 5) * 4); } }
      if (step === 'dry') for (const m of L.dryers()) { if (ok(m)) { const p = this.machineTop(m); hint(p.x + 16, p.y + 4 + Math.sin(t * 5) * 4); } }
      if (step === 'fold') hint(FOLD.x, FOLD.base - 140 + Math.sin(t * 5) * 4);
      if (step === 'shelf') hint(SHELF.x, SHELF.base - SHELF.h - 10 + Math.sin(t * 5) * 4);
      // what the player is carrying
      const icon = step === 'wash' ? 'icon_washer' : step === 'dry' ? 'icon_dryer' : step === 'fold' ? 'icon_towels' : 'icon_basket';
      if (this.player.visible) bubble(this.player.x + 30, this.player.y - 290, icon, '#f7ecd4', null, false);
    }
    // puddle sparkle
    for (const p of L.Sim.puddles) if (Math.sin(t * 3 + p.id) > 0.95) this.particles.emit('sparkle', p.x + 20, p.y - 5, 1, { color: '#dff0ff' });
  }
}
