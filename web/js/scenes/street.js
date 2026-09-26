// Exterior locations (Linden Street, park, garden, riverside), configured by data/locations.js.
import { Scene, nightness, ambientFor } from './scene.js';
import { Actor } from '../engine/actor.js';
import { Assets } from '../engine/assets.js';
import { Sound } from '../engine/audio.js';
import { clamp, rand, makeRng } from '../engine/util.js';
import { G, weekday } from '../game/state.js';
import { LOCATIONS } from '../data/locations.js';
import { CHARACTERS, ROUTINES, NEIGHBOUR_IDS, hasSprite } from '../data/characters.js';
import { ROMANCE } from '../data/romance.js';
import { compileExpr } from '../game/script.js';
import { UI } from '../ui/ui.js';

const CS = 0.68;

// Laundry on June's clothesline: kind, position along the line (0..1), size and colours.
const CLOTHES = [
  { kind: 'sheet', at: 0.08, w: 128, h: 108, col: '#efe3c6', stripe: '#8fb0c0' },
  { kind: 'shirt', at: 0.24, w: 112, h: 86, col: '#9fb8c6' },
  { kind: 'pants', at: 0.37, w: 64, h: 124, col: '#4f6a8a' },
  { kind: 'dress', at: 0.51, w: 92, h: 118, col: '#c48fa0' },
  { kind: 'socks', at: 0.62, w: 56, h: 46, col: '#e8b04e' },
  { kind: 'towel', at: 0.74, w: 82, h: 96, col: '#e8b04e', stripe: '#c4692e' },
  { kind: 'shirt', at: 0.9, w: 104, h: 82, col: '#efe3c6' },
];

function garmentPath(c, g) {
  const { w, h } = g;
  c.beginPath();
  if (g.kind === 'shirt') {
    const b = w * 0.27;
    c.moveTo(-b, 0); c.lineTo(-b - w * 0.23, h * 0.13); c.lineTo(-b - w * 0.13, h * 0.34); c.lineTo(-b, h * 0.26);
    c.lineTo(-b - 2, h); c.lineTo(b + 2, h); c.lineTo(b, h * 0.26); c.lineTo(b + w * 0.13, h * 0.34); c.lineTo(b + w * 0.23, h * 0.13);
    c.lineTo(b, 0); c.quadraticCurveTo(0, h * 0.14, -b, 0);
  } else if (g.kind === 'pants') {
    c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.lineTo(w / 2 + 3, h); c.lineTo(w * 0.07, h); c.lineTo(0, h * 0.28);
    c.lineTo(-w * 0.07, h); c.lineTo(-w / 2 - 3, h);
  } else if (g.kind === 'dress') {
    c.moveTo(-w * 0.2, 0); c.lineTo(w * 0.2, 0); c.lineTo(w * 0.24, h * 0.32); c.quadraticCurveTo(w * 0.56, h * 0.9, w * 0.5, h);
    c.quadraticCurveTo(0, h * 1.06, -w * 0.5, h); c.quadraticCurveTo(-w * 0.56, h * 0.9, -w * 0.24, h * 0.32);
  } else if (g.kind === 'socks') {
    for (const dx of [-w * 0.3, w * 0.3]) {
      c.moveTo(dx - 9, 0); c.lineTo(dx + 9, 0); c.lineTo(dx + 9, h * 0.72); c.quadraticCurveTo(dx + 9, h, dx - 6, h);
      c.quadraticCurveTo(dx - 22, h, dx - 20, h * 0.8); c.quadraticCurveTo(dx - 16, h * 0.66, dx - 9, h * 0.62); c.closePath();
    }
    return;
  } else {
    c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.lineTo(w / 2 + 1, h); c.quadraticCurveTo(0, h + 5, -w / 2 - 1, h);
  }
  c.closePath();
}

