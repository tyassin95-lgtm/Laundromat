// Rosa's laundromat: the core management scene.
import { Scene, nightness } from './scene.js';
import { Actor } from '../engine/actor.js';
import { Assets } from '../engine/assets.js';
import { Sound } from '../engine/audio.js';
import { GlassRain } from '../engine/particles.js';
import { tweens } from '../engine/tween.js';
import { clamp, rand, clockStr, money } from '../engine/util.js';
import { G, addStat, addMoney, heartsOf, giveItem, takeItem, weekday, NEIGHBOURS } from '../game/state.js';
import * as L from '../game/laundry.js';
import { SHOP_SLOTS, DECOR, SUPPLIES } from '../data/decor.js';
import { SERVICES, FRIEND_ORDERS, REGULARS } from '../data/regulars.js';
import { CHARACTERS, ROUTINES, hasSprite, faceOrIcon } from '../data/characters.js';
import { MACHINE_ART } from '../data/machine_art.js';
import { UI } from '../ui/ui.js';
import { foldGame, repairGame } from '../ui/minigames.js';
import { vibrate, Settings } from '../game/settings.js';
import { StreetView } from './views.js';

// The room is flat 2D (bg/laundromat.webp, 2080 x 720 world px): the back wall meets the floor at
// y 612, so everything against the wall stands on FLOOR, and people walk in the band WALK. Things
// out in the room (the counter, the folding table, the bench) stand lower, and whoever is behind
// them is drawn first. Left to right:
//   the UPSTAIRS door (12-140), the pick-up shelf against the wall, the counter under the price
//   chalkboard (258-467 x 172-300), the folding table under the wall shelf of supplies;
//   five washer bays under the copper hook-ups, the clock between the lamps;
//   two dryer towers under the vent ducts, the lounge by the front window (glass 1700-1909 x
//   248-530) and the front door (1934-2080).
const FLOOR = 614;
const WALK = [618, 694];
const WASHER_X = i => 681 + i * 150;
const WASHER_H = 206;
const DRYER_X = u => 1419 + u * 145;
const DRYER_H = 296;
// top = where things stand on it, as a fraction of the sprite's height from its top edge
const SHELF = { x: 202, base: FLOOR, h: 220, boards: [0.113, 0.383, 0.658] };
const COUNTER = { x: 345, base: 654, h: 124, top: 0.047 };
const FOLD = { x: 540, base: 668, h: 118, top: 0.064 };
const SUPPLY = { x: 546, y: 312, w: 118, boards: [0.14, 0.613] };
const LOUNGE_H = 88;                                   // the little cafe table in the lounge
export const COUNTER_SPOT = { x: 452, y: 688 };        // where a customer stands to talk
// The seat under the front window, where you catch your breath: the shop's bench, or the seat
// you've placed there instead. top = the seat's surface; h keeps each within the lounge.
const BENCH = { x: 1860, base: 668 };
const SEATS = {
  bench: { s: 'prop_bench', h: 72, top: 0.031 },
  plastic_chair: { s: 'furn_plastic_chair', h: 130, top: 0.406 },
  stool: { s: 'furn_stool', h: 84, top: 0.056 },
  double_bench: { s: 'furn_double_bench', h: 87, top: 0.427 },
};
const SIT_H = 450 * 262 / 490, SIT_SEAT = 0.37;       // the sitting pose: its seat line, up from its feet
const STAFF = { x: 345, y: 628 };                      // behind the counter
const CLOCK = { x: 1006, y: 196, s: 74 };
const LAMPS = [352, 831, 1188, 1816];
const BACK_DOOR = { x: 18, y: 250, w: 118, h: 362, at: [80, 636] };
const FRONT_DOOR = { x: 1934, y: 150, w: 146, h: 462, at: [2004, 650] };
const PK = 262 / 490;     // player pose scale
// scene sprites for the bags customers bring (the item_* ones are the UI's icons)
const BAGS = { item_drawstring_bag: 'scn_bag_drawstring', item_tote_bag: 'scn_bag_tote', item_hamper: 'scn_bag_hamper', item_wicker_basket: 'scn_bag_basket' };

export const GLASS = [
  { x: 1701, y: 169, w: 64, h: 65 }, { x: 1776, y: 169, w: 61, h: 65 }, { x: 1848, y: 169, w: 61, h: 65 },
  { x: 1700, y: 248, w: 209, h: 282 },
  { x: 1947, y: 169, w: 114, h: 64 }, { x: 1959, y: 268, w: 92, h: 275 },
];

const LAUNDRY_COLORS = ['#7fa0b0', '#c9b88f', '#b86a4a', '#6f8f6a', '#d9cfbf', '#5f6f8f', '#c48fa0', '#e0c070', '#8a6a9a'];
// The bundles of washing seen tumbling in a drum: mostly the load's own colour, and a towel.
const BUNDLES = { red: 'drum_red', white: 'drum_white', blue: 'drum_blue', yellow: 'drum_yellow' };
function bundlesFor(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const main = Math.max(r, g, b) - Math.min(r, g, b) < 26 ? 'white' : b >= r && b >= g - 10 ? 'blue' : r > g + 30 ? 'red' : 'yellow';
  const other = main === 'blue' ? 'yellow' : 'blue';
  return [BUNDLES[main], BUNDLES.white, BUNDLES[main], BUNDLES[other], BUNDLES[main]];
}

export class LaundromatScene extends Scene {
  constructor(app) {
    super(app, { worldW: 2080, interior: true, walkBand: WALK });
    this.name = 'laundromat';
    this.counterSpot = COUNTER_SPOT;
    this.player = new Actor({ id: 'me', player: true, h: 262, x: BACK_DOOR.at[0], y: BACK_DOOR.at[1], speed: 330 });
    this.player.hitW = 90;
    this.carry = [];               // order ids in hand
    this.jobs = [];
    this.busy = false;
    this.mode = null;              // null | 'fold' | 'sit'
    this.visitors = new Map();     // id -> {actor, leaveAt, state}
    this.glass = new GlassRain(GLASS);
    this.ripples = [];
    this.machineAnim = {};         // machine id -> {t, dur}: the door swings open, then shut
    this.drum = {};                // machine id -> {ang, dir}: drum rotation
    this.view = new StreetView({ x: 1440, y: -30, w: 640, h: 600, follow: 0.2 });
    this.clockTicked = -1;
    this.shiftRunning = false;
    this.warnedClosing = false;
  }

