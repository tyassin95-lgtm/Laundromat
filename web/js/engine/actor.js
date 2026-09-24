// Characters in the world. The art is single-frame "paper cut-outs", so motion comes from a
// 4-beat walk (contact / passing / contact / passing), bobbing, sway and squash.
import { Assets } from './assets.js';
import { clamp, dist } from './util.js';

export const PLAYER_POSES = {
  idle: { s: 'player_idle', ax: 0.5 },
  look: { s: 'player_idle_look', ax: 0.47 },
  walk1: { s: 'player_walk1', ax: 0.5 },
  walk2: { s: 'player_walk2', ax: 0.5 },
  carry: { s: 'player_carry', ax: 0.48 },
  load: { s: 'player_load_arms', ax: 0.3 },
  mop: { s: 'player_mop', ax: 0.36 },
  reach: { s: 'player_reach_clean', ax: 0.42 },
  wave: { s: 'player_wave', ax: 0.45 },
  stretch: { s: 'player_stretch', ax: 0.5 },
};
const PLAYER_REF_H = 490;   // natural height of player_idle; all poses share its scale

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
    this.speed = o.speed || 300;
    this.target = null; this.onArrive = null;
    this.walkT = 0; this.moving = false;
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

  walkTo(x, y) {
    this.target = { x, y };
    return new Promise(res => { this.onArrive = res; });
  }
  stop() { this.target = null; this.moving = false; if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(false); } }

  setPose(p, secs) { this.pose = p; this.poseTimer = secs || 0; this.idleT = 0; }
  say(emote, secs = 2.5) { if (this.emote !== emote) this.emoteAge = 0; this.emote = emote; this.emoteT = secs; }

  update(dt) {
    this.breath += dt;
    if (this.emoteT > 0) { this.emoteT -= dt; this.emoteAge = (this.emoteAge || 0) + dt; if (this.emoteT <= 0) this.emote = null; }
    if (this.poseTimer > 0) { this.poseTimer -= dt; if (this.poseTimer <= 0) this.pose = 'idle'; }
    this.squash *= Math.pow(0.001, dt);
    if (this.target) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const d = Math.hypot(dx, dy);
      const sp = this.speed * this.charScale * dt;
      if (d <= sp || d < 1) {
        this.x = this.target.x; this.y = this.target.y;
        this.target = null; this.moving = false; this.walkT = 0;
        this.squash = 0.04;
        if (this.onArrive) { const f = this.onArrive; this.onArrive = null; f(true); }
      } else {
        this.x += dx / d * sp; this.y += dy / d * sp;
        if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
        this.moving = true;
        this.walkT += dt * (this.speed / 300);
      }
      this.idleT = 0;
    } else {
      this.idleT += dt;
    }
  }

  // Which image + anchor to draw right now.
  frame() {
    if (!this.isPlayer) return { s: this.sprite, ax: 0.5, k: this.dispH / (Assets.img(this.sprite)?.naturalHeight || 1) };
    const k = this.dispH / PLAYER_REF_H;
    if (this.moving) {
      if (this.carrying) return Object.assign({ k }, PLAYER_POSES.carry);
      const beat = Math.floor(this.walkT / 0.14) % 4;
      const p = beat === 0 ? 'walk1' : beat === 2 ? 'walk2' : 'look';
      return Object.assign({ k }, PLAYER_POSES[p]);
    }
    if (this.carrying && (this.pose === 'idle' || this.pose === 'look')) return Object.assign({ k }, PLAYER_POSES.carry);
    let p = this.pose;
    if (p === 'idle' && this.idleT < 2.5) p = 'look';
    return Object.assign({ k }, PLAYER_POSES[p] || PLAYER_POSES.idle);
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
    if (!im) return;
    // shadow
    c.save();
    c.globalAlpha = 0.28 * this.alpha;
    c.fillStyle = '#1a120c';
    c.beginPath(); c.ellipse(this.x, this.y - 2, 42 * this.charScale * this.scaleMul, 9 * this.charScale, 0, 0, Math.PI * 2); c.fill();
    c.restore();
    let bob = 0, rot = 0, sy = 1;
    if (this.moving) {
      const ph = this.walkT / 0.14 * Math.PI / 2;
      bob = -Math.abs(Math.sin(ph)) * 5 * this.charScale;
      rot = Math.sin(ph) * (this.isPlayer ? 0.012 : 0.035);
      if (!this.isPlayer) sy = 1 + Math.sin(ph * 2) * 0.012;
    } else {
      sy = 1 + Math.sin(this.breath * 2.1) * 0.006;
    }
    sy -= this.squash;
    const sx = 1 + this.squash * 0.6;
    const w = im.naturalWidth * f.k * sx, h = im.naturalHeight * f.k * sy;
    c.save();
    if (this.alpha < 1) c.globalAlpha = this.alpha;
    c.translate(this.x, this.y + bob);
    if (rot) c.rotate(rot * this.facing);
    if (this.facing < 0) c.scale(-1, 1);
    c.drawImage(im, -w * f.ax, -h, w, h);
    c.restore();
  }

  drawEmote(r, t) {
    if (!this.emote || !this.visible) return;
    const c = r.ctx;
    const x = this.x, y = this.y - this.dispH - 18 + Math.sin(t * 4) * 3;
    const bub = Assets.img('icon_speech');
    const s = 46 * clamp(this.charScale * 1.2, 0.7, 1);
    c.save();
    const pop = clamp((this.emoteAge || 0) * 6, 0, 1);
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