function drawGarment(c, g, x, y, sway) {
  c.save();
  c.translate(x, y);
  c.transform(1, 0, sway * 0.01, 1, 0, 0);   // the hem swings, the pegged top stays put
  garmentPath(c, g);
  c.fillStyle = g.col; c.fill();
  c.save(); c.clip();
  const sh = c.createLinearGradient(-g.w / 2, 0, g.w / 2, 0);
  sh.addColorStop(0, 'rgba(40,25,15,0.22)'); sh.addColorStop(0.35, 'rgba(255,250,235,0.1)'); sh.addColorStop(0.65, 'rgba(40,25,15,0.06)'); sh.addColorStop(1, 'rgba(40,25,15,0.24)');
  c.fillStyle = sh; c.fillRect(-g.w, 0, g.w * 2, g.h + 12);
  c.fillStyle = 'rgba(40,25,15,0.08)';
  for (let k = -2; k <= 2; k++) c.fillRect(k * g.w * 0.16 - 2, g.h * 0.2, 4, g.h);
  if (g.stripe) { c.fillStyle = g.stripe; c.fillRect(-g.w, g.h * 0.7, g.w * 2, g.h * 0.08); c.fillRect(-g.w, g.h * 0.83, g.w * 2, g.h * 0.04); }
  c.restore();
  c.strokeStyle = 'rgba(40,28,20,0.85)'; c.lineWidth = 1.6; c.lineJoin = 'round'; c.stroke();
  // wooden pegs
  const pegs = g.kind === 'socks' ? [-g.w * 0.3, g.w * 0.3] : g.kind === 'dress' ? [-g.w * 0.16, g.w * 0.16] : [-g.w * 0.36, g.w * 0.36];
  c.fillStyle = '#b8864f'; c.strokeStyle = '#3a2a1e'; c.lineWidth = 1;
  for (const px of pegs) { c.fillRect(px - 2.5, -7, 5, 14); c.strokeRect(px - 2.5, -7, 5, 14); }
  c.restore();
}

export class StreetScene extends Scene {
  constructor(app) {
    super(app, { worldW: 2600, interior: false, charScale: CS });
    this.name = 'street';
    this.player = new Actor({ id: 'me', player: true, h: 262, speed: 330 });
    this.player.charScale = CS;
    this.npcs = new Map();
    this.pigeons = [];
    this.stars = Array.from({ length: 70 }, () => ({ x: rand() * 2400, y: rand() * 330, s: rand.range(0.6, 1.8), p: rand() * 6 }));
  }

  tm() { return G.time; }
  wx() { return G.weather; }

  cond(expr) {
    if (!expr) return true;
    try { return !!compileExpr(expr)(this.app.story.context()); } catch (e) { return false; }
  }

  async enter(opts = {}) {
    this.loc = opts.loc || 'street';
    const L = LOCATIONS[this.loc];
    this.cfg = L;
    this.worldW = L.worldW;
    this.walkBand = L.ground;
    const bgName = L.bgAlt && this.cond(L.bgAlt.cond) ? L.bgAlt.bg : L.bg;
    [this.bg, this.bgLights, this.sky, this.skyLights] = await Promise.all([Assets.bg(bgName), Assets.bg(L.lights), Assets.bg('skyline'), Assets.bg('skyline_lights')]);
    this.skyMask = this.buildSkyMask(this.bg);
    this.actors = [this.player];
    this.npcs.clear();
    this.player.visible = true;
    this.player.carrying = false;
    this.player.stop();
    const ent = (opts.from && L.entries[opts.from]) || L.entries.default;
    this.player.x = ent[0]; this.player.y = ent[1]; this.player.facing = 1;
    this.buildProps();
    this.placeNpcs();
    this.pigeons = this.loc === 'park' ? Array.from({ length: 7 }, (_, i) => ({ x: 1080 + i * 22 + rand() * 30, y: 624 + rand() * 30, hop: rand() * 3, f: rand() < 0.5 ? 1 : -1 })) : [];
    this.follow(this.player, 0, true);
    const rain = this.wx() === 'rain' ? 0.6 : this.wx() === 'storm' ? 1 : 0;
    this.rain.intensity = rain;
    const amb = Object.assign({}, L.amb || {});
    if (rain) amb.amb_rain_out = 0.35 + rain * 0.4;
    if (this.loc === 'street' && this.tm() < 20 * 60) amb.amb_cafe = 0.12;
    Sound.setAmbience(amb, 1.5);
    this.app.hud.setMode('free');
    this.app.day.sceneMusic();
  }

  // Let go of the big images when leaving (the asset cache keeps recently used ones).
  exit() { this.bg = this.bgLights = this.sky = this.skyLights = null; this.skyMask = null; }

  // Coarse map of where the background is transparent (open sky), for stars.
  buildSkyMask(im) {
    if (!im) return null;
    try {
      const cw = Math.ceil(this.worldW / 8), ch = 90;
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(im, 0, 0, cw, ch);
      const d = cx.getImageData(0, 0, cw, ch).data;
      const mask = new Uint8Array(cw * ch);
      for (let i = 0; i < cw * ch; i++) mask[i] = d[i * 4 + 3] < 20 ? 1 : 0;
      return { mask, cw, ch };
    } catch (e) { return null; }
  }