  // ------------------------------------------------------------------ lifecycle
  async enter(opts = {}) {
    this.bg = await Assets.bg('laundromat');
    await this.view.load();
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
    if (from === 'backdoor') { [this.player.x, this.player.y] = BACK_DOOR.at; this.player.facing = 1; }
    else if (from === 'front') { [this.player.x, this.player.y] = FRONT_DOOR.at; this.player.facing = -1; }
    else { this.player.x = opts.x || 900; this.player.y = opts.y || 650; }
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
    // washers (5 bays)
    for (let i = 0; i < L.WASHER_SLOTS; i++) {
      const x = WASHER_X(i);
      E({
        id: 'wslot' + i, z: FLOOR,
        m: () => L.washers().find(m => m.slot === i),
        draw: (r) => this.drawWasherSlot(r, i, x),
        hit: () => ({ x: x - 64, y: FLOOR - WASHER_H, w: 128, h: WASHER_H }),
        tap: () => this.tapWasherSlot(i),
      });
    }
    // dryer towers (2)
    for (let u = 0; u < L.DRYER_UNITS; u++) {
      const x = DRYER_X(u);
      E({ id: 'dunit' + u, z: FLOOR + 1, draw: (r) => this.drawDryerUnit(r, u, x),
        hit: () => ({ x: x - 56, y: FLOOR - DRYER_H, w: 112, h: DRYER_H }),
        tap: (wx, wy) => this.tapDryerUnit(u, wy) });
    }
    // pick-up shelf against the wall
    E({ id: 'shelf', z: SHELF.base, draw: (r) => this.drawShelf(r),
      hit: () => ({ x: SHELF.x - 80, y: SHELF.base - SHELF.h, w: 160, h: SHELF.h }), tap: () => this.tapShelf() });
    // counter with bags waiting
    E({ id: 'counter', z: COUNTER.base, draw: (r) => this.drawCounter(r),
      hit: () => ({ x: COUNTER.x - 85, y: COUNTER.base - COUNTER.h - 50, w: 170, h: COUNTER.h + 50 }), tap: () => this.tapCounter() });
    // folding table
    E({ id: 'fold', z: FOLD.base, draw: (r) => this.drawFold(r),
      hit: () => ({ x: FOLD.x - 78, y: FOLD.base - FOLD.h, w: 156, h: FOLD.h }), tap: () => this.tapFold() });
    // the seat under the window
    E({ id: 'bench', z: BENCH.base, draw: (r) => this.drawBench(r),
      hit: () => { const b = this.seatBox(); return { x: b.x - 6, y: b.y - 20, w: b.w + 12, h: b.h + 20 }; }, tap: () => this.tapBench() });
    // supply shelf on the wall
    E({ id: 'supply', z: 60, draw: (r) => this.drawSupply(r),
      hit: () => ({ x: SUPPLY.x - SUPPLY.w / 2, y: SUPPLY.y - 80, w: SUPPLY.w, h: 82 }), tap: () => this.tapSupply() });
    // upgrades that live on the wall: the coin changer between the third and fourth hook-ups,
    // the tankless heater at the end of the copper line
    E({ id: 'changer', z: 54, draw: (r) => { if (G.upgrades.includes('coin_changer')) r.sprite('upg_coin_changer', 1056, 406, { h: 64 }); } });
    E({ id: 'heater', z: 54, draw: (r) => { if (G.upgrades.includes('water_heater')) r.sprite('upg_water_heater', 638, 322, { h: 104 }); } });
    // wall clock and the price board
    E({ id: 'clock', z: 55, draw: (r) => this.drawClock(r), hit: () => ({ x: CLOCK.x - 38, y: CLOCK.y - 38, w: 76, h: 76 }),
      tap: () => UI.toast(`${clockStr(G.time)} — ${this.shiftRunning ? 'open until 6:00 PM' : 'closed'}`, 'icon_clock') });
    E({ id: 'prices', z: 54, draw: (r) => this.drawPriceBoard(r), hit: () => ({ x: 258, y: 172, w: 209, h: 128 }),
      tap: () => this.app.menus.openCatalog('prices') });
    // doors
    E({ id: 'backdoor', z: 50, hit: () => BACK_DOOR, tap: () => this.tapBackDoor() });
    E({ id: 'frontdoor', z: 50, hit: () => FRONT_DOOR, tap: () => this.tapFrontDoor() });
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
    // puddles & litter (dynamic, flat on the floor)
    E({ id: 'floorstuff', z: FLOOR + 2, draw: (r) => this.drawFloorStuff(r) });
  }

  slotZ(slot) {
    if (slot === 'rug') return FLOOR + 3;
    if (['hang1', 'hang2', 'lights', 'wall_a', 'wall_b'].includes(slot)) return 52;
    if (slot === 'sill') return FLOOR - 1;
    if (slot === 'sill2') return FLOOR - 1;
    if (slot === 'counter_top') return COUNTER.base + 1;
    return SHOP_SLOTS[slot].y;
  }

  slotHit(slot, pos) {
    const id = G.placed[slot];
    if (!id || slot === 'seat') return null;       // the seat is the bench (tap it to sit)
    const d = DECOR[id];
    const im = Assets.img(d.sprite);
    if (!im) return null;
    const k = d.h ? d.h / im.naturalHeight : d.w / im.naturalWidth;
    const w = im.naturalWidth * k, h = im.naturalHeight * k;
    const ay = (slot === 'hang1' || slot === 'hang2') ? 1 : (d.ay ?? 1);
    let y = pos.y - h * ay;
    if (slot === 'lounge_table') y -= LOUNGE_H - 2;
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
    if (w.y > 560) this.walkFloor(w.x, w.y);
  }

