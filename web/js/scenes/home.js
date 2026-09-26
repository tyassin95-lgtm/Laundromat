// Rosa's flat above the shop: mornings, hobbies, Biscuit, and bed.
import { Scene, nightness } from './scene.js';
import { Actor } from '../engine/actor.js';
import { Assets } from '../engine/assets.js';
import { Sound } from '../engine/audio.js';
import { GlassRain } from '../engine/particles.js';
import { clamp, rand } from '../engine/util.js';
import { G } from '../game/state.js';
import { HOME_SLOTS, DECOR } from '../data/decor.js';
import { UI } from '../ui/ui.js';
import { tweens } from '../engine/tween.js';
import { RoofView } from './views.js';

// The flat is flat 2D too (bg/home.webp, 1600 x 720 world px): the back wall meets the floor at
// y 612 and people walk in WALK. Painted in: the door (25-145), the kitchenette (counter top at
// y 454, hob 240-338), the window (glass 554-891 x 97-407) over the window seat (top at y 460,
// cushions at 540-627 and 815-902) and the shelf of books (978-1190, y 327). The furniture on the
// right is sprites: the desk under the books, its chair, and the bed against the right wall.
const WALK = [620, 700];
const PANES = [
  { x: 555, y: 97, w: 102, h: 148 }, { x: 668, y: 97, w: 106, h: 148 }, { x: 786, y: 97, w: 105, h: 148 },
  { x: 554, y: 256, w: 103, h: 151 }, { x: 668, y: 256, w: 105, h: 151 }, { x: 786, y: 256, w: 105, h: 151 },
];
const WIN = { x: 554, y: 97, w: 337, h: 310 };
const COUNTER_TOP = 454;
const SEAT_TOP = 460;
const DESK = { x: 1085, base: 628, h: 120 };
const DESK_TOP = DESK.base - DESK.h * (1 - 0.023) + 1;   // where things stand on the desk
const CHAIR = { x: 1004, base: 652, h: 150 };
const BED = { x: 1405, base: 648, h: 150 };
const BED_TOP = BED.base - BED.h * (1 - 0.358);          // top of the mattress (sit on the edge)
const LANTERN = { x: 722, y: SEAT_TOP };
const DOOR = { x: 30, y: 240, w: 112, h: 372, at: [86, 640] };

export class HomeScene extends Scene {
  constructor(app) {
    super(app, { worldW: 1600, interior: true, walkBand: WALK });
    this.name = 'home';
    this.player = new Actor({ id: 'me', player: true, h: 262, speed: 300 });
    this.glass = new GlassRain(PANES);
    this.view = new RoofView({ x: 500, y: 100, w: 560, h: 480, k: 0.72, follow: 0.2 });
  }

  async enter(opts = {}) {
    [this.bg] = await Promise.all([Assets.bg('home'), this.view.load()]);
    this.actors = [this.player];
    this.player.visible = true;
    this.player.carrying = false;
    this.player.stop();
    this.asleep = 0;
    if (opts.from === 'bed') {
      // the morning starts in bed; she gets up a moment later
      this.player.x = BED.x - 140; this.player.y = 664; this.player.facing = -1;
      this.player.visible = false;
      this.asleep = 1;
      this.wakeUp();
    } else { [this.player.x, this.player.y] = DOOR.at; this.player.facing = 1; }
    if (!G.placed.h_table) G.placed.h_table = 'record_player';
    if (!G.placed.h_shelf) G.placed.h_shelf = 'pothos';
    this.buildEntities();
    this.fitView();
    this.follow(this.player, 0, true);
    this.updateSound();
    this.app.hud.setMode('home');
    this.app.day.sceneMusic();
    // the after-work goal ("…or go upstairs to rest") no longer fits once you are upstairs
    if ((G.phase === 'evening' || G.phase === 'night') && /upstairs/.test(G.goal || '') && !/back door/.test(G.goal || '')) {
      this.app.hud.setGoal('A quiet evening at home. Sketch, knit, read by the window, or sleep when you\'re ready.');
    }
  }

  async wakeUp() {
    await tweens.wait(0.9);
    if (this.app.scene !== this || !this.asleep) return;
    this.bedFade = 1;
    this.asleep = 0;
    this.player.setPose('stretch', 1.6);
    await this.player.appear();
  }

  // Into bed: she vanishes and the bed shows her asleep under the quilt.
  async tuckIn() {
    const p = this.player;
    await Promise.race([p.vanish(), tweens.wait(0.7)]);
    p.stop(); p.visible = false;
    this.asleep = 1;
    this.bedFade = 1;
    this.particles.emit('zzz', BED.x + 120, BED_TOP - 40, 2);
    await tweens.wait(0.9);
  }

  updateSound() {
    const rain = G.weather === 'rain' ? 0.45 : G.weather === 'storm' ? 0.8 : 0;
    const layers = {};
    if (rain) layers.amb_rain_in = rain;
    if (nightness(G.time) < 0.5 && !rain) layers.amb_birds = 0.12;
    layers.amb_city = 0.08;
    if (G.record) layers.amb_vinyl = 0.18;
    Sound.setAmbience(layers, 1.2);
  }