  // Distant skyline windows, cut out by the foreground so they only show through open sky.
  farLights(r) {
    if (!this.skyLights) return null;
    const k = 0.5, W = Math.ceil(r.VW * k), H = Math.ceil(720 * k);
    const cv = this.farCv || (this.farCv = document.createElement('canvas'));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const o = cv.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, W, H);
    o.setTransform(k, 0, 0, k, 0, 0);
    o.drawImage(this.skyLights, -r.cam.x * 0.25 - 100, this.cfg.sky === 'wide' ? 0 : 60, 2400, 720);
    if (this.bg) {
      const z = r.cam.zoom, s = k * z;
      o.globalCompositeOperation = 'destination-out';
      o.setTransform(s, 0, 0, s, -r.cam.x * s + (r.VW / 2) * (1 - z) * k, -r.cam.y * s + 360 * (1 - z) * k);
      o.drawImage(this.bg, 0, 0, this.worldW, 720);
    }
    return cv;
  }

  isSky(wx, wy) {
    const m = this.skyMask;
    if (!m) return wy < 200;
    const x = Math.floor(wx / 8), y = Math.floor(wy / 8);
    if (x < 0 || y < 0 || x >= m.cw || y >= m.ch) return false;
    return m.mask[y * m.cw + x] === 1;
  }

  buildProps() {
    this.ents = [];
    for (const pr of this.cfg.props) {
      if (pr.when && !this.cond(pr.when)) continue;
      let s = pr.s;
      if (pr.tree && G.day >= 16) s = 'street_tree_autumn';
      const e = { id: s, z: pr.y, pr, s, draw: (r) => this.drawProp(r, e) };
      if (pr.sign) { e.hit = { x: pr.x - 60, y: pr.y - pr.h, w: 120, h: pr.h }; e.tap = () => UI.toast(`${G.shop} — est. 1972`, 'icon_washer'); }
      if (pr.mural) { e.hit = { x: pr.x - 150, y: pr.y - pr.h, w: 300, h: pr.h }; e.tap = () => this.app.story.trigger('look', { what: 'mural' }).then(p => { if (!p) UI.toast('"Harbor Dreams" — Remy\'s mural of the city at sunrise.', 'icon_star'); }); }
      if (pr.market) { e.hit = { x: pr.x - 90, y: pr.y - 120, w: 180, h: 120 }; e.tap = () => this.goDo({ act: 'market', x: pr.x, y: pr.y }); }
      this.ents.push(e);
    }
    // hotspots
    for (const h of this.cfg.hotspots) {
      if (h.when && !this.cond(h.when)) continue;
      this.ents.push({ id: 'hs:' + h.id, z: -1, tapZ: 5, hit: { x: h.x, y: h.y, w: h.w, h: h.h }, tap: () => this.goDo(h), pad: 6 });
    }
    // sock collectible
    const sk = this.cfg.sock;
    if (sk && !G.collections.socks.includes(sk.id) && G.day >= 3) {
      const e = { id: 'sock', z: sk.y, draw: (r) => r.sprite('item_sock', sk.x, sk.y, { h: 24, rot: 0.6 }), hit: { x: sk.x - 24, y: sk.y - 30, w: 48, h: 36 }, tapZ: 10,
        tap: () => this.walkThen(sk.x - 30, sk.y + 4, async () => {
          this.player.setPose('pet', 0.7);
          this.ents = this.ents.filter(x => x !== e);
          this.app.menus.foundSock(this.loc, sk.id);
        }) };
      this.ents.push(e);
    }
  }

  placeNpcs() {
    const wd = weekday(G.day);
    const here = [];
    for (const id of ['walt', 'maya', 'june', 'remy', ...NEIGHBOUR_IDS]) {
      // neighbours are out and about once you've met them (and once they have in-world art)
      if (NEIGHBOUR_IDS.includes(id) && (!hasSprite(id) || !G.flags['met_' + id] || G.day < (ROUTINES[id].from || 0))) continue;
      if (!this.app.story.canVisit(id)) continue;
      // strangers only show up where their introduction happens
      if (!G.flags['met_' + id] && !(id === 'remy' && this.loc === 'street')) continue;
      const forced = G.vars['at_' + id];
      let present = false;
      if (forced) present = forced === this.loc;
      else {
        const ev = ROUTINES[id].evening;
        present = !!(ev[this.loc] && ev[this.loc].includes(wd));
        if (G.phase === 'morning' && !(wd === 6)) present = false;
        if (G.time >= 22 * 60 + 30) present = false;
      }
      // a date: they're waiting at the spot that evening
      if (G.vars['date_' + id] === G.day && ROMANCE[id] && ROMANCE[id].place === this.loc && G.time >= 17 * 60 && G.phase !== 'shift') present = true;
      if (present) here.push(id);
    }
    for (const id of here) {
      const c = CHARACTERS[id];
      const [x, y] = this.cfg.spots[id] || [800, 640];
      const a = new Actor({ id, sprite: c.sprite, h: c.h, x, y, speed: 160 });
      a.charScale = CS;
      a.facing = x > this.worldW / 2 ? -1 : 1;
      this.actors.push(a);
      this.npcs.set(id, a);
      if (G.talked[id] !== G.day) a.say('…', 99999);
    }
  }

  // ------------------------------------------------------------------ input
  onTap(px, py) {
    const w = this.r.toWorld(px, py);
    for (const [id, a] of this.npcs) {
      const b = a.bounds();
      if (w.x > b.x - 12 && w.x < b.x + b.w + 12 && w.y > b.y && w.y < b.y + b.h + 12) { this.tapNpc(id, a); return; }
    }
    if (this.loc === 'park') for (const pg of this.pigeons) if (Math.abs(w.x - pg.x) < 30 && Math.abs(w.y - pg.y) < 24) { this.goDo({ act: 'pigeons', x: pg.x, y: pg.y }); return; }
    const e = this.hitTest(w.x, w.y);
    if (e) { e.tap(w.x, w.y); return; }
    if (w.y > this.walkBand[0] - 40) {
      this.player.walkTo(clamp(w.x, 40, this.worldW - 40), clamp(w.y, this.walkBand[0], this.walkBand[1]));
    }
  }

  walkThen(x, y, fn, face) {
    this.player.walkTo(clamp(x, 30, this.worldW - 30), clamp(y, this.walkBand[0], this.walkBand[1]), face).then(ok => { if (ok) fn(); });
  }

  async tapNpc(id, a) {
    const tx = a.x + (a.x > this.player.x ? -110 : 110) * CS * 1.2;
    this.walkThen(tx, a.y + 2, () => {
      this.player.facing = a.x > this.player.x ? 1 : -1;
      a.facing = -this.player.facing;
      this.app.menus.contextMenu(this.r.toScreen(a.x, a.y - a.dispH - 12), CHARACTERS[id].name, [
        { label: 'Talk', icon: 'icon_speech', run: async () => { a.emote = null; await this.app.story.talk(id, { place: this.loc }); this.app.day.spend(10); } },
        { label: 'Give gift', icon: 'icon_heart', run: () => this.app.story.giftTo(id) },
      ]);
    }, a.x > tx ? 1 : -1);
  }

  goDo(h) {
    const x = h.x + (h.w || 0) / 2;
    this.walkThen(x, Math.max(this.walkBand[0], (h.y || 600) + (h.h || 0) + 10), () => this.app.activities.run(h.act, Object.assign({ loc: this.loc }, h)));
  }

  // ------------------------------------------------------------------ update / draw
  update(dt) {
    super.update(dt);
    const paused = this.app.paused();
    for (const a of this.actors) a.update(dt, paused);
    this.particles.update(dt);
    this.rain.update(dt, this.r.VW, 700);
    this.applyFatigue(330, null);
    this.follow(this.player, dt);
    if (G.day >= 16 && Math.random() < dt * 0.5 && this.wx() !== 'storm' && !this.isTitle) this.particles.emit('leaf', this.r.cam.x + rand() * this.r.VW, -10, 1);
    for (const pg of this.pigeons) {
      pg.hop -= dt;
      if (pg.hop < 0) { pg.hop = rand.range(0.6, 2.4); pg.x += rand.range(-18, 18); pg.f = rand() < 0.5 ? 1 : -1; pg.jump = 0.2; }
      if (pg.jump > 0) pg.jump -= dt;
      if (Math.abs(this.player.x - pg.x) < 70 && Math.abs(this.player.y - pg.y) < 40 && this.player.moving) { pg.fly = 1; }
      if (pg.fly) { pg.fly -= dt; pg.y -= 160 * dt; pg.x += 90 * pg.f * dt; if (pg.fly <= 0) { pg.fly = 0; pg.y = 624 + rand() * 30; pg.x = 1060 + rand() * 180; } }
    }
  }

  draw() {
    const r = this.r, c = r.ctx;
    const night = nightness(this.tm());
    r.clear('#101418');
    // sky (tinted by the ambient light later)
    r.screen();
    const g = c.createLinearGradient(0, 0, 0, 500);
    const wet = this.wx() === 'rain' || this.wx() === 'storm';
    g.addColorStop(0, wet ? '#8e9eae' : '#8fb4d4');
    g.addColorStop(1, wet ? '#c4c8c4' : '#e8dcc4');
    c.fillStyle = g; c.fillRect(0, 0, r.VW, 720);
    // far skyline with parallax
    if (this.sky) {
      const sx = -r.cam.x * 0.25 - 100;
      const sy = this.cfg.sky === 'wide' ? 0 : 60;
      c.drawImage(this.sky, sx, sy, 2400, 720);
    }
    r.world();
    if (this.bg) c.drawImage(this.bg, 0, 0, this.worldW, 720);
    if (this.cfg.clothesline) this.drawClothesline(r);
    this.drawSpecial(r);
    for (const { d } of this.sortedDrawables()) d.draw(r, this.t);
    if (this.loc === 'park') this.drawPigeons(r);
    this.particles.draw(c);
    // puddles on rainy days
    // lighting
    const lights = [];
    for (const pr of this.cfg.props) if (pr.lamp && (!pr.when || this.cond(pr.when))) {
      lights.push({ x: pr.lamp[0], y: pr.lamp[1], r: 380, c: [255, 205, 140], i: night * 0.85 });
      lights.push({ x: pr.lamp[0], y: 660, r: 260, c: [255, 200, 140], i: night * 0.6, sy: 0.5 });
    }
    if (this.loc === 'street') { lights.push({ x: 830, y: 420, r: 420, c: [255, 210, 150], i: night * 0.75 }); lights.push({ x: 1400, y: 430, r: 400, c: [255, 190, 120], i: night * 0.6 }); }
    r.applyLighting(ambientFor(this.tm(), this.wx(), false), lights, r.cam.x);
    // emissive layers after lighting
    if (night > 0.02) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = night;
      const far = this.farLights(r);
      if (far) { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(far, 0, 0, r.canvas.width, r.canvas.height); }
      r.screen();
      const z = r.cam.zoom;
      for (const s of this.stars) {
        const sx = ((s.x - r.cam.x * 0.1) % r.VW + r.VW) % r.VW;
        if (!this.isSky((sx - r.VW / 2 * (1 - z)) / z + r.cam.x, (s.y - 360 * (1 - z)) / z + r.cam.y)) continue;
        const a = (0.4 + 0.6 * Math.abs(Math.sin(this.t + s.p))) * night * (wet ? 0.2 : 1);
        c.fillStyle = `rgba(255,248,230,${a})`; c.fillRect(sx, s.y, s.s, s.s);
      }
      r.world();
      c.globalAlpha = night * 0.5;
      if (this.bgLights) c.drawImage(this.bgLights, 0, 0, this.worldW, 720);
      c.globalAlpha = night;
      for (const pr of this.cfg.props) if (pr.lamp && (!pr.when || this.cond(pr.when))) { r.glow(pr.lamp[0], pr.lamp[1] - 18, 60, [255, 220, 150], 0.5 * night); }
      c.restore();
      r.world();
      for (const pr of this.cfg.props) if (pr.glow) this.drawBulbs(r, pr, night);
      for (const pr of this.cfg.props) if (pr.glowLamp) r.glow(pr.x, pr.y - pr.h * 0.5, 50, [255, 190, 100], 0.5 * night);
    }
    this.rain.draw(c, r.scale);
    r.world();
    for (const a of this.actors) a.drawEmote(r, this.t);
    this.drawHotspotHints(r);
    r.vignette(0.3 + night * 0.15);
  }

  drawProp(r, e) {
    const pr = e.pr;
    const o = pr.h ? { h: pr.h } : { w: pr.w };
    if (pr.ay !== undefined) o.ay = pr.ay;
    if (pr.flip) o.flip = true;
    if (pr.tree) o.rot = Math.sin(this.t * 0.8 + pr.x) * 0.006;
    if (pr.market) this.drawMarketCanopy(r, pr);
    const box = r.sprite(e.s, pr.x, pr.y, o);
    if (pr.sign && box) {
      const c = r.ctx;
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `${Math.round(box.h * 0.26)}px Pacifico`; c.fillStyle = '#5a2e14';
      c.fillText(G.shop, box.x + box.w * 0.5, box.y + box.h * 0.66);
      c.restore();
    }
  }

  // Weekend flea market: a striped canopy on two poles and a hand-lettered sign over the table.
  drawMarketCanopy(r, pr) {
    const c = r.ctx;
    const x0 = pr.x - 104, x1 = pr.x + 104, top = pr.y - 214, base = pr.y - 6;
    c.save();
    c.fillStyle = '#5a3a24'; c.strokeStyle = '#2a1c14'; c.lineWidth = 1.5;
    for (const px of [x0 + 2, x1 - 8]) { c.fillRect(px, top, 6, base - top); c.strokeRect(px, top, 6, base - top); }
    const n = 7, w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#efe3c6' : '#c4692e';
      c.beginPath(); c.moveTo(x0 + i * w, top); c.lineTo(x0 + (i + 1) * w, top); c.lineTo(x0 + (i + 1) * w, top + 24);
      c.quadraticCurveTo(x0 + (i + 0.5) * w, top + 38, x0 + i * w, top + 24); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x0, top + 22, x1 - x0, 4);
    c.fillStyle = '#f7ecd4'; c.strokeStyle = '#3a2a1e';
    c.beginPath(); c.roundRect(pr.x - 58, top - 30, 116, 26, 4); c.fill(); c.stroke();
    c.font = '700 14px Fraunces'; c.fillStyle = '#8f3f2c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('FLEA MARKET', pr.x, top - 16);
    c.restore();
    r.sprite('item_yarn_basket', x1 + 20, pr.y + 4, { h: 46 });
  }

  drawBulbs(r, pr, night) {
    const im = Assets.img(pr.s); if (!im) return;
    const w = pr.w, h = im.naturalHeight * (w / im.naturalWidth);
    const x0 = pr.x - w / 2, y0 = pr.y - h;
    for (let i = 0; i < 6; i++) r.glow(x0 + w * (0.2 + i * 0.12), y0 + h * (0.62 + Math.sin(i * 1.3) * 0.08), 22, [255, 200, 120], (0.35 + 0.2 * Math.sin(this.t * 2 + i)) * night);
  }

  drawSpecial(r) {
    const c = r.ctx;
    const ad = this.cfg.crestlineAd;
    if (ad && this.cond(ad.cond)) {
      // Crestline's billboard replaces Remy's mural
      c.save();
      c.fillStyle = '#6a6a66'; c.fillRect(ad.x - 110, ad.y - 40, 10, 40); c.fillRect(ad.x + 100, ad.y - 40, 10, 40);
      const x = ad.x - ad.w / 2, y = ad.y - 40 - ad.h;
      const gr = c.createLinearGradient(x, y, x + ad.w, y + ad.h);
      gr.addColorStop(0, '#e9eef2'); gr.addColorStop(1, '#b8c6d2');
      c.fillStyle = gr; c.fillRect(x, y, ad.w, ad.h);
      c.strokeStyle = '#2a2f36'; c.lineWidth = 3; c.strokeRect(x, y, ad.w, ad.h);
      c.fillStyle = '#23354a'; c.fillRect(x, y + ad.h - 44, ad.w, 44);
      c.fillStyle = '#23354a'; c.font = '600 30px sans-serif'; c.textAlign = 'left';
      c.fillText('THE LINDEN', x + 18, y + 48);
      c.font = '15px sans-serif'; c.fillStyle = '#3b4a5c';
      c.fillText('Luxury living. Coming soon.', x + 18, y + 74);
      c.fillText('Studios from $2,950/mo', x + 18, y + 96);
      c.fillStyle = '#e9eef2'; c.font = '600 14px sans-serif'; c.fillText('CRESTLINE PROPERTIES', x + 18, y + ad.h - 17);
      // tower rendering
      c.fillStyle = 'rgba(35,53,74,0.65)'; c.fillRect(x + ad.w - 90, y + 16, 56, ad.h - 66);
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) { c.fillStyle = 'rgba(233,238,242,0.7)'; c.fillRect(x + ad.w - 84 + j * 17, y + 24 + i * 16, 10, 9); }
      if (G.flags.ad_tagged) { c.fillStyle = 'rgba(214,120,150,0.9)'; c.font = '38px Pacifico'; c.fillText('keep it Linden', x + 30, y + ad.h - 70); }
      c.restore();
    }
    const sb = this.cfg.soldBanner;
    if (sb && this.cond(sb.cond)) {
      c.save(); c.translate(sb.x, sb.y); c.rotate(-0.02);
      c.fillStyle = '#23354a'; c.fillRect(-140, -24, 280, 48);
      c.fillStyle = '#fff'; c.font = '600 22px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('SOLD · CRESTLINE PROPERTIES', 0, 1);
      c.restore();
    }
    // petition posters on lamp posts
    if (this.loc === 'street' && G.flags.petition_started) {
      for (const lx of [360, 1160, 1900]) {
        c.save(); c.translate(lx + 14, 470); c.rotate(0.04);
        c.fillStyle = '#f3e3c3'; c.fillRect(-18, -26, 36, 52); c.strokeStyle = '#3a2a1e'; c.lineWidth = 1; c.strokeRect(-18, -26, 36, 52);
        c.fillStyle = '#b3402f'; c.font = '700 8px Fraunces'; c.textAlign = 'center'; c.fillText('SAVE', 0, -12); c.fillText('LINDEN', 0, -2); c.fillText('ST.', 0, 8);
        c.restore();
      }
    }
    // Remy's new mural on the Cap & Seal fence (ending choice)
    if (this.loc === 'street' && G.flags.new_mural) {
      r.sprite('street_billboard', 2440, 604, { h: 230 });
      c.save(); c.fillStyle = 'rgba(40,20,20,0.85)'; c.font = '24px Pacifico'; c.textAlign = 'center'; c.fillText('for Rosa', 2440, 560); c.restore();
    }
  }

  drawClothesline(r) {
    const c = r.ctx, cl = this.cfg.clothesline;
    const sag = 30, lineY = x => { const t = (x - cl.x0) / (cl.x1 - cl.x0); return cl.y + 4 * sag * t * (1 - t); };
    c.save();
    c.strokeStyle = '#3a2a1e'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cl.x0, cl.y); c.quadraticCurveTo((cl.x0 + cl.x1) / 2, cl.y + 2 * sag, cl.x1, cl.y); c.stroke();
    const wind = this.wx() === 'storm' ? 3 : this.wx() === 'rain' ? 1.4 : 1;
    CLOTHES.forEach((g, i) => {
      const x = cl.x0 + (cl.x1 - cl.x0) * g.at;
      const sway = Math.sin(this.t * (1.3 + i * 0.17) + i * 1.7) * 3 * wind + (wind > 1 ? 2 : 0);
      drawGarment(c, g, x, lineY(x), sway);
    });
    c.restore();
  }

  drawPigeons(r) {
    const c = r.ctx;
    for (const pg of this.pigeons) {
      const y = pg.y - (pg.jump > 0 ? Math.sin(pg.jump / 0.2 * Math.PI) * 6 : 0);
      c.save(); c.translate(pg.x, y); c.scale(pg.f * 0.9, 0.9);
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(0, 2, 10, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a8a90'; c.strokeStyle = '#2a2a2e'; c.lineWidth = 1.2;
      c.beginPath(); c.ellipse(0, -8, 11, 7, -0.2, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#6f7a86'; c.beginPath(); c.arc(9, -15, 5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#7a9a88'; c.beginPath(); c.ellipse(6, -11, 4, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d98a4a'; c.fillRect(13, -15, 4, 2);
      c.fillStyle = '#c4692e'; c.fillRect(-2, -2, 2, 4); c.fillRect(2, -2, 2, 4);
      c.restore();
    }
  }

  drawHotspotHints(r) {
    const c = r.ctx;
    for (const e of this.ents) {
      if (!e.id.startsWith('hs:')) continue;
      const h = e.hit;
      const x = h.x + h.w / 2, y = h.y - 8 + Math.sin(this.t * 3 + h.x) * 3;
      if (Math.abs(x - this.player.x) > 420) continue;
      c.save(); c.globalAlpha = 0.75;
      c.fillStyle = '#f7ecd4'; c.strokeStyle = '#3a2a1e'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#c4692e'; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }
}
