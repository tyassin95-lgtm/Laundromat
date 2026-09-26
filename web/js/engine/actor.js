// Characters in the world. The art is single-frame "paper cut-outs", so nobody walks: to move,
// a character turns edge-on where it stands, a little arc of glints shows where it went, and it
// turns back to face you at the destination with a small landing squash. Very short moves are
// a quick hop instead. Life comes from breathing, squash and emotes.
import { Assets } from './assets.js';
import { Sound } from './audio.js';
import { clamp, dist, rand, Ease } from './util.js';

export const PLAYER_POSES = {
  idle: { s: 'player_idle', ax: 0.5 },
  look: { s: 'player_idle_look', ax: 0.47 },
  carry: { s: 'player_carry', ax: 0.48 },
  load: { s: 'player_load_arms', ax: 0.3 },
  mop: { s: 'player_mop', ax: 0.36 },
  reach: { s: 'player_reach_clean', ax: 0.42 },
  wave: { s: 'player_wave', ax: 0.45 },
  stretch: { s: 'player_stretch', ax: 0.5 },
  // hobbies (art/source/generated/player_poses2.webp)
  pet: { s: 'player_pet', ax: 0.4 },
  tea: { s: 'player_tea', ax: 0.51 },
  read: { s: 'player_read', ax: 0.5 },
  knit: { s: 'player_knit', ax: 0.52 },
  sketch: { s: 'player_sketch', ax: 0.4 },
  water: { s: 'player_water', ax: 0.33 },
  photo: { s: 'player_photo', ax: 0.46 },
  feed: { s: 'player_feed', ax: 0.3 },
};
const PLAYER_REF_H = 490;   // natural height of player_idle; all poses share its scale

// Hop timings in seconds. The gap (while edge-on) grows a little with distance.
const HOP = { out: 0.14, in: 0.24, gapMin: 0.06, gapMax: 0.22, step: 0.18, stepBelow: 60 };

export class Actor {
  constructor(o) {
    this.id = o.id;
    this.isPlayer = !!o.player;
    this.sprite = o.sprite || null;        // NPC single sprite
    this.h = o.h || 262;                   // display height (virtual px) at scale 1
    this.x = o.x || 0; this.y = o.y || 600;
    this.facing = o.facing || 1;
    this.pose = 'idle';
    this.poseTimer = 0;
    this.speed = o.speed || 300;           // scenes lower this when you're tired: hops get slower
    this.baseSpeed = this.speed;
    this.target = null; this.onArrive = null;
    this.hop = null;                       // the move in progress
    this.arrived = false;                  // landed while the game was paused; resolve on resume
    this.moving = false;
    this.motes = [];                       // puffs and glints from hopping
    this.idleT = 0;
    this.alpha = 1;
    this.scaleMul = 1;
    this.visible = true;
    this.emote = null; this.emoteT = 0;
    this.carrying = false;
    this.squash = 0;
    this.breath = Math.random() * 6;
    this.charScale = 1;       // scene-level size multiplier (exteriors are smaller)
    this.hitW = o.hitW || 110;
    this.tint = null;
  }

  get dispH() { return this.h * this.charScale * this.scaleMul; }

  // Move to (x, y), ending up facing `face` (1 right, -1 left) if given: the turn happens while
  // the cut-out is edge-on, so it never visibly flips. Resolves true on arrival, or false if
  // another move or stop() cut in.
  walkTo(x, y, face) {
    if (this.arrived) { this.arrived = false; this.settle(true); } else this.settle(false);
    const d = Math.hypot(x - this.x, y - this.y);
    if (!this.hop && d < 2) { this.x = x; this.y = y; if (face) this.facing = face; return Promise.resolve(true); }
    this.target = { x, y };
    this.moving = true;
    this.idleT = 0;
    if (this.hop) this.retarget(x, y, face);
    else this.startHop(x, y, d, face);
    return new Promise(res => { this.onArrive = res; });
  }

  // Pop into view where we stand (someone coming through the door).
  appear() {
    this.settle(false);
    this.visible = true;
    this.hop = this.jump(this.x, this.y, 0);
    this.hop.phase = 'in';
    this.moving = true;
    return new Promise(res => { this.onArrive = res; });
  }

  // Turn edge-on and stay gone (someone leaving). Resolves when they're out of sight.
  vanish() {
    this.settle(false);
    this.hop = this.jump(this.x, this.y, 0);
    this.hop.vanish = true;
    this.puff(this.x, this.y, 6);
    this.sfx('whoosh2', 0.2);
    this.moving = true;
    return new Promise(res => { this.onArrive = res; });
  }

