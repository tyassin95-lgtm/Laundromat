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

const WIN = { x: 480, y: 96, w: 400, h: 304 };

export class HomeScene extends Scene {
  constructor(app) {
    super(app, { worldW: 1400, interior: true, walkBand: [548, 690] });
    this.name = 'home';
    this.player = new Actor({ id: 'me', player: true, h: 262, speed: 300 });
    this.glass = new GlassRain([WIN]);
    this.roofs = Array.from({ length: 9 }, (_, i) => ({ x: WIN.x - 40 + i * 58 + rand() * 20, w: 50 + rand() * 50, h: 60 + rand() * 90, chim: rand() < 0.5, lit: rand() < 0.6 }));
  }

  async enter(opts = {}) {
    this.bg = await Assets.bg('home');
    this.actors = [this.player];
    this.player.visible = true;
    this.player.carrying = false;
    this.player.stop();
    if (opts.from === 'bed') { this.player.x = 1110; this.player.y = 648; this.player.facing = -1; this.player.setPose('stretch', 1.4); }
    else { this.player.x = 70; this.player.y = 580; this.player.facing = 1; }
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
    // furniture & props
    E({ id: 'desk', z: 610, draw: r => { r.sprite('furn_work_table', 1062, 612, { h: 152 }); r.sprite('item_pencil_cup', 1120, 486, { h: 46 }); r.sprite('item_sketchbook', 1010, 492, { h: 34, rot: -0.1 }); if (!G.placed.h_table) r.sprite('item_journal', 1070, 494, { h: 30 }); },
      hit: { x: 980, y: 460, w: 90, h: 150 }, tap: act('sketch', 980, 640, 1) });
    E({ id: 'journal', z: 612, draw: r => r.sprite('item_journal', 1128, 612, { h: 40, rot: 0.2 }), hit: { x: 1100, y: 570, w: 60, h: 46 }, tap: act('rosa_journal', 1090, 650, 1) });
    E({ id: 'stool', z: 640, draw: r => r.sprite('furn_stool', 990, 642, { h: 128 }) });
    E({ id: 'cat', z: 692, draw: r => this.drawCat(r), hit: { x: 830, y: 630, w: 110, h: 64 }, tap: act('pet_cat', 760, 676, 1) });
    E({ id: 'yarn', z: 662, draw: r => r.sprite('item_yarn_basket', 572, 664, { h: 62 }), hit: { x: 535, y: 600, w: 80, h: 66 }, tap: act('knit', 520, 680, 1) });
    E({ id: 'kettle', z: 300, draw: r => r.sprite('decor_kettle', 250, 296, { h: 54 }), hit: { x: 215, y: 236, w: 80, h: 64 }, tap: act('tea', 250, 560, 1) });
    E({ id: 'lantern', z: 300, draw: r => r.sprite('item_lantern', 410, 300, { h: 56 }) });
    E({ id: 'mug', z: 300, draw: r => r.sprite('item_coffee_mug', 360, 300, { h: 30 }) });
    E({ id: 'bed', z: 600, hit: { x: 1146, y: 470, w: 246, h: 190 }, tap: act('sleep', 1110, 660, 1) });
    E({ id: 'window', z: 50, hit: { x: WIN.x, y: WIN.y, w: WIN.w, h: WIN.h }, tap: act('window', 680, 560, 1) });
    E({ id: 'seat', z: 430, hit: { x: 470, y: 380, w: 420, h: 70 }, tap: act('read', 640, 556, 1) });
    E({ id: 'door', z: 60, hit: { x: 12, y: 180, w: 100, h: 292 }, tap: act('door', 60, 560, -1) });
    if (G.flags.has_camera) E({ id: 'camera', z: 412, draw: r => r.sprite('item_camera', 820, 398, { h: 34 }), hit: { x: 790, y: 360, w: 60, h: 40 }, tap: () => UI.toast('Rosa\'s old camera. Take it out in the evenings — photo spots are marked with a dot.', 'item_camera') });
    // decor slots
    for (const [slot, pos] of Object.entries(HOME_SLOTS)) {
      E({ id: 'slot:' + slot, z: slot === 'h_rug' ? 548 : slot === 'h_table' ? 613 : pos.y, draw: r => this.drawSlot(r, slot, pos),
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
    if (slot === 'h_table') y = 480 - h;
    return { x: pos.x - w / 2, y, w, h };
  }

  tapSlot(slot) {
    const id = G.placed[slot];
    if (!id) return;
    if (id === 'record_player') { this.walkThen(1000, 640, 1, () => this.app.menus.recordPicker('home')); return; }
    if (id === 'pothos' || id === 'cat_planter' || id === 'hanging_plant' || id === 'potted_plant') { this.walkThen(clamp(HOME_SLOTS[slot].x - 60, 60, 1300), 600, 1, () => this.app.activities.run('water', { loc: 'home' })); return; }
    const d = DECOR[id]; UI.toast(`${d.name} — ${d.blurb}`);
  }

  drawSlot(r, slot, pos) {
    const id = G.placed[slot];
    if (!id) return;
    const d = DECOR[id]; if (!d) return;
    if (slot === 'h_table') { r.sprite(d.sprite, 1060, 482, d.h ? { h: d.h } : { w: d.w }); return; }
    if (slot === 'h_hang') { r.sprite(d.sprite, pos.x, 66, { h: d.h, ay: 0, rot: Math.sin(this.t * 1.1) * 0.02 }); return; }
    if (d.flat) { r.sprite(d.sprite, pos.x, pos.y, { w: d.w, sy: 0.55 }); return; }
    const o = d.h ? { h: d.h } : { w: d.w };
    if (d.ay !== undefined) o.ay = d.ay;
    r.sprite(d.sprite, pos.x, pos.y, o);
  }

  drawCat(r) {
    const breathe = 1 + Math.sin(this.t * 1.6) * 0.012;
    r.sprite('item_cat_bed', 880, 692, { h: 70, sy: breathe });
    if (Math.random() < 0.004) this.particles.emit('zzz', 900, 630, 1);
  }

  walkThen(x, y, face, fn) {
    this.player.walkTo(clamp(x, 40, this.worldW - 40), clamp(y, this.walkBand[0], this.walkBand[1])).then(ok => { if (!ok) return; if (face) this.player.facing = face; fn(); });
  }

  onTap(px, py) {
    const w = this.r.toWorld(px, py);
    const e = this.hitTest(w.x, w.y);
    if (e) { e.tap(w.x, w.y); return; }
    if (w.y > 470) this.player.walkTo(clamp(w.x, 40, this.worldW - 40), clamp(w.y, this.walkBand[0], this.walkBand[1]));
  }

  update(dt) {
    super.update(dt);
    if (!this.app.paused()) for (const a of this.actors) a.update(dt);
    this.particles.update(dt);
    this.glass.intensity = G.weather === 'rain' ? 0.8 : G.weather === 'storm' ? 1 : 0;
    this.glass.update(dt);
    this.fitView();
    this.follow(this.player, dt);
    if (this.player.moving) {
      this.stepT = (this.stepT || 0) + dt;
      if (this.stepT > 0.32) { this.stepT = 0; Sound.play(rand.pick(['step_wood1', 'step_wood2', 'step_wood3']), { vol: 0.45, jitter: 0.08 }); }
    }
    if (G.record && G.placed.h_table === 'record_player' && Math.random() < dt * 0.5) this.particles.emit('note', 1060, 440, 1);
    if (nightness(G.time) < 0.4 && Math.random() < dt * 1.2) this.particles.emit('dust', WIN.x + rand() * WIN.w, WIN.y + 100 + rand() * 300, 1);
  }

  drawOutside(r) {
    const c = r.ctx, night = nightness(G.time);
    const wet = G.weather === 'rain' || G.weather === 'storm';
    const g = c.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
    g.addColorStop(0, wet ? '#8e9eae' : '#9cc0dc'); g.addColorStop(1, wet ? '#c8ccc8' : '#f0dcc0');
    c.fillStyle = g; c.fillRect(WIN.x - 10, WIN.y - 10, WIN.w + 20, WIN.h + 20);
    // rooftops across the street
    for (const rf of this.roofs) {
      const top = WIN.y + WIN.h - rf.h;
      c.fillStyle = '#6d5a52'; c.fillRect(rf.x, top, rf.w, rf.h + 20);
      c.fillStyle = '#4e3f3a'; c.fillRect(rf.x - 4, top - 6, rf.w + 8, 8);
      if (rf.chim) { c.fillStyle = '#7d5a48'; c.fillRect(rf.x + rf.w * 0.6, top - 26, 12, 24); }
    }
    // water tower
    c.fillStyle = '#5a4a40'; c.fillRect(WIN.x + 250, WIN.y + 150, 44, 40); c.beginPath(); c.moveTo(WIN.x + 246, WIN.y + 150); c.lineTo(WIN.x + 272, WIN.y + 126); c.lineTo(WIN.x + 298, WIN.y + 150); c.fill();
    c.fillRect(WIN.x + 254, WIN.y + 190, 3, 50); c.fillRect(WIN.x + 288, WIN.y + 190, 3, 50);
  }

  drawOutsideGlow(r, night) {
    if (night < 0.05) return;
    const c = r.ctx;
    c.save();
    c.beginPath(); c.rect(WIN.x, WIN.y, WIN.w, WIN.h); c.clip();
    c.globalCompositeOperation = 'lighter';
    for (const rf of this.roofs) if (rf.lit) { c.fillStyle = `rgba(255,200,120,${0.55 * night})`; c.fillRect(rf.x + 10, WIN.y + WIN.h - rf.h + 18, 12, 14); }
    if (G.weather === 'clear') { r.glow(WIN.x + 330, WIN.y + 60, 40, [230, 230, 255], 0.5 * night); c.fillStyle = `rgba(250,248,235,${night})`; c.beginPath(); c.arc(WIN.x + 330, WIN.y + 60, 14, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }

  draw() {
    const r = this.r, c = r.ctx;
    const night = nightness(G.time);
    r.clear('#1a1410');
    r.world();
    this.drawOutside(r);
    this.tintOutdoors(r);
    r.world();
    if (this.bg) c.drawImage(this.bg, 0, 0, this.worldW, 720);
    this.glass.draw(c);
    for (const { d } of this.sortedDrawables()) d.draw(r, this.t);
    this.particles.draw(c);
    const lamp = 0.25 + 0.75 * night;
    const lights = [
      { x: 700, y: 150, r: 520, c: [255, 210, 150], i: 0.55 * lamp },
      { x: 700, y: 620, r: 420, c: [255, 200, 140], i: 0.35 * lamp, sy: 0.5 },
      { x: 680, y: 260, r: 560, c: [215, 228, 255], i: 0.6 * (1 - night) },
      { x: 410, y: 280, r: 150, c: [255, 180, 90], i: 0.45 * night },
    ];
    if (G.placed.h_lights) lights.push({ x: HOME_SLOTS.h_lights.x, y: 150, r: 300, c: [255, 190, 110], i: 0.5 * night + 0.1 });
    r.applyLighting(this.ambient(), lights, r.cam.x);
    r.glow(700, 132, 60, [255, 220, 150], 0.3 * lamp);
    this.drawOutsideGlow(r, night);
    r.glow(410, 270, 40, [255, 190, 100], 0.4 * night);
    for (const a of this.actors) a.drawEmote(r, this.t);
    r.vignette(0.32);
  }
}
