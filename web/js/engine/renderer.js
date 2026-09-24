// Canvas renderer: fixed 720px virtual height, variable width, camera, sprite drawing and a
// soft 2D lightmap (ambient colour multiplied over the scene, lights added back).
import { Assets } from './assets.js';
import { clamp } from './util.js';

export const VH = 720;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.light = document.createElement('canvas');
    this.lctx = this.light.getContext('2d');
    this.quality = 1;        // 0 low, 1 normal, 2 high
    this.cam = { x: 0, y: 0, zoom: 1, shake: 0 };
    this.resize();
  }

  resize() {
    const cssW = window.innerWidth, cssH = window.innerHeight;
    const maxDpr = this.quality === 2 ? 3 : this.quality === 0 ? 1.25 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = this.canvas.height / VH;          // canvas px per virtual px
    this.VW = this.canvas.width / this.scale;      // virtual width
    this.light.width = Math.ceil(this.VW / 4);
    this.light.height = Math.ceil(VH / 4);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  clear(color) {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = color || '#16110d';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // World transform (camera). Parallax factor p scales camera movement (1 = world).
  world(p = 1) {
    const s = this.scale * this.cam.zoom;
    const sx = this.cam.shake ? (Math.random() - 0.5) * this.cam.shake : 0;
    const sy = this.cam.shake ? (Math.random() - 0.5) * this.cam.shake : 0;
    const cx = this.cam.x * p, cy = this.cam.y * p;
    // zoom around screen centre
    const ox = (this.VW / 2) * (1 - this.cam.zoom) * this.scale;
    const oy = (VH / 2) * (1 - this.cam.zoom) * this.scale;
    this.ctx.setTransform(s, 0, 0, s, -cx * s + ox + sx * this.scale, -cy * s + oy + sy * this.scale);
  }

  screen() { this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0); }

  // CSS px -> world
  toWorld(px, py) {
    const vx = px * this.dpr / this.scale, vy = py * this.dpr / this.scale;
    const z = this.cam.zoom;
    return { x: (vx - this.VW / 2 * (1 - z)) / z + this.cam.x, y: (vy - VH / 2 * (1 - z)) / z + this.cam.y };
  }
  // world -> CSS px
  toScreen(x, y) {
    const z = this.cam.zoom;
    const vx = (x - this.cam.x) * z + this.VW / 2 * (1 - z);
    const vy = (y - this.cam.y) * z + VH / 2 * (1 - z);
    return { x: vx * this.scale / this.dpr, y: vy * this.scale / this.dpr };
  }

  // Draw a manifest sprite. (x, y) is the anchor point (default bottom-centre).
  sprite(name, x, y, o) {
    const im = typeof name === 'string' ? Assets.img(name) : name;
    if (!im) return null;
    o = o || {};
    const k = o.h ? o.h / im.naturalHeight : o.w ? o.w / im.naturalWidth : (o.scale || 1);
    const w = im.naturalWidth * k * (o.sx || 1), h = im.naturalHeight * k * (o.sy || 1);
    const ax = o.ax === undefined ? 0.5 : o.ax, ay = o.ay === undefined ? 1 : o.ay;
    const c = this.ctx;
    const needSave = o.flip || o.rot || o.alpha !== undefined || o.filter || o.comp;
    if (needSave) {
      c.save();
      if (o.alpha !== undefined) c.globalAlpha *= o.alpha;
      if (o.filter) c.filter = o.filter;
      if (o.comp) c.globalCompositeOperation = o.comp;
      c.translate(x, y);
      if (o.rot) c.rotate(o.rot);
      if (o.flip) c.scale(-1, 1);
      c.drawImage(im, -w * ax, -h * ay, w, h);
      c.restore();
    } else {
      c.drawImage(im, x - w * ax, y - h * ay, w, h);
    }
    return { x: x - w * ax, y: y - h * ay, w, h };
  }

  size(name, o) {
    const im = Assets.img(name);
    if (!im) return { w: 0, h: 0 };
    const k = o.h ? o.h / im.naturalHeight : o.w ? o.w / im.naturalWidth : (o.scale || 1);
    return { w: im.naturalWidth * k, h: im.naturalHeight * k };
  }

  // ------------------------------------------------------------------ lighting
  // ambient: [r,g,b] 0..255 (255,255,255 = no darkening). lights: [{x,y,r,c:[r,g,b],i}]
  applyLighting(ambient, lights, camX) {
    const L = this.lctx, w = this.light.width, h = this.light.height;
    if (ambient[0] >= 254 && ambient[1] >= 254 && ambient[2] >= 254 && (!lights || !lights.length)) return;
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.fillStyle = `rgb(${ambient[0] | 0},${ambient[1] | 0},${ambient[2] | 0})`;
    L.fillRect(0, 0, w, h);
    L.globalCompositeOperation = 'lighter';
    const q = 0.25;
    const z = this.cam.zoom;
    for (const li of lights || []) {
      const lx = ((li.x - camX) * z + this.VW / 2 * (1 - z)) * q;
      const ly = ((li.y - this.cam.y) * z + VH / 2 * (1 - z)) * q;
      const r = li.r * q * z;
      if (lx + r < 0 || lx - r > w) continue;
      const i = clamp(li.i, 0, 2);
      const g = L.createRadialGradient(lx, ly, 0, lx, ly, r);
      const [cr, cg, cb] = li.c;
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(1, i)})`);
      g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${Math.min(1, i) * 0.5})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      L.fillStyle = g;
      if (li.sy) { L.save(); L.translate(lx, ly); L.scale(1, li.sy); L.translate(-lx, -ly); L.fillRect(lx - r, ly - r, r * 2, r * 2); L.restore(); }
      else L.fillRect(lx - r, ly - r, r * 2, r * 2);
    }
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'multiply';
    c.drawImage(this.light, 0, 0, this.canvas.width, this.canvas.height);
    c.restore();
  }

  // Additive glow in world space.
  glow(x, y, r, rgb, a, op) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = op || 'lighter';
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
    g.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.35})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  vignette(strength) {
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const W = this.canvas.width, H = this.canvas.height;
    const g = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(10,6,4,0)');
    g.addColorStop(1, `rgba(10,6,4,${strength})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  fillScreen(color, alpha) {
    const c = this.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha; c.fillStyle = color;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height); c.restore();
  }
}