  walkFloor(x, y) {
    this.jobs = [];
    const tx = clamp(x, 40, this.worldW - 40), ty = clamp(y, this.walkBand[0], this.walkBand[1]);
    this.player.walkTo(tx, ty);
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
        const ok = await this.player.walkTo(j.x, j.y, j.face);
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
      this.queue({ x: STAFF.x, y: STAFF.y, face: 1, run: async () => {
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
    this.queue({ x: STAFF.x, y: STAFF.y, face: 1, run: async () => {
      const o = this.pickFromCounter();
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

  // Which bag to take: one whose next step can happen right now (a free washer or dryer),
  // otherwise the oldest. Loads you set down come back when their machine frees up.
  pickFromCounter() {
    const waiting = G.orders.filter(o => o.stage === 'counter');
    const ready = o => {
      const st = L.nextStep(o);
      if (st === 'wash') return L.washers().some(L.isFree);
      if (st === 'dry') return L.dryers().some(L.isFree);
      return true;
    };
    return waiting.find(ready) || waiting[0] || null;
  }

  // ------------------------------------------------------------------ washers
  tapWasherSlot(i) {
    const m = L.washers().find(q => q.slot === i);
    if (!m) { this.app.menus.openCatalog('machines'); return; }
    this.tapMachine(m, this.machineSpot(m));
  }

  tapDryerUnit(u, wy) {
    const drums = L.dryers().filter(d => Math.floor(d.slot / 2) === u);
    if (!drums.length) { this.app.menus.openCatalog('machines'); return; }
    // pick the drum the player most likely meant
    const mid = FLOOR - DRYER_H * 0.5;
    let drum = drums.find(d => (d.slot % 2 === 0) === (wy < mid)) || drums[0];
    // if carrying something that needs drying and the tapped drum is busy, use the other one
    const needs = this.firstNeeding('dry');
    if (needs && !L.isFree(drum)) drum = drums.find(L.isFree) || drum;
    this.tapMachine(drum, this.machineSpot(drum));
  }

  // Where to stand to work a machine: beside it, hands at the door (the first washer from its
  // right, since the folding table is on its left); the top dryer drum is a reach up.
  machineSpot(m) {
    const d = this.doorGeom(m);
    if (m.kind === 'dryer' && m.slot % 2 === 0) return { x: d.cx - 64, y: 628, face: 1, pose: 'reach' };
    if (m.kind === 'washer' && m.slot === 0) return { x: d.cx + 96, y: 628, face: -1, pose: 'load' };
    return { x: d.cx - 96, y: 628, face: 1, pose: 'load' };
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
        // an earlier queued job may have used the last detergent: don't unload into a dead end
        if (swapping && kind === 'washer' && (G.inv.detergent || 0) < L.modelOf(m).soap) { this.askDetergent(); return; }
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
    const model = L.modelOf(m);
    if (o.gentle && model.gentle) o.gentleOk = true;
    if (model.care) o.care = Math.min(0.1, (o.care || 0) + model.care);
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
    this.machineAnim[m.id] = { t: 0, dur: secs + 0.35 };
    Sound.play('latch', { vol: 0.5 });
    this.player.setPose(pose || 'load', secs);
    await tweens.wait(secs);
  }

  offerTuneUp(m, spot) {
    const top = this.machineTop(m);
    this.app.menus.contextMenu(this.r.toScreen(top.x, top.y - 20), `${L.modelOf(m).name} · ${Math.round(m.cond)}%`, [
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
    { const d = this.doorGeom(m); this.particles.emit('sparkle', d.cx, d.cy, 10); }
    UI.toast(`Repaired! ${L.modelOf(m).name} is running again.`, 'icon_wrench');
    if (q > 0.8 && G.skills.repair < 5) { G.vars.repairXp = (G.vars.repairXp || 0) + 1; }
    this.app.story.trigger('repaired', { m, q });
  }

  async doLint(m) {
    this.player.setPose('load', 0.8);
    await tweens.wait(0.8);
    L.cleanLint(m);
    const box = this.unitBox(m);
    this.particles.emit('lint', box.x + box.w * 0.5, box.y + box.h * 0.9, 14);
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
    this.queue({ x: FOLD.x, y: FOLD.base - 18, face: 1, run: async () => {
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
      await this.player.walkTo(SHELF.x + 78, 628, -1);
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
    this.queue({ x: SHELF.x + 78, y: 628, face: -1, run: () => this.placeOnShelf(o) });
  }

  async placeOnShelf(o) {
    if (!this.carry.includes(o.id)) return;
    this.player.facing = -1;
    this.player.setPose('reach', 0.6);
    Sound.play('cloth3', { vol: 0.8 });
    await tweens.wait(0.6);
    this.setCarry(this.carry.filter(id => id !== o.id));
    L.finishOrder(o);
    this.particles.emit('sparkle', SHELF.x, SHELF.base - SHELF.h * 0.6, 6);
    this.app.story.trigger('ready', { o });
  }

  // ------------------------------------------------------------------ bench & rest
  tapBench() {
    if (this.carry.length) { UI.toast('Put the laundry somewhere first.', 'icon_basket'); return; }
    this.queue({ x: BENCH.x, y: BENCH.base + 12, run: async () => {
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

  seat() { return SEATS[G.placed.seat] || SEATS.bench; }
  seatBox() {
    const st = this.seat(), w = this.r.size(st.s, { h: st.h }).w;
    return { x: BENCH.x - w / 2, y: BENCH.base - st.h, w, h: st.h };
  }

  // ------------------------------------------------------------------ supplies, doors, slots
  tapSupply() { this.app.menus.openCatalog('supplies'); }

  tapBackDoor() {
    if (this.shiftRunning) {
      UI.toast('Upstairs has to wait — the shop is open.', 'icon_home');
      return;
    }
    this.queue({ x: BACK_DOOR.at[0], y: BACK_DOOR.at[1], run: () => this.app.day.leaveLaundromat('home') });
  }

  tapFrontDoor() {
    if (this.shiftRunning) {
      if (G.time >= 16 * 60) { this.app.day.askCloseEarly(); return; }
      UI.toast('The shop is open until 6. Customers come in through here.', 'icon_clock');
      return;
    }
    this.queue({ x: FRONT_DOOR.at[0], y: FRONT_DOOR.at[1], run: () => this.app.day.leaveLaundromat('street') });
  }

  tapSlot(slot) {
    const id = G.placed[slot];
    if (!id) return;
    const d = DECOR[id];
    if (d.fn === 'music') { this.app.menus.recordPicker(); return; }
    if (d.fn === 'tea') { this.queue({ x: SHOP_SLOTS[slot].x - 70, y: clamp(SHOP_SLOTS[slot].y - 20, WALK[0], WALK[1]), face: 1, run: () => this.makeTea() }); return; }
    if (d.fn === 'community' || d.fn === 'notes') { this.app.menus.communityBoard(); return; }
    UI.toast(`${d.name} — ${d.blurb}`, null);
  }

  async makeTea() {
    if (!takeItem('tea', 1)) { UI.toast('Out of tea. (Order a tin from the supplies catalog.)', 'item_teacup', 'bad'); return; }
    this.player.setPose('reach', 1.0);
    Sound.play('kettle', { vol: 0.5 });
    await tweens.wait(1.0);
    Sound.play('cup', { vol: 0.8 });
    this.player.setPose('tea', 2.2);
    addStat('energy', 14);
    G.time += 10;
    this.particles.emit('steam', SHOP_SLOTS.lounge_table.x, SHOP_SLOTS.lounge_table.y - LOUNGE_H - 50, 8);
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
      this.player.setPose('pet', 0.7);
      await tweens.wait(0.5);
      L.Sim.litter = L.Sim.litter.filter(q => q !== l);
      if (l.kind === 'sock') this.app.menus.foundSock('shop');
      else { addStat('cleanliness', 3); UI.toast('Lint bunny caught.', 'scn_lint'); }
      Sound.play('pop', { vol: 0.6 });
    } });
  }

  // ------------------------------------------------------------------ visitors
  spawnVisitor(id, opts = {}) {
    if (this.visitors.has(id)) return this.visitors.get(id);
    const c = CHARACTERS[id];
    // pop in just inside the door (side by side if two people come in together), then hop over
    const entering = [...this.visitors.values()].filter(o => o.state === 'enter').length;
    const a = new Actor({ id, sprite: c.sprite, h: c.h, x: FRONT_DOOR.at[0] - entering * 80, y: FRONT_DOOR.at[1] + entering * 12, speed: 190 });
    a.facing = -1;
    this.actors.push(a);
    const v = { id, actor: a, state: 'enter', leaveAt: G.time + (opts.stay || 60), order: null };
    this.visitors.set(id, v);
    Sound.play('shop_bell', { vol: 0.7 });
    this.doorOpen = 0.8;
    const dest = opts.to || (opts.order ? { x: COUNTER_SPOT.x, y: COUNTER_SPOT.y } : this.freeLoungeSpot());
    (async () => {
      await a.appear();
      await tweens.wait(0.3);
      if (v.state !== 'enter') return;
      const face = dest.x < 900 ? -1 : (dest.face || -1);
      await a.walkTo(dest.x, dest.y, face);
      if (v.state !== 'enter') return;
      v.state = 'here';
      a.facing = face;
      if (opts.order) this.dropOffFriendOrder(v);
      if (opts.neighbour) await this.app.story.neighbourChat(id);
      else await this.app.story.trigger('arrive', { who: id, v });
      if (v.order && v.state === 'here') {
        const spot = this.freeLoungeSpot();
        await a.walkTo(spot.x, spot.y, spot.face || -1);
      }
    })();
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
    const a = new Actor({ id: 'maya', sprite: c.sprite, h: c.h, x: 1520, y: 676, speed: 190 });
    a.facing = -1;
    this.actors.push(a);
    this.visitors.set('maya', { id: 'maya', actor: a, state: 'here', leaveAt: 26 * 60, order: null, pinned: true });
    if (G.talked.maya !== G.day) a.say('…', 99999);
    G.vars.maya_here = true;
  }

  freeLoungeSpot() {
    const spots = [{ x: 1690, y: 690, face: -1 }, { x: 1545, y: 682, face: -1 }, { x: 1405, y: 688, face: -1 }, { x: 1250, y: 680, face: -1 }];
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
    const talkX = clamp(a.x + (a.x > 1000 ? -110 : 110), 60, 2020);
    if (!await this.player.walkTo(talkX, clamp(a.y + 6, WALK[0], WALK[1]), a.x > talkX ? 1 : -1)) return;
    if (v.state !== 'here') return;
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
    (async () => {
      await v.actor.walkTo(FRONT_DOOR.at[0], FRONT_DOOR.at[1]);
      Sound.play('shop_bell', { vol: 0.5 });
      this.doorOpen = 0.8;
      await v.actor.vanish();
      this.actors = this.actors.filter(x => x !== v.actor);
      if (this.visitors.get(v.id) === v) this.visitors.delete(v.id);
    })();
  }

  // A neighbour bringing laundry in sometimes stays for a word: always when their story has a
  // moment waiting, otherwise every other day or so (two chats a day at most). With in-world
  // art they pop in at the counter; without it, you hear them from behind the counter.
  neighbourDropIn(who) {
    const st = this.app.story;
    if (G.day < 2 || st.busy || this.visitors.has(who) || this.mode === 'fold') return;
    const due = st.pending('arrive', { who });
    const chats = G.today.nbChats || 0;
    if (!due && (G.day - (G.vars['nb_last_' + who] ?? -9) < 2 || chats >= 2 || G.talked[who] === G.day)) return;
    G.vars['nb_last_' + who] = G.day;
    G.today.nbChats = chats + 1;
    if (hasSprite(who)) this.spawnVisitor(who, { to: { x: COUNTER_SPOT.x, y: COUNTER_SPOT.y, face: -1 }, stay: 25, neighbour: true });
    else st.neighbourChat(who);
  }

  // Picking up on time is how you mostly get to know the neighbours.
  neighbourThanks(who, onTime) {
    this.app.story.addHearts(who, onTime ? 15 : 3, true);
    const r = REGULARS.find(x => x.id === who);
    const line = r && r.thanks && r.thanks[onTime ? 0 : 1];
    if (line) UI.toast(`${CHARACTERS[who].name}: “${line}”`, faceOrIcon(who), onTime ? '' : 'bad', 3200);
  }

  scheduleVisitors() {
    if (!this.shiftRunning) return;
    const wd = weekday(G.day);
    for (const id of ['walt', 'maya', 'june', 'remy']) {
      if (this.visitors.has(id) || G.vars['visited_' + id] === G.day) continue;
      if (!this.app.story.canVisit(id)) continue;
      // routine visits are for people you know; Maya and Remy drop in to introduce themselves
      // if you haven't met them elsewhere by then
      if (!G.flags['met_' + id] && !(id === 'maya' && G.day >= 2) && !(id === 'remy' && G.day >= 4)) continue;
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
    for (const a of this.actors) a.update(dt, paused);
    if (!paused) {
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
    this.applyFatigue(330, this.shiftRunning ? 'Running on fumes. Sit on the bench or make a cup of tea to catch your breath.' : null);
    this.glass.intensity = G.weather === 'rain' ? 0.8 : G.weather === 'storm' ? 1 : 0;
    this.glass.update(dt);
    this.view.update(dt, G.time, G.weather);
    this.follow(this.player, dt);
    this.ripples = this.ripples.filter(r => (r.t += dt) < 0.45);
    if (this.doorOpen > 0) this.doorOpen -= dt;
    for (const k in this.machineAnim) { const a = this.machineAnim[k]; a.t += dt; if (a.t >= a.dur) delete this.machineAnim[k]; }
    for (const m of G.machines) {
      const run = m.state === 'running' && !m.broken;
      const d = this.drum[m.id] || (this.drum[m.id] = { ang: rand() * 6, dir: 1, flip: 3 });
      if (run) {
        const ph = this.phase(m);
        d.flip -= dt;
        if (ph.name === 'wash' && d.flip <= 0) { d.dir = -d.dir; d.flip = rand.range(2.5, 4.5); }
        if (ph.name !== 'wash') d.dir = 1;
        d.ang += d.dir * ph.speed * dt;
      }
      if (m.broken && Math.random() < dt * 0.8) { const g = this.doorGeom(m); this.particles.emit('smoke', g.cx + 10, g.cy - g.r, 1); }
      if (run && m.kind === 'washer' && this.phase(m).water > 0.2 && Math.random() < dt * 0.6) { const g = this.doorGeom(m); this.particles.emit('bubble', g.cx + (rand() - 0.5) * g.r, g.cy - g.r * 0.2, 1, { override: { life: 0.8 } }); }
    }
    if (G.record && G.placed.lounge_table === 'record_player' && Math.random() < dt * 0.6) this.particles.emit('note', SHOP_SLOTS.lounge_table.x, SHOP_SLOTS.lounge_table.y - LOUNGE_H - 60, 1);
  }

  processEvents() {
    const ev = L.Sim.events.splice(0);
    for (const e of ev) {
      switch (e.type) {
        case 'orderArrived':
          if (!e.o.personal) { Sound.play('bell_small', { vol: 0.8 }); this.doorOpen = 0.6; UI.toast(`${e.o.name} dropped off laundry.`, 'icon_basket'); }
          e.o.color = rand.pick(LAUNDRY_COLORS);
          this.app.hud.refreshTickets();
          if (NEIGHBOURS.includes(e.o.who)) this.neighbourDropIn(e.o.who);
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
          if (NEIGHBOURS.includes(e.o.who) && G.flags['met_' + e.o.who]) this.neighbourThanks(e.o.who, e.onTime);
          else if (!e.onTime) UI.toast(`${e.o.name} got their laundry late.`, 'icon_clock', 'bad');
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

  // The sprite box of a washer, or of the dryer tower a drum belongs to.
  unitBox(m) {
    const sprite = L.modelOf(m).sprite;
    const art = MACHINE_ART[sprite] || { w: 200, h: 330 };
    const h = m.kind === 'washer' ? WASHER_H : DRYER_H;
    const w = h * art.w / art.h;
    const x = m.kind === 'washer' ? WASHER_X(m.slot) : DRYER_X(Math.floor(m.slot / 2));
    return { x: x - w / 2, y: FLOOR - h, w, h, cx: x, sprite, art };
  }

  // A machine's round door, in world px: centre, glass radius, ring colour, hinge side. With
  // open set, the drum opening of the open-door art instead (it sits a little differently).
  doorGeom(m, box, open) {
    box = box || this.unitBox(m);
    const art = box.art || {};
    const i = m.kind === 'washer' ? 0 : m.slot % 2;
    if (open && art.open) {
      const o = art.open, d = o.doors[Math.min(o.doors.length - 1, i)];
      const x0 = box.x + o.dx * box.w, w = o.w * box.w;
      return { cx: x0 + d.cx * w, cy: box.y + d.cy * box.h, r: d.r * w, open: true };
    }
    const doors = art.doors || [{ cx: 0.5, cy: 0.55, r: 0.27, ring: '#999', hinge: -1 }];
    const d = doors[Math.min(doors.length - 1, i)];
    return { cx: box.x + d.cx * box.w, cy: box.y + d.cy * box.h, r: d.r * box.w, ring: d.ring, hinge: d.hinge };
  }

  machineDoorOpen(m) { const a = this.machineAnim[m.id]; return !!a && a.t < a.dur; }

  // Top middle of a machine (or of its drum, for dryers): where its indicator floats.
  machineTop(m) {
    const box = this.unitBox(m);
    if (m.kind === 'washer') return { x: box.cx, y: box.y };
    const g = this.doorGeom(m, box);
    return { x: box.cx, y: g.cy - g.r * 1.9 };
  }

  // Where a running machine is in its cycle. Washers fill, wash (back and forth), drain and
  // spin; dryers tumble, then cool down.
  phase(m) {
    const p = m.dur ? m.t / m.dur : 0;
    if (m.kind === 'dryer') return p < 0.88 ? { name: 'tumble', water: 0, speed: 3.1, heat: 1 } : { name: 'cool', water: 0, speed: 1.8, heat: 1 - (p - 0.88) / 0.12 };
    if (p < 0.08) return { name: 'fill', water: p / 0.08 * 0.42, speed: 1.2 };
    if (p < 0.62) return { name: 'wash', water: 0.42, speed: 2.3 };
    if (p < 0.7) return { name: 'drain', water: 0.42 * (1 - (p - 0.62) / 0.08), speed: 1.5 };
    if (p < 0.96) return { name: 'spin', water: 0, speed: 3 + Math.min(1, (p - 0.7) / 0.06) * 15 };
    return { name: 'stop', water: 0, speed: 3 * (1 - (p - 0.96) / 0.04) };
  }

  // ------------------------------------------------------------------ drawing
  draw() {
    const r = this.r, c = r.ctx;
    r.clear('#1a1410');
    r.world();
    this.view.draw(r, this.t, G.time, G.weather, () => { this.tintOutdoors(r); r.world(); });
    this.glass.drawOutside(c);
    if (this.bg) c.drawImage(this.bg, 0, 0, this.worldW, 720);
    this.glass.draw(c);
    this.drawGlassDecal(r);
    for (const { d } of this.sortedDrawables()) d.draw(r, this.t);
    this.particles.draw(c);
    // lighting
    const night = nightness(G.time);
    const lights = [];
    const lampI = 0.3 + 0.7 * night;
    for (const lx of LAMPS) {
      lights.push({ x: lx, y: 160, r: 430, c: [255, 214, 160], i: lampI * 0.8 });
      lights.push({ x: lx, y: 640, r: 340, c: [255, 200, 150], i: lampI * 0.45, sy: 0.55 });
    }
    lights.push({ x: 1805, y: 380, r: 560, c: [215, 228, 255], i: 0.55 * (1 - night) });
    lights.push({ x: 2005, y: 400, r: 300, c: [215, 228, 255], i: 0.4 * (1 - night) });
    if (G.placed.lights) lights.push({ x: SHOP_SLOTS.lights.x, y: 190, r: 300, c: [255, 190, 110], i: 0.5 * night + 0.1 });
    if (G.placed.floor_l1 === 'floor_lamp') lights.push({ x: SHOP_SLOTS.floor_l1.x + 30, y: 470, r: 260, c: [255, 196, 120], i: 0.4 + 0.4 * night });
    for (const s of ['sill', 'sill2']) if (G.placed[s] === 'lantern') lights.push({ x: SHOP_SLOTS[s].x, y: 510, r: 200, c: [255, 180, 90], i: 0.5 * night });
    if (this.powerOut) { lights.length = 0; for (const s of ['sill', 'sill2', 'counter_top']) lights.push({ x: SHOP_SLOTS[s].x, y: 500, r: 360, c: [255, 170, 80], i: 0.9 }); }
    r.applyLighting(this.ambientColor(), lights, r.cam.x);
    // bloom under the lamp shades
    if (!this.powerOut) for (const lx of LAMPS) r.glow(lx, 150, 70, [255, 225, 160], 0.35 * lampI);
    if (G.placed.lights) this.drawStringGlow(r, night);
    if (this.powerOut) r.glow(SHOP_SLOTS.sill.x, 505, 90, [255, 190, 100], 0.4);
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

  // The shop's name painted on the big window (seen from inside, so mirrored), and the sign on
  // the door glass.
  drawGlassDecal(r) {
    const c = r.ctx;
    c.save();
    c.translate(1805, 322);
    c.scale(-1, 1);
    c.font = '44px Pacifico';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(240,210,150,0.6)';
    c.strokeStyle = 'rgba(80,40,20,0.35)'; c.lineWidth = 3;
    c.strokeText(G.shop, 0, 0);
    c.fillText(G.shop, 0, 0);
    c.font = '700 15px Fraunces';
    c.fillStyle = 'rgba(240,220,180,0.55)';
    c.fillText('LAUNDROMAT · WASH & FOLD', 0, 30);
    c.restore();
    // the sign hanging in the door glass, turned to OPEN during business hours
    r.sprite(this.shiftRunning ? 'sign_open' : 'sign_closed', 2005, 272, { h: 50, ay: 0, rot: Math.sin(this.t * 1.7) * 0.015 });
  }

  drawStringGlow(r, night) {
    const pos = SHOP_SLOTS.lights;
    for (let i = 0; i < 6; i++) {
      const x = pos.x - 104 + i * 41.6, y = pos.y + 30 + Math.sin((i / 5) * Math.PI) * 22;
      r.glow(x, y, 24, [255, 200, 120], 0.25 + 0.4 * night * (0.85 + 0.15 * Math.sin(this.t * 2 + i)));
    }
  }

  // ------------------------------------------------------------------ machines
  drawWasherSlot(r, i, x) {
    const c = r.ctx;
    const m = L.washers().find(q => q.slot === i);
    if (!m) {
      // empty bay: the hook-ups wait over a dusty outline
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#5a4a3a'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.strokeRect(x - 60, FLOOR - WASHER_H + 6, 120, WASHER_H - 8); c.setLineDash([]); c.restore();
      this.drawAddBadge(r, x, FLOOR - WASHER_H / 2);
      return;
    }
    this.drawMachine(r, m, [m]);
  }

  drawDryerUnit(r, u, x) {
    const c = r.ctx;
    const drums = L.dryers().filter(d => Math.floor(d.slot / 2) === u);
    if (!drums.length) {
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#5a4a3a'; c.setLineDash([6, 6]); c.lineWidth = 2;
      c.strokeRect(x - 52, FLOOR - DRYER_H + 6, 104, DRYER_H - 8); c.setLineDash([]); c.restore();
      this.drawAddBadge(r, x, FLOOR - DRYER_H / 2);
      return;
    }
    const box = this.drawMachine(r, drums[0], drums);
    if (!box) return;
    // a lint bunny peeks out of the lint trap when the screens are full
    if (drums.some(d => d.lint >= 5 && !d.broken)) {
      const wob = Math.sin(this.t * 2.2 + u) * 0.05;
      r.sprite('scn_lint', box.x + box.w * 0.72, box.y + box.h * 0.95, { h: 30, rot: wob });
    }
    // the cat naps on warm dryers some days
    if (u === 0 && G.flags.cat_in_shop && drums.some(d => d.state === 'running' && !d.broken)) r.sprite('item_cat_bed', box.cx, box.y + 4, { h: 46 });
  }

  // One washer, or one dryer tower with its two drums. The drums are drawn first, behind the
  // machine (they show through the glass). While you load or unload, the door is open: the
  // open-door art takes over (for a dryer tower, just the half with that drum).
  drawMachine(r, m, drums) {
    const c = r.ctx;
    const box = this.unitBox(m);
    const running = drums.some(d => d.state === 'running' && !d.broken);
    let shake = 0;
    if (running) {
      const ph = this.phase(drums.find(d => d.state === 'running') || m);
      const amp = ph.name === 'spin' ? 1.5 : m.kind === 'washer' ? 0.6 : 0.45;
      shake = Math.sin(this.t * (ph.name === 'spin' ? 55 : 30) + m.slot) * amp;
    }
    c.save(); c.globalAlpha = 0.28; c.fillStyle = '#1a120c';
    c.beginPath(); c.ellipse(box.cx, FLOOR + 1, box.w * 0.52, 5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.save(); c.translate(shake, 0);
    const open = drums.map(d => this.machineDoorOpen(d) && !!(box.art && box.art.open));
    drums.forEach((d, i) => this.drawDrum(r, d, this.doorGeom(d, box, open[i])));
    const art = box.art && box.art.open;
    const openArt = art && { x: box.x + art.dx * box.w, w: art.w * box.w };
    if (!open.some(Boolean)) r.sprite(box.sprite, box.cx, FLOOR, { h: box.h });
    else if (m.kind === 'washer') r.sprite(art.sprite, openArt.x + openArt.w / 2, FLOOR, { h: box.h });
    else {
      // a tower: each half shows its own door, open or shut
      const mid = box.y + box.h * 0.465;
      drums.forEach((d, i) => {
        const top = d.slot % 2 === 0;
        c.save();
        c.beginPath(); c.rect(box.x - 40, top ? box.y - 10 : mid, box.w + 80, top ? mid - box.y + 10 : FLOOR - mid + 10); c.clip();
        if (open[i]) r.sprite(art.sprite, openArt.x + openArt.w / 2, FLOOR, { h: box.h });
        else r.sprite(box.sprite, box.cx, FLOOR, { h: box.h });
        c.restore();
      });
    }
    drums.forEach((d, i) => {
      const g = this.doorGeom(d, box, open[i]);
      if (!open[i]) this.drawGlass(c, g, d);
      if (d.broken) r.sprite('scn_out_of_order', g.cx - 2, g.cy + g.r * 0.55, { h: g.r * 1.2, rot: -0.08 });
    });
    c.restore();
    return box;
  }

  // Inside a drum: the steel drum turning, the laundry tumbling (or plastered to the wall while
  // it spins), water sloshing with suds on top while a washer fills and washes.
  drawDrum(r, m, g) {
    const c = r.ctx;
    const R = g.r * 1.06;
    const running = m.state === 'running' && !m.broken;
    const has = !!m.load;
    const ph = running ? this.phase(m) : { name: 'still', water: 0, speed: 0, heat: 0 };
    const d = this.drum[m.id] || { ang: 0 };
    const ang = d.ang;
    c.save();
    c.beginPath(); c.arc(g.cx, g.cy, R, 0, Math.PI * 2); c.clip();
    const dryer = m.kind === 'dryer';
    // the steel drum (sprites/drum_interior), turning; a little darker, it's inside the machine
    c.fillStyle = '#1d2429'; c.fillRect(g.cx - R, g.cy - R, R * 2, R * 2);
    r.sprite('drum_interior', g.cx, g.cy, { w: R * 2.3, ay: 0.5, rot: ang, alpha: 0.9 });
    // laundry: crumpled bundles, in the colours of the load
    if (has) {
      const o = m.load !== 'self' ? L.order(m.load) : null;
      const col = (o && o.color) || (m.selfColor || (m.selfColor = rand.pick(LAUNDRY_COLORS)));
      const load = bundlesFor(col);
      const size = R * (dryer ? 0.86 : 0.78);
      if (ph.name === 'spin') {
        // pressed to the wall by the spin, a blur going round
        for (let i = 0; i < load.length; i++) {
          const a = ang + i * Math.PI * 2 / load.length;
          for (const [lag, al] of [[0.28, 0.25], [0.14, 0.45], [0, 1]]) {
            c.globalAlpha = al;
            r.sprite(load[i], g.cx + Math.cos(a - lag) * R * 0.58, g.cy + Math.sin(a - lag) * R * 0.58, { w: size * 0.8, ay: 0.5, rot: a - lag + Math.PI / 2 });
          }
        }
        c.globalAlpha = 1;
      } else if (running) {
        // tumbling: carried up the wall by the lifters, then dropping back down
        for (let i = 0; i < load.length; i++) {
          const a = ang + i * 1.4;
          const lift = (Math.sin(a) + 1) / 2;
          const fall = Math.max(0, Math.sin(a * 2 + i)) * 0.18;
          const bx = g.cx + Math.cos(a) * R * 0.42;
          const by = g.cy + R * 0.4 - lift * R * (dryer ? 0.9 : 0.66) + fall * R;
          r.sprite(load[i], bx, by, { w: size, ay: 0.5, rot: a * 0.7 });
        }
      } else {
        // resting in a heap at the bottom
        load.slice(0, 3).forEach((b, i) => r.sprite(b, g.cx + (i - 1) * R * 0.46, g.cy + R * 0.98, { w: size, rot: (i - 1) * 0.25 }));
      }
    }
    // water and suds
    if (ph.water > 0) {
      const level = g.cy + R - ph.water * R * 2;
      c.fillStyle = 'rgba(120,172,205,0.5)';
      c.beginPath(); c.moveTo(g.cx - R, g.cy + R);
      for (let x = -R; x <= R; x += R / 8) c.lineTo(g.cx + x, level + Math.sin(this.t * 5 + x * 0.12 + ang) * R * 0.06 * (ph.name === 'wash' ? 1.6 : 1));
      c.lineTo(g.cx + R, g.cy + R); c.closePath(); c.fill();
      c.fillStyle = 'rgba(245,250,252,0.85)';
      for (let k = 0; k < 7; k++) {
        const x = g.cx - R * 0.8 + k * R * 0.27 + Math.sin(this.t * 3 + k) * 2;
        c.beginPath(); c.arc(x, level + Math.sin(this.t * 5 + k) * 2, R * (0.07 + (k % 3) * 0.03), 0, Math.PI * 2); c.fill();
      }
    }
    // a dryer's warm glow
    if (dryer && running && ph.heat > 0) {
      c.fillStyle = `rgba(255,150,70,${(0.16 + 0.06 * Math.sin(this.t * 3 + m.slot)) * ph.heat})`;
      c.fillRect(g.cx - R, g.cy - R, R * 2, R * 2);
    }
    c.restore();
  }

  // The closed door's glass: a faint tint and a curved highlight (a little steam when washing).
  drawGlass(c, g, m) {
    c.save();
    c.beginPath(); c.arc(g.cx, g.cy, g.r, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(200,225,240,0.12)'; c.fillRect(g.cx - g.r, g.cy - g.r, g.r * 2, g.r * 2);
    if (m.kind === 'washer' && m.state === 'running' && !m.broken) {
      c.fillStyle = 'rgba(235,242,248,0.16)';
      c.fillRect(g.cx - g.r, g.cy - g.r, g.r * 2, g.r * 0.9);
    }
    c.restore();
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = g.r * 0.09; c.lineCap = 'round';
    c.beginPath(); c.arc(g.cx, g.cy, g.r * 0.74, Math.PI * 1.1, Math.PI * 1.42); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath(); c.arc(g.cx - g.r * 0.18, g.cy - g.r * 0.62, g.r * 0.06, 0, Math.PI * 2); c.fill();
    c.restore();
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

  // ------------------------------------------------------------------ furniture
  drawShelf(r) {
    const box = r.sprite('furn_tall_shelf', SHELF.x, SHELF.base, { h: SHELF.h });
    if (!box) return;
    if (G.upgrades.includes('wifi')) {
      r.sprite('upg_wifi', SHELF.x + 50, box.y + 2, { h: 30 });
      if (Math.sin(this.t * 3) > 0.6) r.glow(SHELF.x + 56, box.y - 6, 6, [140, 255, 150], 0.5);
    }
    // ready orders wait on the three boards, three to a board
    const ready = G.shelf.map(id => L.order(id)).filter(Boolean);
    ready.slice(0, 9).forEach((o, i) => {
      const board = SHELF.boards[2 - Math.floor(i / 3)];
      const x = box.x + box.w * (0.24 + (i % 3) * 0.26);
      const y = box.y + box.h * board + 1;
      const folded = parseInt(o.id.slice(1), 10) % 2 ? 'scn_towels' : 'scn_folded';
      r.sprite(o.service === 'wash_dry' ? (BAGS[o.bag] || 'scn_bag_drawstring') : folded, x, y, { h: o.service === 'wash_dry' ? 38 : 26 });
    });
  }

  drawCounter(r) {
    const box = r.sprite('furn_counter', COUNTER.x, COUNTER.base, { h: COUNTER.h });
    if (!box) return;
    const top = box.y + box.h * COUNTER.top + 1;
    this.counterTop = top;
    r.sprite('scn_bell', box.x + box.w - 20, top, { h: 20 });
    const waiting = G.orders.filter(o => o.stage === 'counter');
    waiting.slice(0, 3).forEach((o, i) => {
      r.sprite(BAGS[o.bag] || 'scn_bag_drawstring', COUNTER.x + 18 + i * 38 - (Math.min(3, waiting.length) - 1) * 19, top, { h: 56 });
    });
  }

  drawFold(r) {
    if (this.mode === 'fold') {
      this.foldAnim = (this.foldAnim || 0) + 1 / 60;
      const bob = Math.sin(this.foldAnim * 6) * 1.5;
      r.sprite('player_fold_clean', FOLD.x, FOLD.base - 18 + bob * 0.3, { h: 499 * PK });
    }
    const box = r.sprite('prop_fold_table', FOLD.x, FOLD.base, { h: FOLD.h });
    // a neat stack of what's been folded today
    if (box && G.today && G.today.orders) r.sprite('scn_folded', box.x + box.w * 0.8, box.y + box.h * FOLD.top + 1, { h: 20 });
  }

  // The seat under the window, and you on it while you rest.
  drawBench(r) {
    const st = this.seat();
    r.sprite(st.s, BENCH.x, BENCH.base, { h: st.h });
    if (this.mode === 'sit') {
      const top = BENCH.base - st.h * (1 - st.top);
      r.sprite('player_sit_clean', BENCH.x, top + SIT_H * SIT_SEAT, { h: SIT_H });
    }
  }

  drawSupply(r) {
    const box = r.sprite('decor_wall_shelf', SUPPLY.x, SUPPLY.y, { w: SUPPLY.w });
    if (!box) return;
    const top = box.y + box.h * SUPPLY.boards[0] + 1, low = box.y + box.h * SUPPLY.boards[1] + 1;
    const n = Math.ceil(G.inv.detergent || 0);
    const jugs = Math.min(4, Math.ceil(n / 5));
    for (let i = 0; i < jugs; i++) r.sprite('scn_detergent', box.x + 20 + i * 24, top, { h: 30 });
    if ((G.inv.softener || 0) > 0) r.sprite('scn_softener', box.x + 18, low, { h: 28 });
    if ((G.inv.parts || 0) > 0) r.sprite('scn_coin_tray', box.x + 56, low, { h: 12 });
    if ((G.inv.tea || 0) > 0) r.sprite('scn_teacup', box.x + 94, low, { h: 16 });
  }

  // The wall clock tells the game's time: an hour hand and a minute hand, nothing else.
  drawClock(r) {
    const x = CLOCK.x, y = CLOCK.y, s = CLOCK.s, t = G.time;
    r.sprite('prop_clock', x, y, { h: s, ay: 0.5 });
    const hA = ((t / 60) % 12) / 12 * Math.PI * 2, mA = (t % 60) / 60 * Math.PI * 2;
    r.sprite('clock_hand_hour', x, y, { h: s * 0.25, ax: 0.488, ay: 0.839, rot: hA });
    r.sprite('clock_hand_minute', x, y, { h: s * 0.38, ax: 0.492, ay: 0.881, rot: mA });
  }

  drawPriceBoard(r) {
    const c = r.ctx;
    const mul = G.policies.prices === 'low' ? 0.85 : G.policies.prices === 'high' ? 1.2 : 1;
    c.save();
    c.fillStyle = 'rgba(240,236,220,0.85)';
    c.font = '700 17px Caveat'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('Self-serve wash  $3.50', 276, 200);
    c.fillText('Dry (40 min)  $2.50', 276, 224);
    c.fillText(`Wash & fold  $${Math.round(16 * mul)}`, 276, 248);
    c.fillText(`Rush  $${Math.round(24 * mul)}`, 276, 272);
    if (G.policies.pwyc) { c.fillStyle = 'rgba(240,200,120,0.95)'; c.fillText('Sundays: pay what you can ♥', 276, 294); }
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
    if (slot === 'seat') return;                    // drawn as the bench (drawBench)
    if (slot === 'lounge_table') {
      const t = r.sprite('street_cafe_table', pos.x, pos.y, { h: LOUNGE_H });
      y = t ? t.y + t.h * 0.022 + 1 : pos.y - LOUNGE_H;
    }
    if (slot === 'hang1' || slot === 'hang2') {
      const sway = Math.sin(this.t * 1.3 + pos.x) * 0.02;
      const s = r.size(d.sprite, opt);
      r.sprite(d.sprite, pos.x, y - s.h, { h: s.h, ay: 0, rot: sway });
      return;
    }
    if (d.flat) { r.sprite(d.sprite, pos.x, y, { w: d.w, alpha: 0.96 }); return; }
    r.sprite(d.sprite, pos.x, y, opt);
    if (d.fn === 'tea' && Math.random() < 0.02) this.particles.emit('steam', pos.x - 10, y - (d.h || 50), 1);
  }

  // Puddles lie flat on the tiles; socks and lint bunnies turn up on the floor.
  drawFloorStuff(r) {
    for (const p of L.Sim.puddles) r.sprite(p.size > 0.95 ? 'scn_puddle_l' : 'scn_puddle_s', p.x, p.y + 6, { w: 120 * p.size, alpha: 0.92 });
    for (const l of L.Sim.litter) {
      if (l.kind === 'sock') r.sprite('scn_sock', l.x, l.y, { h: 28, rot: 0.9 });
      else r.sprite('scn_lint', l.x, l.y, { h: 30, rot: Math.sin(this.t * 1.5 + l.id) * 0.04 });
    }
  }

  // Where a machine's progress ring or status bubble floats: over a washer; beside a dryer drum.
  indicatorAt(m) {
    if (m.kind === 'washer') { const p = this.machineTop(m); return { x: p.x, y: p.y - 24 }; }
    const g = this.doorGeom(m);
    return { x: g.cx + g.r + 22, y: g.cy - g.r * 0.35 };
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
      const { x, y } = this.indicatorAt(m);
      if (m.broken) bubble(x, y, 'icon_wrench', '#f4c9b8', null, true);
      else if (m.state === 'running') { if (m.load !== 'self' || true) ring(x, y, m.t / m.dur, m.load === 'self' ? 'icon_coin' : (m.kind === 'washer' ? 'icon_washer' : 'icon_dryer')); }
      else if (m.state === 'done' && m.load !== 'self') bubble(x, y, null, '#e8d38a', '✓', true);
      else if (m.kind === 'dryer' && m.lint >= 5) bubble(x, y, 'icon_dryer', '#ddd7cc', null, false);
    }
    // counter bell
    if (G.orders.some(o => o.stage === 'counter')) bubble(COUNTER.x + 10, COUNTER.base - COUNTER.h - 76, 'icon_basket', '#f7ecd4', null, true);
    // hints for carried laundry
    const o = this.carried()[0];
    if (o) {
      const step = L.nextStep(o);
      const hint = (x, y) => { c.save(); c.fillStyle = `rgba(232,176,78,${0.55 + 0.35 * Math.sin(t * 6)})`; c.beginPath(); c.moveTo(x - 12, y - 16); c.lineTo(x + 12, y - 16); c.lineTo(x, y); c.closePath(); c.fill(); c.strokeStyle = '#3a2a1e'; c.lineWidth = 1.5; c.stroke(); c.restore(); };
      // free machines of the right kind, or (hands full) finished ones you can swap with
      const full = !this.canCarryMore();
      const ok = m => L.isFree(m) || (full && m.state === 'done' && m.load && m.load !== 'self' && !m.broken);
      if (step === 'wash') for (const m of L.washers()) { if (ok(m)) { const p = this.machineTop(m); hint(p.x, p.y - 8 + Math.sin(t * 5) * 4); } }
      if (step === 'dry') for (const m of L.dryers()) { if (ok(m)) { const g = this.doorGeom(m); hint(g.cx - g.r - 16, g.cy + Math.sin(t * 5) * 4); } }
      if (step === 'fold') hint(FOLD.x, FOLD.base - FOLD.h - 12 + Math.sin(t * 5) * 4);
      if (step === 'shelf') hint(SHELF.x, SHELF.base - SHELF.h - 10 + Math.sin(t * 5) * 4);
      // what the player is carrying
      const icon = step === 'wash' ? 'icon_washer' : step === 'dry' ? 'icon_dryer' : step === 'fold' ? 'icon_towels' : 'icon_basket';
      if (this.player.visible) bubble(this.player.x + 30, this.player.y - 290, icon, '#f7ecd4', null, false);
    }
    // puddle sparkle
    for (const p of L.Sim.puddles) if (Math.sin(t * 3 + p.id) > 0.95) this.particles.emit('sparkle', p.x + 20, p.y - 5, 1, { color: '#dff0ff' });
  }
}