  stop() {
    const h = this.hop;
    if (h && h.vanish) this.visible = false;
    this.hop = null; this.moving = false; this.target = null;
    this.arrived = false; this.motes.length = 0;
    this.settle(false);
  }

  settle(v) { if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(v); } }

  setPose(p, secs) { this.pose = p; this.poseTimer = secs || 0; this.idleT = 0; }
  say(emote, secs = 2.5) { if (this.emote !== emote) this.emoteAge = 0; this.emote = emote; this.emoteT = secs; }

  // ------------------------------------------------------------------ hopping
  hopScale() { return clamp(this.baseSpeed / Math.max(1, this.speed), 1, 1.6); }

  jump(tx, ty, d) {
    const k = this.hopScale();
    return {
      kind: 'jump', phase: 'out', t: 0, fx: this.x, fy: this.y, tx, ty, s0: Math.min(1, this.presence()), glints: 0,
      dur: { out: HOP.out * k, gap: (HOP.gapMin + Math.min(HOP.gapMax - HOP.gapMin, d / 5000)) * k, in: HOP.in * k },
    };
  }

  startHop(tx, ty, d, face) {
    if (d < HOP.stepBelow) {
      this.hop = { kind: 'step', t: 0, fx: this.x, fy: this.y, tx, ty, dur: HOP.step * this.hopScale() };
      const f = face || (Math.abs(tx - this.x) > 12 ? Math.sign(tx - this.x) : 0);
      if (f) this.facing = f;
      return;
    }
    this.hop = this.jump(tx, ty, d);
    this.hop.face = face || 0;
    this.puff(this.x, this.y, 6);
    this.sfx('whoosh2', 0.22);
  }

  // A new destination mid-move.
  retarget(tx, ty, face) {
    const h = this.hop;
    if (h.kind === 'step' || h.vanish) { this.hop = null; this.startHop(tx, ty, Math.hypot(tx - this.x, ty - this.y), face); return; }
    if (h.phase === 'out') { h.tx = tx; h.ty = ty; h.face = face || 0; return; }
    if (h.phase === 'gap') {
      // already edge-on and out of sight: just move the landing spot
      h.tx = tx; h.ty = ty; h.face = face || 0; this.x = tx; this.y = ty;
      if (face) this.facing = face;
      else if (Math.abs(tx - h.fx) > 2) this.facing = tx > h.fx ? 1 : -1;
      return;
    }
    // turning back in: fold away again from wherever the turn has got to
    this.hop = this.jump(tx, ty, Math.hypot(tx - this.x, ty - this.y));
    this.hop.face = face || 0;
    this.sfx('whoosh2', 0.16);
  }

  // Advance the move. Returns true on the frame it finishes.
  stepHop(dt) {
    const h = this.hop;
    if (!h) return false;
    h.t += dt;
    if (h.kind === 'step') {
      const p = Math.min(1, h.t / h.dur), e = Ease.inOutQuad(p);
      this.x = h.fx + (h.tx - h.fx) * e; this.y = h.fy + (h.ty - h.fy) * e;
      if (p < 1) return false;
      this.hop = null; this.squash = 0.05;
      return true;
    }
    if (h.phase === 'gone') {
      if (h.t < 0.35) return false;          // let the puff settle before we're removed
      this.hop = null; this.visible = false;
      return true;
    }
    if (h.phase === 'out') {
      if (h.t < h.dur.out) return false;
      if (h.vanish) { h.phase = 'gone'; h.t = 0; return false; }
      h.phase = 'gap'; h.t = 0;
      // edge-on nobody can see which way the cut-out faces, so it turns around here
      if (h.face) this.facing = h.face;
      else if (Math.abs(h.tx - h.fx) > 2) this.facing = h.tx > h.fx ? 1 : -1;
      this.x = h.tx; this.y = h.ty;
      return false;
    }
    if (h.phase === 'gap') {
      this.emitGlints(h, false);
      if (h.t >= h.dur.gap) { this.emitGlints(h, true); h.phase = 'in'; h.t = 0; }
      return false;
    }
    if (h.t < h.dur.in) return false;
    this.hop = null;
    this.squash = 0.07;
    this.puff(this.x, this.y, 5);
    this.sfx('pop', 0.13, 1.3);
    return true;
  }

  // 0 = edge-on (unseen) .. 1 = facing you. Overshoots a touch as it turns back in.
  presence() {
    const h = this.hop;
    if (!h || h.kind === 'step') return 1;
    if (h.phase === 'out') return h.s0 * (1 - Ease.inQuad(Math.min(1, h.t / h.dur.out)));
    if (h.phase === 'gap' || h.phase === 'gone') return 0;
    return Ease.outBack(Math.min(1, h.t / h.dur.in));
  }

  // How far off the floor (negative = up).
  lift() {
    const h = this.hop;
    if (!h) return 0;
    if (h.kind === 'step') return -Math.sin(Math.min(1, h.t / h.dur) * Math.PI) * 9 * this.charScale;
    const L = 12 * this.charScale;
    if (h.phase === 'out') return -L * Ease.outQuad(Math.min(1, h.t / h.dur.out));
    if (h.phase === 'gap' || h.phase === 'gone') return -L;
    return -L * (1 - Ease.inQuad(Math.min(1, h.t / h.dur.in)));
  }

  sfx(name, vol, rate) {
    if (!this.visible || this.alpha <= 0) return;
    Sound.play(name, { vol: vol * (this.isPlayer ? 1 : 0.6), rate: rate || 1, jitter: 0.08 });
  }

  // Soft dust puffs around the feet.
  puff(x, y, n) {
    const k = this.charScale;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand.range(-0.3, 0.3);
      const sp = rand.range(50, 90) * k;
      const life = rand.range(0.38, 0.52);
      this.motes.push({ kind: 'puff', x: x + Math.cos(a) * 14 * k, y: y - 4 + Math.sin(a) * 4 * k,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.3 - 8, life, max: life, size: rand.range(8, 12) * k });
    }
  }

  // Glints along an arc from where we were to where we're going, laid down over the gap.
  emitGlints(h, all) {
    const d = Math.hypot(h.tx - h.fx, h.ty - h.fy);
    const n = Math.round(clamp(d / 70, 3, 16));
    const upto = all ? n : Math.floor(n * Math.min(1, h.t / h.dur.gap));
    const hh = this.dispH * 0.55;
    const x0 = h.fx, y0 = h.fy - hh, x1 = h.tx, y1 = h.ty - hh;
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - Math.min(150, 40 + d * 0.18);
    while (h.glints < upto) {
      const u = (h.glints + 0.5) / n, v = 1 - u;
      const life = 0.42 + u * 0.18;
      this.motes.push({ kind: 'glint',
        x: v * v * x0 + 2 * v * u * cx + u * u * x1, y: v * v * y0 + 2 * v * u * cy + u * u * y1,
        vx: rand.range(-10, 10), vy: rand.range(-18, -4), life, max: life, size: rand.range(6, 10) * this.charScale });
      h.glints++;
    }
  }

  stepMotes(dt) {
    const ms = this.motes;
    const drag = Math.exp(-4 * dt);
    for (let i = ms.length - 1; i >= 0; i--) {
      const m = ms[i];
      m.life -= dt;
      if (m.life <= 0) { ms.splice(i, 1); continue; }
      m.vx *= drag; m.vy *= drag;
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.kind === 'puff') m.size += 10 * dt * this.charScale;
    }
  }

  // ------------------------------------------------------------------ update
  // While a conversation or menu is open (paused), moves still finish on screen, so visitors
  // take their places during a scene. The player's errands wait for the game to resume.
  update(dt, paused = false) {
    if (this.stepHop(dt)) {
      this.moving = false; this.target = null; this.idleT = 0;
      if (paused && this.isPlayer) this.arrived = true;
      else this.settle(true);
    }
    this.stepMotes(dt);
    this.squash *= Math.pow(0.001, dt);
    if (paused) return;
    if (this.arrived) { this.arrived = false; this.settle(true); }
    this.breath += dt;
    if (this.emoteT > 0) { this.emoteT -= dt; this.emoteAge = (this.emoteAge || 0) + dt; if (this.emoteT <= 0) this.emote = null; }
    if (this.poseTimer > 0) { this.poseTimer -= dt; if (this.poseTimer <= 0) this.pose = 'idle'; }
    if (this.moving) this.idleT = 0; else this.idleT += dt;
  }

  // Which image + anchor to draw right now.
  frame() {
    if (!this.isPlayer) return { s: this.sprite, ax: 0.5, k: this.dispH / (Assets.img(this.sprite)?.naturalHeight || 1) };
    const k = this.dispH / PLAYER_REF_H;
    if (this.carrying && (this.pose === 'idle' || this.pose === 'look')) return Object.assign({ k }, PLAYER_POSES.carry);
    let p = this.pose;
    if (p === 'idle' && this.idleT < 2.5) p = 'look';
    const pose = PLAYER_POSES[p];
    return Object.assign({ k }, pose && Assets.has(pose.s) ? pose : PLAYER_POSES.idle);
  }

  bounds() {
    const h = this.dispH;
    const w = this.hitW * this.charScale;
    return { x: this.x - w / 2, y: this.y - h, w, h };
  }

  draw(r) {
    if (!this.visible || this.alpha <= 0) return;
    const c = r.ctx;
    const f = this.frame();
    const im = Assets.img(f.s);
    const pres = this.presence();
    if (im && pres > 0.01) {
      const lift = this.lift();
      const seen = Math.min(1, pres);
      // shadow: shrinks while the cut-out is edge-on or off the floor
      c.save();
      c.globalAlpha = 0.28 * this.alpha * (0.4 + 0.6 * seen);
      c.fillStyle = '#1a120c';
      const sr = 42 * this.charScale * this.scaleMul * (0.45 + 0.55 * seen) * (1 + lift / 90);
      c.beginPath(); c.ellipse(this.x, this.y - 2, Math.max(4, sr), 9 * this.charScale * (0.6 + 0.4 * seen), 0, 0, Math.PI * 2); c.fill();
      c.restore();
      let sy = this.hop ? 1 + (1 - seen) * 0.06 : 1 + Math.sin(this.breath * 2.1) * 0.006;
      sy -= this.squash;
      const sx = (1 + this.squash * 0.6) * pres;
      const w = im.naturalWidth * f.k * sx, h = im.naturalHeight * f.k * sy;
      const h0 = this.hop;
      const lean = h0 && h0.kind === 'jump' ? (1 - seen) * 0.06 * Math.sign((h0.tx - h0.fx) || this.facing) : 0;
      c.save();
      if (this.alpha < 1) c.globalAlpha = this.alpha;
      c.translate(this.x, this.y + lift);
      if (lean) c.rotate(lean);
      if (this.facing < 0) c.scale(-1, 1);
      c.drawImage(im, -w * f.ax, -h, w, h);
      c.restore();
    }
    if (this.motes.length) this.drawMotes(c);
  }

  // Drawn like the art: soft paper-white dust clouds and little gold stars, both with an ink
  // outline so they read on a pale floor as well as a dark street.
  drawMotes(c) {
    c.save();
    c.lineJoin = 'round';
    for (const m of this.motes) {
      const t = m.life / m.max;
      if (m.kind === 'puff') {
        c.globalAlpha = Math.min(1, t * 1.6) * 0.9 * this.alpha;
        c.fillStyle = '#f8f0e0';
        c.strokeStyle = 'rgba(70,50,34,.55)';
        c.lineWidth = 1.4 * this.charScale;
        c.beginPath(); c.ellipse(m.x, m.y, m.size, m.size * 0.7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      } else {
        c.globalAlpha = Math.min(1, t * 1.8) * this.alpha;
        const s = m.size * (0.55 + t * 0.6);
        c.fillStyle = '#f7cd5c';
        c.strokeStyle = 'rgba(58,40,24,.8)';
        c.lineWidth = 1.3 * this.charScale;
        c.beginPath();
        c.moveTo(m.x, m.y - s);
        c.quadraticCurveTo(m.x + s * 0.18, m.y - s * 0.18, m.x + s, m.y);
        c.quadraticCurveTo(m.x + s * 0.18, m.y + s * 0.18, m.x, m.y + s);
        c.quadraticCurveTo(m.x - s * 0.18, m.y + s * 0.18, m.x - s, m.y);
        c.quadraticCurveTo(m.x - s * 0.18, m.y - s * 0.18, m.x, m.y - s);
        c.fill(); c.stroke();
      }
    }
    c.restore();
  }

  drawEmote(r, t) {
    if (!this.emote || !this.visible) return;
    const c = r.ctx;
    const x = this.x, y = this.y - this.dispH - 18 + Math.sin(t * 4) * 3;
    const bub = Assets.img('icon_speech');
    const s = 46 * clamp(this.charScale * 1.2, 0.7, 1);
    c.save();
    const pop = clamp((this.emoteAge || 0) * 6, 0, 1) * Math.min(1, this.presence());
    c.translate(x, y); c.scale(pop, pop);
    if (bub) c.drawImage(bub, -s / 2, -s, s, s * bub.naturalHeight / bub.naturalWidth);
    const icons = { heart: 'icon_heart', star: 'icon_star', coin: 'icon_coin', wrench: 'icon_wrench', clock: 'icon_clock', washer: 'icon_washer', basket: 'icon_basket' };
    if (icons[this.emote]) {
      const im = Assets.img(icons[this.emote]);
      if (im) c.drawImage(im, -s * 0.28, -s * 0.84, s * 0.56, s * 0.56);
    } else {
      c.font = `700 ${Math.round(s * 0.5)}px Fraunces`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#3a2a1e';
      c.fillText(this.emote, 0, -s * 0.57);
    }
    c.restore();
  }

  near(x, y, d = 30) { return dist(this.x, this.y, x, y) < d; }
}
