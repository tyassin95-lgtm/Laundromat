// Procedural "hand-painted" background painter used to bake scene art for The Last Laundromat.
// Runs in a browser (headless Chromium via tools/bake_backgrounds.mjs). All coordinates are in
// virtual game pixels; the painter scales to the bake resolution itself.
(function (global) {
  'use strict';

  const PAL = {
    ink: '#2a1c14', ink2: '#3a2a1f',
    cream: '#efdcb2', creamD: '#cdb68a', creamL: '#f7ead0',
    teal: '#3f6c74', tealD: '#2b4d55', tealL: '#5f8f94', tealXL: '#86aeb0',
    rust: '#c4692e', rustD: '#8f4620', orange: '#e08a3c',
    gold: '#e8b04e', light: '#ffd98a', lightL: '#fff0c8',
    brick: '#8e4c33', brickD: '#6e3826', brickL: '#a8633f', mortar: '#5e463a',
    wood: '#a86b3c', woodD: '#74462a', woodL: '#c98b52',
    sage: '#8b9a78', sageD: '#6e7d5f', sageL: '#a7b392',
    night: '#1c2638', night2: '#2a3a52', night3: '#3d5572',
    grass: '#6f7d3c', grassD: '#56612e', grassL: '#8e9a4c',
    stone: '#9b927f', stoneD: '#77705f', stoneL: '#b8af98',
    asphalt: '#4a4744', asphaltD: '#383532',
  };

  // ------------------------------------------------------------------ random
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + (hi - lo) * f();
    f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.gauss = () => { let u = 0, v = 0; while (!u) u = f(); while (!v) v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return f;
  }

  // ------------------------------------------------------------------ colour helpers
  function hexToRgb(h) {
    if (h.startsWith('rgb')) { const m = h.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2] }; }
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbStr(c, a) { return a === undefined ? `rgb(${c.r | 0},${c.g | 0},${c.b | 0})` : `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`; }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbStr({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
  }
  function shade(c, k) { // k<0 darker, k>0 lighter
    return k < 0 ? mix(c, '#140d08', -k) : mix(c, '#fff6e6', k);
  }
  function jitterColor(c, r, amt) {
    const C = hexToRgb(c);
    const d = (r() - 0.5) * 2 * amt;
    const w = (r() - 0.5) * amt * 0.6;
    return rgbStr({ r: C.r * (1 + d) + w * 40, g: C.g * (1 + d), b: C.b * (1 + d) - w * 30 });
  }

  // ------------------------------------------------------------------ noise
  function valueNoise2D(seed) {
    const r = rng(seed);
    const P = new Uint8Array(512);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
    const V = new Float32Array(256).map(() => r());
    const sm = t => t * t * (3 - 2 * t);
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const a = V[P[(P[xi & 255] + yi) & 255]], b = V[P[(P[(xi + 1) & 255] + yi) & 255]];
      const c = V[P[(P[xi & 255] + yi + 1) & 255]], d = V[P[(P[(xi + 1) & 255] + yi + 1) & 255]];
      const u = sm(xf), v = sm(yf);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  function fbm(noise, x, y, oct) {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += amp * noise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  }

  // ------------------------------------------------------------------ Painter
  class Painter {
    constructor(w, h, scale, seed) {
      this.w = w; this.h = h; this.S = scale;
      this.canvas = document.createElement('canvas');
      this.canvas.width = Math.round(w * scale);
      this.canvas.height = Math.round(h * scale);
      this.ctx = this.canvas.getContext('2d');
      this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.seed = seed || 1;
      this.r = rng(this.seed);
      this.PAL = PAL;
    }
    rand(seed) { return rng(seed === undefined ? Math.floor(this.r() * 1e9) : seed); }

    // --- basic shapes -------------------------------------------------------------
    rect(x, y, w, h, fill) { const c = this.ctx; c.fillStyle = fill; c.fillRect(x, y, w, h); }
    poly(pts, fill, stroke, lw) {
      const c = this.ctx; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
    }
    ellipse(x, y, rx, ry, fill, stroke, lw) {
      const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
    }
    vgrad(x, y, w, h, stops) {
      const g = this.ctx.createLinearGradient(0, y, 0, y + h);
      stops.forEach(([t, col]) => g.addColorStop(t, col));
      this.ctx.fillStyle = g; this.ctx.fillRect(x, y, w, h);
    }
    hgrad(x, y, w, h, stops) {
      const g = this.ctx.createLinearGradient(x, 0, x + w, 0);
      stops.forEach(([t, col]) => g.addColorStop(t, col));
      this.ctx.fillStyle = g; this.ctx.fillRect(x, y, w, h);
    }
    clip(fn, drawPath) {
      const c = this.ctx; c.save(); c.beginPath(); drawPath(c); c.clip(); fn(); c.restore();
    }
    clipRect(x, y, w, h, fn) { this.clip(fn, c => c.rect(x, y, w, h)); }

    // --- ink ------------------------------------------------------------------------
    // Wobbly hand-inked polyline. pts in virtual px.
    ink(pts, width, color, opts) {
      opts = opts || {};
      const c = this.ctx, r = this.rand(opts.seed);
      const wob = opts.wobble === undefined ? 0.6 : opts.wobble;
      const closed = !!opts.closed;
      const P = closed ? pts.concat([pts[0]]) : pts;
      // subdivide
      const pts2 = [];
      for (let i = 0; i < P.length - 1; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[i + 1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        const n = Math.max(1, Math.ceil(len / 14));
        for (let k = 0; k < n; k++) {
          const t = k / n;
          pts2.push([x0 + (x1 - x0) * t + (r() - 0.5) * wob, y0 + (y1 - y0) * t + (r() - 0.5) * wob]);
        }
      }
      pts2.push([P[P.length - 1][0], P[P.length - 1][1]]);
      c.save();
      c.strokeStyle = color || PAL.ink;
      c.globalAlpha = opts.alpha === undefined ? 1 : opts.alpha;
      // draw segments with varying width for a brush feel
      for (let i = 0; i < pts2.length - 1; i++) {
        c.beginPath();
        c.lineWidth = width * (0.8 + r() * 0.45);
        c.moveTo(pts2[i][0], pts2[i][1]);
        c.lineTo(pts2[i + 1][0], pts2[i + 1][1]);
        c.stroke();
      }
      c.restore();
    }
    inkRect(x, y, w, h, width, color, opts) {
      this.ink([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], width, color, Object.assign({ closed: true }, opts || {}));
    }
    inkEllipse(cx, cy, rx, ry, width, color, opts) {
      const pts = [];
      const n = Math.max(12, Math.round((rx + ry) / 3));
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
      this.ink(pts, width, color, Object.assign({ closed: true }, opts || {}));
    }

    // --- texture passes -------------------------------------------------------------
    // Paint many soft strokes inside a rect: gives the brushy painted texture.
    strokes(x, y, w, h, opts) {
      const c = this.ctx, r = this.rand(opts.seed);
      const n = opts.count || Math.round(w * h / 90);
      const cols = opts.colors;
      const ang = opts.angle || 0, angJ = opts.angleJitter === undefined ? 0.25 : opts.angleJitter;
      c.save();
      if (opts.clip) { c.beginPath(); opts.clip(c); c.clip(); }
      for (let i = 0; i < n; i++) {
        const px = x + r() * w, py = y + r() * h;
        const L = (opts.len || 14) * (0.5 + r());
        const a = ang + (r() - 0.5) * angJ * 2;
        c.strokeStyle = r.pick(cols);
        c.globalAlpha = (opts.alpha || 0.18) * (0.5 + r());
        c.lineWidth = (opts.width || 3) * (0.6 + r() * 0.8);
        c.beginPath();
        c.moveTo(px - Math.cos(a) * L / 2, py - Math.sin(a) * L / 2);
        c.quadraticCurveTo(px + (r() - 0.5) * 3, py + (r() - 0.5) * 3, px + Math.cos(a) * L / 2, py + Math.sin(a) * L / 2);
        c.stroke();
      }
      c.restore();
    }
    // Irregular worn-paint specks (like the rust flecks on the sprites).
    specks(x, y, w, h, opts) {
      const c = this.ctx, r = this.rand(opts.seed);
      const n = opts.count || Math.round(w * h / 400);
      c.save();
      if (opts.clip) { c.beginPath(); opts.clip(c); c.clip(); }
      for (let i = 0; i < n; i++) {
        const px = x + r() * w, py = y + r() * h;
        const s = (opts.size || 2) * (0.4 + r() * r() * 2.2);
        c.fillStyle = r.pick(opts.colors);
        c.globalAlpha = (opts.alpha || 0.7) * (0.5 + r() * 0.5);
        c.beginPath();
        const k = 5 + Math.floor(r() * 4);
        for (let j = 0; j < k; j++) {
          const a = j / k * Math.PI * 2, rr = s * (0.5 + r() * 0.8);
          const X = px + Math.cos(a) * rr * (opts.stretch || 1.4), Y = py + Math.sin(a) * rr;
          j ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.closePath(); c.fill();
      }
      c.restore();
    }
    // Low-frequency mottling (multiply-ish darkening + lightening) over a region.
    mottle(x, y, w, h, opts) {
      const S = this.S, c = this.ctx;
      const X = Math.floor(x * S), Y = Math.floor(y * S), W = Math.ceil(w * S), H = Math.ceil(h * S);
      if (W <= 0 || H <= 0) return;
      const img = c.getImageData(X, Y, W, H), d = img.data;
      const noise = valueNoise2D(opts.seed || 7);
      const sc = (opts.scale || 60) * S, amt = opts.amount || 0.08;
      const tint = opts.tint ? hexToRgb(opts.tint) : null;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const k = (j * W + i) * 4;
          if (d[k + 3] === 0) continue;
          const n = fbm(noise, (X + i) / sc, (Y + j) / sc, 3) - 0.5;
          const f = 1 + n * 2 * amt;
          if (tint && n < 0) {
            const t = -n * 2 * (opts.tintAmount || 0.3);
            d[k] = d[k] * (1 - t) + tint.r * t; d[k + 1] = d[k + 1] * (1 - t) + tint.g * t; d[k + 2] = d[k + 2] * (1 - t) + tint.b * t;
          }
          d[k] *= f; d[k + 1] *= f; d[k + 2] *= f;
        }
      }
      c.putImageData(img, X, Y);
    }
    // Fine grain over the whole canvas (or a region).
    grain(amount, opts) {
      opts = opts || {};
      const c = this.ctx, W = this.canvas.width, H = this.canvas.height;
      const img = c.getImageData(0, 0, W, H), d = img.data;
      const r = this.rand(opts.seed || 99);
      for (let k = 0; k < d.length; k += 4) {
        if (d[k + 3] === 0) continue;
        const n = (r() - 0.5) * 2 * amount * 255;
        const warm = (r() - 0.5) * amount * 60;
        d[k] += n + warm; d[k + 1] += n; d[k + 2] += n - warm;
      }
      c.putImageData(img, 0, 0);
    }
    // Paper-like fibrous texture for surfaces (subtle streaks).
    fibres(x, y, w, h, opts) {
      this.strokes(x, y, w, h, Object.assign({ len: 22, width: 1, alpha: 0.08, angleJitter: 0.1 }, opts));
    }

    // --- light ---------------------------------------------------------------------
    glow(x, y, r, color, alpha, op) {
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = op || 'lighter';
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const C = hexToRgb(color);
      g.addColorStop(0, rgbStr(C, alpha));
      g.addColorStop(0.35, rgbStr(C, alpha * 0.45));
      g.addColorStop(1, rgbStr(C, 0));
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
      c.restore();
    }
    // Cone of light from a lamp downward.
    lightCone(x, y, topW, botW, h, color, alpha) {
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(0, y, 0, y + h);
      const C = hexToRgb(color);
      g.addColorStop(0, rgbStr(C, alpha));
      g.addColorStop(1, rgbStr(C, 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - topW / 2, y); c.lineTo(x + topW / 2, y); c.lineTo(x + botW / 2, y + h); c.lineTo(x - botW / 2, y + h);
      c.closePath(); c.fill();
      c.restore();
    }
    shadeOverlay(x, y, w, h, color, alpha, op) {
      const c = this.ctx; c.save(); c.globalCompositeOperation = op || 'multiply'; c.globalAlpha = alpha; c.fillStyle = color; c.fillRect(x, y, w, h); c.restore();
    }
    vshade(x, y, w, h, color, a0, a1, op) {
      const c = this.ctx; c.save(); c.globalCompositeOperation = op || 'multiply';
      const g = c.createLinearGradient(0, y, 0, y + h);
      const C = hexToRgb(color);
      g.addColorStop(0, rgbStr(C, a0)); g.addColorStop(1, rgbStr(C, a1));
      c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
    }
    hshade(x, y, w, h, color, a0, a1, op) {
      const c = this.ctx; c.save(); c.globalCompositeOperation = op || 'multiply';
      const g = c.createLinearGradient(x, 0, x + w, 0);
      const C = hexToRgb(color);
      g.addColorStop(0, rgbStr(C, a0)); g.addColorStop(1, rgbStr(C, a1));
      c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
    }
    vignette(strength) {
      const c = this.ctx, w = this.w, h = this.h;
      c.save(); c.globalCompositeOperation = 'multiply';
      const g = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, `rgba(${80},${60},${50},${strength})`);
      // multiply would fill transparent holes (windows, sky), so restore the original alpha afterwards
      const keep = document.createElement('canvas'); keep.width = this.canvas.width; keep.height = this.canvas.height;
      keep.getContext('2d').drawImage(this.canvas, 0, 0);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(keep, 0, 0);
      c.restore();
    }

    // --- text -----------------------------------------------------------------------
    text(str, x, y, font, color, opts) {
      opts = opts || {};
      const c = this.ctx; c.save();
      c.font = font; c.textAlign = opts.align || 'center'; c.textBaseline = opts.baseline || 'middle';
      if (opts.rotate) { c.translate(x, y); c.rotate(opts.rotate); x = 0; y = 0; }
      if (opts.scaleX) { c.translate(x, y); c.scale(opts.scaleX, 1); x = 0; y = 0; }
      if (opts.outline) { c.lineWidth = opts.outlineWidth || 4; c.strokeStyle = opts.outline; c.strokeText(str, x, y); }
      if (opts.shadow) { c.shadowColor = opts.shadow; c.shadowBlur = opts.shadowBlur || 8; }
      c.globalAlpha = opts.alpha === undefined ? 1 : opts.alpha;
      c.fillStyle = color; c.fillText(str, x, y);
      c.restore();
    }

    // --- composite building blocks -------------------------------------------------------
    brickWall(x, y, w, h, o) {
      o = o || {};
      const r = this.rand(o.seed), c = this.ctx;
      const bw = o.bw || 30, bh = o.bh || 11;
      const cols = o.colors || [PAL.brick, PAL.brickD, PAL.brickL, '#955238', '#7d4230'];
      this.rect(x, y, w, h, o.mortar || PAL.mortar);
      this.clipRect(x, y, w, h, () => {
        for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
          const off = (row % 2) * bw / 2 - bw / 2;
          for (let xx = x + off; xx < x + w; xx += bw) {
            const col = jitterColor(r.pick(cols), r, 0.08);
            c.fillStyle = col;
            const gx = 1.2 + r() * 0.8, gy = 1.2 + r() * 0.6;
            c.beginPath();
            c.moveTo(xx + gx + r() * 1, yy + gy);
            c.lineTo(xx + bw - gx, yy + gy + (r() - 0.5));
            c.lineTo(xx + bw - gx + (r() - 0.5), yy + bh - gy);
            c.lineTo(xx + gx, yy + bh - gy + (r() - 0.5));
            c.closePath(); c.fill();
            if (r() < 0.35) { c.fillStyle = 'rgba(255,230,200,0.08)'; c.fillRect(xx + gx, yy + gy, bw - 2 * gx, 2); }
          }
        }
      });
      this.strokes(x, y, w, h, { colors: [PAL.brickD, PAL.brickL, '#5a3325'], len: 10, width: 2, alpha: 0.12, seed: r.int(1, 1e6), clip: cc => cc.rect(x, y, w, h) });
      this.specks(x, y, w, h, { colors: ['#d8b89a', '#3d2418', '#b5704a'], size: 1.2, count: Math.round(w * h / 250), alpha: 0.35, seed: r.int(1, 1e6), clip: cc => cc.rect(x, y, w, h) });
    }
    planks(x, y, w, h, o) {
      o = o || {};
      const r = this.rand(o.seed), c = this.ctx;
      const ph = o.plankH || 16, vertical = !!o.vertical;
      const cols = o.colors || [PAL.wood, PAL.woodL, '#9a5f35', '#b27442'];
      this.clipRect(x, y, w, h, () => {
        if (!vertical) {
          for (let yy = y; yy < y + h; yy += ph) {
            let xx = x - r() * 120;
            while (xx < x + w) {
              const L = (o.len || 140) * (0.6 + r() * 0.9);
              c.fillStyle = jitterColor(r.pick(cols), r, 0.07);
              c.fillRect(xx, yy, L, ph);
              c.fillStyle = 'rgba(40,24,14,0.55)'; c.fillRect(xx + L - 1, yy, 1.4, ph);
              xx += L;
            }
            c.fillStyle = 'rgba(40,24,14,0.5)'; c.fillRect(x, yy + ph - 1.2, w, 1.2);
            c.fillStyle = 'rgba(255,230,190,0.12)'; c.fillRect(x, yy, w, 1.2);
          }
        } else {
          for (let xx = x; xx < x + w; xx += ph) {
            c.fillStyle = jitterColor(r.pick(cols), r, 0.07);
            c.fillRect(xx, y, ph, h);
            c.fillStyle = 'rgba(40,24,14,0.5)'; c.fillRect(xx + ph - 1.2, y, 1.2, h);
            c.fillStyle = 'rgba(255,230,190,0.1)'; c.fillRect(xx, y, 1.2, h);
          }
        }
      });
      this.strokes(x, y, w, h, { colors: [PAL.woodD, '#5e3820', PAL.woodL], len: 26, width: 1.2, alpha: 0.18, angle: vertical ? Math.PI / 2 : 0, angleJitter: 0.04, seed: r.int(1, 1e6), clip: cc => cc.rect(x, y, w, h) });
    }
    tiles(x, y, w, h, o) {
      o = o || {};
      const r = this.rand(o.seed), c = this.ctx;
      const tw = o.tw || 20, th = o.th || 10;
      const cols = o.colors || [PAL.cream, PAL.creamL, '#e6d1a4'];
      this.rect(x, y, w, h, o.grout || '#9e8f72');
      this.clipRect(x, y, w, h, () => {
        for (let row = 0, yy = y; yy < y + h; row++, yy += th) {
          const off = o.brick ? (row % 2) * tw / 2 : 0;
          for (let xx = x - off; xx < x + w; xx += tw) {
            c.fillStyle = jitterColor(r.pick(cols), r, 0.04);
            c.fillRect(xx + 0.9, yy + 0.9, tw - 1.8, th - 1.8);
            c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(xx + 1.5, yy + 1.4, tw - 4, 1.2);
          }
        }
      });
    }
    // Front-facing window: frame + glass (optional hole) + mullions + sill.
    window(x, y, w, h, o) {
      o = o || {};
      const c = this.ctx;
      const fr = o.frame || PAL.cream, frD = shade(fr, -0.3), t = o.frameW || 7;
      if (o.glass) { this.rect(x + t, y + t, w - 2 * t, h - 2 * t, o.glass); }
      if (o.hole) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect(x + t, y + t, w - 2 * t, h - 2 * t); c.restore(); }
      if (o.inside) o.inside(x + t, y + t, w - 2 * t, h - 2 * t);
      // frame
      this.rect(x, y, w, t, fr); this.rect(x, y + h - t, w, t, fr); this.rect(x, y, t, h, fr); this.rect(x + w - t, y, t, h, fr);
      const cols = o.cols || 2, rows = o.rows || 2;
      for (let i = 1; i < cols; i++) this.rect(x + (w * i / cols) - t * 0.35, y, t * 0.7, h, fr);
      for (let j = 1; j < rows; j++) this.rect(x, y + (h * j / rows) - t * 0.35, w, t * 0.7, fr);
      this.rect(x + t, y + t, w - 2 * t, 2, 'rgba(0,0,0,0.25)');
      this.inkRect(x, y, w, h, 1.6, PAL.ink, { seed: o.seed });
      this.inkRect(x + t, y + t, w - 2 * t, h - 2 * t, 1.1, frD, { seed: (o.seed || 1) + 3, alpha: 0.8 });
      if (o.sill !== false) {
        this.rect(x - 6, y + h, w + 12, 7, shade(fr, -0.05));
        this.rect(x - 6, y + h + 7, w + 12, 3, frD);
        this.inkRect(x - 6, y + h, w + 12, 10, 1.3, PAL.ink, { seed: (o.seed || 1) + 5 });
      }
    }
    awning(x, y, w, h, o) {
      o = o || {};
      const c = this.ctx, r = this.rand(o.seed);
      const stripes = o.stripes || 9, cA = o.a || PAL.teal, cB = o.b || PAL.cream;
      const drop = o.drop || 16;
      for (let i = 0; i < stripes; i++) {
        const x0 = x + w * i / stripes, x1 = x + w * (i + 1) / stripes;
        c.fillStyle = i % 2 ? cB : cA;
        c.beginPath(); c.moveTo(x0 + (x0 - x - w / 2) * -0.04, y); c.lineTo(x1 + (x1 - x - w / 2) * -0.04, y); c.lineTo(x1, y + h); c.lineTo(x0, y + h); c.closePath(); c.fill();
        // scalloped valance
        c.beginPath(); c.moveTo(x0, y + h); c.lineTo(x1, y + h); c.lineTo(x1, y + h + drop * 0.55);
        c.quadraticCurveTo((x0 + x1) / 2, y + h + drop * 1.15, x0, y + h + drop * 0.55); c.closePath(); c.fill();
      }
      this.vshade(x, y, w, h, '#000000', 0.0, 0.28);
      this.strokes(x, y, w, h + drop, { colors: ['rgba(255,240,220,1)', 'rgba(60,30,20,1)'], len: 18, width: 2, alpha: 0.07, angle: Math.PI / 2, seed: r.int(1, 1e6), clip: cc => cc.rect(x - 5, y, w + 10, h + drop) });
      this.ink([[x + w * 0.04, y], [x + w * 0.96, y]], 2, PAL.ink, { seed: r.int(1, 1e6) });
      this.ink([[x + w * 0.04, y], [x, y + h], [x + w, y + h], [x + w * 0.96, y]], 1.8, PAL.ink, { seed: r.int(1, 1e6) });
      for (let i = 0; i < stripes; i++) {
        const x0 = x + w * i / stripes, x1 = x + w * (i + 1) / stripes;
        const pts = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8; const xx = x0 + (x1 - x0) * t; const yy = y + h + drop * 0.55 + Math.sin(t * Math.PI) * drop * 0.3; pts.push([xx, yy]); }
        this.ink(pts, 1.5, PAL.ink, { seed: r.int(1, 1e6), wobble: 0.3 });
      }
    }
    // A glowing interior seen through glass, used for lit windows at night.
    litInterior(x, y, w, h, o) {
      o = o || {};
      const r = this.rand(o.seed), c = this.ctx;
      const warm = o.color || '#f2b85e';
      this.vgrad(x, y, w, h, [[0, shade(warm, 0.25)], [0.6, warm], [1, shade(warm, -0.35)]]);
      // silhouettes of furniture / shelves
      c.save(); c.globalAlpha = 0.25; c.fillStyle = '#7a4b2a';
      for (let i = 0; i < (o.props || 3); i++) {
        const px = x + r() * w * 0.8, pw = w * (0.12 + r() * 0.25), ph = h * (0.2 + r() * 0.45);
        c.fillRect(px, y + h - ph, pw, ph);
      }
      c.restore();
      if (o.curtains) {
        c.fillStyle = o.curtains;
        c.globalAlpha = 0.85;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.22, y); c.quadraticCurveTo(x + w * 0.12, y + h * 0.5, x + w * 0.2, y + h); c.lineTo(x, y + h); c.fill();
        c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w * 0.78, y); c.quadraticCurveTo(x + w * 0.88, y + h * 0.5, x + w * 0.8, y + h); c.lineTo(x + w, y + h); c.fill();
        c.globalAlpha = 1;
      }
    }

    toDataURL(type, q) { return this.canvas.toDataURL(type || 'image/webp', q || 0.88); }
  }

  global.Paint = { Painter, PAL, rng, mix, shade, hexToRgb, rgbStr, jitterColor, valueNoise2D, fbm };
})(window);
