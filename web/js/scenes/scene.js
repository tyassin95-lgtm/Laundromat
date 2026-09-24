// Base scene: camera, drawable entities sorted by depth, tap targets, lighting helpers.
import { clamp, damp, lerp } from '../engine/util.js';
import { Particles, Rain } from '../engine/particles.js';
import { G } from '../game/state.js';

// Ambient light colour for a time of day (minutes) and weather.
export function ambientFor(time, weather, interior) {
  const h = time / 60;
  // keyframes: [hour, [r,g,b]]
  const ext = [[5, [70, 78, 120]], [6.5, [200, 170, 170]], [8, [250, 245, 235]], [16.5, [255, 250, 240]], [18.3, [255, 196, 150]], [19.5, [150, 120, 150]], [20.5, [72, 82, 128]], [24, [60, 70, 115]], [29, [70, 78, 120]]];
  const inn = [[5, [112, 112, 148]], [7, [225, 215, 210]], [9, [255, 252, 245]], [16.5, [255, 250, 242]], [18.5, [232, 200, 172]], [20, [150, 142, 172]], [21.5, [108, 108, 146]], [24, [98, 100, 138]], [29, [112, 112, 148]]];
  const keys = interior ? inn : ext;
  let hh = h < 5 ? h + 24 : h;
  let c = keys[keys.length - 1][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [h0, c0] = keys[i], [h1, c1] = keys[i + 1];
    if (hh >= h0 && hh <= h1) {
      const t = (hh - h0) / (h1 - h0);
      c = [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t)];
      break;
    }
  }
  const wf = weather === 'storm' ? 0.78 : weather === 'rain' ? 0.88 : weather === 'cloudy' ? 0.94 : 1;
  const cool = weather === 'rain' || weather === 'storm' ? [0.97, 1, 1.04] : [1, 1, 1];
  return [clamp(c[0] * wf * cool[0], 0, 255), clamp(c[1] * wf * cool[1], 0, 255), clamp(c[2] * wf * cool[2], 0, 255)];
}

// 0 (full day) .. 1 (full night) — useful for lamps and lit windows.
export function nightness(time) {
  const h = time / 60;
  if (h >= 20.5 || h < 5) return 1;
  if (h >= 17.5) return clamp((h - 17.5) / 3, 0, 1);
  if (h < 7) return clamp((7 - h) / 2, 0, 1);
  return 0;
}

export class Scene {
  constructor(app, o = {}) {
    this.app = app;
    this.worldW = o.worldW || 1920;
    this.interior = o.interior !== false;
    this.ents = [];            // {z, draw(r, t), hit?:{x,y,w,h}, tap?:fn, id}
    this.actors = [];
    this.particles = new Particles();
    this.rain = new Rain();
    this.camTarget = null;
    this.freeCam = 0;
    this.t = 0;
    this.lights = [];
    this.walkBand = o.walkBand || [540, 690];
    this.charScale = o.charScale || 1;
  }

  enter() {}
  exit() {}

  get r() { return this.app.r; }

  // Rooms narrower than the screen zoom in to fill it, keeping the floor in view.
  fitView() {
    const r = this.r;
    if (this.worldW < r.VW) { r.cam.zoom = r.VW / this.worldW; r.cam.y = 360 - 360 / r.cam.zoom; }
    else { r.cam.zoom = 1; r.cam.y = 0; }
  }

  cameraClamp(x) {
    const vw = this.r.VW;
    if (this.worldW <= vw) return (this.worldW - vw) / 2;
    return clamp(x, 0, this.worldW - vw);
  }

  follow(actor, dt, snap) {
    const vw = this.r.VW;
    if (this.freeCam > 0) { this.freeCam -= dt; return; }
    const target = this.cameraClamp(actor.x - vw / 2 + actor.facing * 60);
    this.r.cam.x = snap ? target : damp(this.r.cam.x, target, 3.2, dt);
  }

  pan(dxCss) {
    const dv = dxCss * this.r.dpr / this.r.scale;
    this.r.cam.x = this.cameraClamp(this.r.cam.x - dv);
    this.freeCam = 2.5;
  }

  // Top-most entity whose hit rect contains the world point.
  hitTest(x, y) {
    let best = null;
    for (const e of this.ents) {
      if (!e.tap || !e.hit || e.hidden) continue;
      const h = typeof e.hit === 'function' ? e.hit() : e.hit;
      if (!h) continue;
      const pad = e.pad ?? 10;
      if (x >= h.x - pad && x <= h.x + h.w + pad && y >= h.y - pad && y <= h.y + h.h + pad) {
        const z = (e.tapZ ?? e.z ?? 0);
        if (!best || z > best.z) best = { e, z };
      }
    }
    return best ? best.e : null;
  }

  sortedDrawables() {
    const list = this.ents.filter(e => !e.hidden && e.draw).map(e => ({ z: typeof e.z === 'function' ? e.z() : e.z, d: e }));
    for (const a of this.actors) if (a.visible) list.push({ z: a.y + (a.zBias || 0), d: { draw: (r) => a.draw(r) } });
    list.sort((a, b) => a.z - b.z);
    return list;
  }

  ambient() { return ambientFor(G.time, G.weather, this.interior); }

  // Darken whatever was drawn so far (the view out of the windows) to the outdoor light level.
  tintOutdoors(r) {
    const a = ambientFor(G.time, G.weather, false);
    if (a[0] > 250 && a[1] > 250 && a[2] > 250) return;
    const c = r.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
    c.fillRect(0, 0, r.canvas.width, r.canvas.height);
    c.restore();
  }

  update(dt) { this.t += dt; }
  draw() {}
}