  buildEntities() {
    this.ents = [];
    const E = e => { this.ents.push(e); return e; };
    const act = (id, x, y, face) => () => this.walkThen(x, y, face, () => this.app.activities.run(id, { loc: 'home' }));
    // the desk under the books, with the sketchbook and pencils; Rosa's journal at the end
    E({ id: 'desk', z: DESK.base, draw: r => { r.sprite('furn_desk', DESK.x, DESK.base, { h: DESK.h }); r.sprite('scn_pencil_cup', DESK.x + 76, DESK_TOP, { h: 38 }); r.sprite('scn_sketchbook', DESK.x - 72, DESK_TOP, { h: 28 }); },
      hit: { x: DESK.x - 98, y: DESK.base - DESK.h, w: 150, h: DESK.h }, tap: act('sketch', DESK.x - 60, 648, 1) });
    E({ id: 'journal', z: DESK.base + 1, draw: r => r.sprite('scn_journal', DESK.x + 44, DESK_TOP, { h: 28 }),
      hit: { x: DESK.x + 26, y: DESK_TOP - 34, w: 40, h: 38 }, tap: act('rosa_journal', DESK.x + 40, 652, 1) });
    E({ id: 'chair', z: CHAIR.base, draw: r => r.sprite('furn_chair', CHAIR.x, CHAIR.base, { h: CHAIR.h }) });
    // Biscuit's bed in front of the window seat; the yarn basket at the foot of the bed
    E({ id: 'cat', z: 700, draw: r => this.drawCat(r), hit: { x: 858, y: 648, w: 92, h: 56 }, tap: act('pet_cat', 820, 690, 1) });
    E({ id: 'yarn', z: 700, draw: r => r.sprite('scn_yarn_basket', 1196, 702, { h: 50 }), hit: { x: 1170, y: 650, w: 56, h: 54 }, tap: act('knit', BED.x - 120, BED.base + 2, 1) });
    // the kitchenette: kettle on the hob, a mug by the sink
    E({ id: 'kettle', z: COUNTER_TOP, draw: r => r.sprite('decor_kettle', 292, COUNTER_TOP, { h: 44 }), hit: { x: 262, y: 400, w: 64, h: 56 }, tap: act('tea', 300, 632, 1) });
    E({ id: 'mug', z: COUNTER_TOP, draw: r => r.sprite('scn_mug', 362, COUNTER_TOP, { h: 22 }) });
    E({ id: 'lantern', z: SEAT_TOP, draw: r => r.sprite('item_lantern', LANTERN.x, LANTERN.y, { h: 48 }) });
    E({ id: 'bed', z: BED.base, draw: r => this.drawBed(r), hit: { x: BED.x - 168, y: BED.base - BED.h, w: 336, h: BED.h }, tap: act('sleep', BED.x - 140, 664, 1) });
    E({ id: 'window', z: 50, hit: WIN, tap: act('window', 722, 640, 1) });
    E({ id: 'seat', z: 430, hit: { x: 515, y: 420, w: 410, h: 70 }, tap: act('read', 722, 646, 1) });
    E({ id: 'door', z: 60, hit: DOOR, tap: act('door', DOOR.at[0], DOOR.at[1], -1) });
    if (G.flags.has_camera) E({ id: 'camera', z: SEAT_TOP, draw: r => r.sprite('scn_camera', 668, SEAT_TOP, { h: 26 }), hit: { x: 648, y: 428, w: 42, h: 34 }, tap: () => UI.toast('Rosa\'s old camera. Take it out in the evenings — photo spots are marked with a dot.', 'item_camera') });
    // decor slots
    for (const [slot, pos] of Object.entries(HOME_SLOTS)) {
      E({ id: 'slot:' + slot, z: slot === 'h_rug' ? 619 : slot === 'h_table' ? DESK.base + 1 : slot === 'h_shelf' ? SEAT_TOP : pos.y, draw: r => this.drawSlot(r, slot, pos),
        hit: () => this.slotHit(slot, pos), tap: () => this.tapSlot(slot) });
    }
  }

  slotHit(slot, pos) {
    const id = G.placed[slot];
    if (!id) return null;
    const d = DECOR[id];
    const im = Assets.img(d.sprite); if (!im) return null;
    const k = d.h ? d.h / im.naturalHeight : d.w / im.naturalWidth;
    const w = im.naturalWidth * k, h = im.naturalHeight * k;
    let y = pos.y - h * (d.ay ?? 1);
    if (slot === 'h_table') y = DESK_TOP - h;
    if (slot === 'h_hang') y = 40;
    return { x: pos.x - w / 2, y, w, h };
  }

  tapSlot(slot) {
    const id = G.placed[slot];
    if (!id) return;
    if (id === 'record_player') { this.walkThen(DESK.x - 60, 648, 1, () => this.app.menus.recordPicker('home')); return; }
    if (id === 'pothos' || id === 'cat_planter' || id === 'hanging_plant' || id === 'potted_plant') { this.walkThen(clamp(HOME_SLOTS[slot].x - 60, 60, 1540), 640, 1, () => this.app.activities.run('water', { loc: 'home' })); return; }
    const d = DECOR[id]; UI.toast(`${d.name} — ${d.blurb}`);
  }

  drawSlot(r, slot, pos) {
    const id = G.placed[slot];
    if (!id) return;
    const d = DECOR[id]; if (!d) return;
    if (slot === 'h_table') { r.sprite(d.sprite, pos.x, DESK_TOP, d.h ? { h: d.h } : { w: d.w }); return; }
    if (slot === 'h_hang') { r.sprite(d.sprite, pos.x, 40, { h: d.h, ay: 0, rot: Math.sin(this.t * 1.1) * 0.02 }); return; }
    if (d.flat) { r.sprite(d.sprite, pos.x, pos.y, { w: d.w, alpha: 0.96 }); return; }
    const o = d.h ? { h: d.h } : { w: d.w };
    if (d.ay !== undefined) o.ay = d.ay;
    r.sprite(d.sprite, pos.x, pos.y, o);
  }

  drawBed(r) {
    // cross-fade between the made bed and the one she's asleep in
    const f = this.bedFade || 0;
    const now = this.asleep ? 'furn_bed_sleep' : 'furn_bed', before = this.asleep ? 'furn_bed' : 'furn_bed_sleep';
    if (f > 0.01) r.sprite(before, BED.x, BED.base, { h: BED.h });
    r.ctx.save(); r.ctx.globalAlpha = 1 - f; r.sprite(now, BED.x, BED.base, { h: BED.h }); r.ctx.restore();
    if (this.asleep && f < 0.5 && Math.random() < 0.01) this.particles.emit('zzz', BED.x + 120, BED_TOP - 40, 1);
  }

  drawCat(r) {
    const breathe = 1 + Math.sin(this.t * 1.6) * 0.012;
    r.sprite('item_cat_bed', 904, 702, { h: 56, sy: breathe });
    if (Math.random() < 0.004) this.particles.emit('zzz', 918, 650, 1);
  }

  walkThen(x, y, face, fn) {
    this.player.walkTo(clamp(x, 40, this.worldW - 40), clamp(y, this.walkBand[0], this.walkBand[1]), face).then(ok => { if (!ok) return; if (face) this.player.facing = face; fn(); });
  }

  onTap(px, py) {
    const w = this.r.toWorld(px, py);
    const e = this.hitTest(w.x, w.y);
    if (e) { e.tap(w.x, w.y); return; }
    if (w.y > 560) this.player.walkTo(clamp(w.x, 40, this.worldW - 40), clamp(w.y, this.walkBand[0], this.walkBand[1]));
  }

  update(dt) {
    super.update(dt);
    const paused = this.app.paused();
    for (const a of this.actors) a.update(dt, paused);
    this.particles.update(dt);
    this.glass.intensity = G.weather === 'rain' ? 0.8 : G.weather === 'storm' ? 1 : 0;
    this.glass.update(dt);
    this.view.update(dt, G.time, G.weather);
    if (this.bedFade) this.bedFade = Math.max(0, this.bedFade - dt * 2.5);
    this.fitView();
    this.applyFatigue(300, null);
    this.follow(this.player, dt);
    if (G.record && G.placed.h_table === 'record_player' && Math.random() < dt * 0.5) this.particles.emit('note', HOME_SLOTS.h_table.x, DESK_TOP - 70, 1);
  }

  draw() {
    const r = this.r, c = r.ctx;
    const night = nightness(G.time);
    r.clear('#1a1410');
    r.world();
    this.view.draw(r, this.t, G.time, G.weather, () => { this.tintOutdoors(r); r.world(); });
    this.glass.drawOutside(c);
    if (this.bg) c.drawImage(this.bg, 0, 0, this.worldW, 720);
    this.glass.draw(c);
    for (const { d } of this.sortedDrawables()) d.draw(r, this.t);
    this.particles.draw(c);
    const lamp = 0.25 + 0.75 * night;
    const lights = [
      { x: 722, y: 150, r: 520, c: [255, 210, 150], i: 0.55 * lamp },
      { x: 722, y: 640, r: 420, c: [255, 200, 140], i: 0.35 * lamp, sy: 0.5 },
      { x: 722, y: 260, r: 560, c: [215, 228, 255], i: 0.6 * (1 - night) },
      { x: LANTERN.x, y: LANTERN.y - 24, r: 160, c: [255, 180, 90], i: 0.45 * night },
    ];
    if (G.placed.h_lights) lights.push({ x: HOME_SLOTS.h_lights.x, y: 120, r: 300, c: [255, 190, 110], i: 0.5 * night + 0.1 });
    r.applyLighting(this.ambient(), lights, r.cam.x);
    r.glow(722, 138, 60, [255, 220, 150], 0.3 * lamp);
    r.glow(LANTERN.x, LANTERN.y - 26, 40, [255, 190, 100], 0.4 * night);
    for (const a of this.actors) a.drawEmote(r, this.t);
    r.vignette(0.32);
  }
}
