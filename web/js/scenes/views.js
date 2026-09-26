// What you see out of the windows: Linden Street from the shop, the rooftops from the flat.
// Each is a painted layer (bg/view_*.webp, sky cut out) that slides a little as the camera pans,
// so it reads as far away, over a sky that follows the time of day and the weather, with life
// in it: traffic and people on the street; clouds, birds and chimney smoke over the roofs.
import { Assets } from '../engine/assets.js';
import { rand } from '../engine/util.js';
import { ambientFor, nightness } from './scene.js';

// ------------------------------------------------------------------ sky
const SKY = [   // hour, top, horizon
  [4.5, '#141a33', '#262d52'], [6, '#4a5486', '#e0a38e'], [7.5, '#8ab2d8', '#f1dcc2'], [9, '#8fb8dd', '#e4ecee'],
  [16.5, '#86aed4', '#ece6d6'], [18.2, '#6f88bb', '#f2b27e'], [19.3, '#454a82', '#e0866a'], [20.4, '#1f2750', '#44497a'],
  [24, '#131931', '#232a4c'], [28.5, '#141a33', '#262d52'],
];
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

export function skyColors(time, weather) {
  let h = time / 60;
  if (h < 4.5) h += 24;
  let top = hex(SKY[0][1]), bot = hex(SKY[0][2]);
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) { const k = (h - h0) / (h1 - h0); top = mix(hex(t0), hex(t1), k); bot = mix(hex(b0), hex(b1), k); break; }
  }
  if (weather === 'rain' || weather === 'storm' || weather === 'cloudy') {
    const g = weather === 'cloudy' ? 0.45 : weather === 'rain' ? 0.75 : 0.9;
    const grey = (c, lift) => { const l = (c[0] + c[1] + c[2]) / 3 * lift; return [l, l * 1.02, l * 1.06]; };
    top = mix(top, grey(top, 0.9), g); bot = mix(bot, grey(bot, 0.95), g);
  }
  return [css(top), css(bot)];
}

function fillSky(c, x, y, w, h, time, weather) {
  const [top, bot] = skyColors(time, weather);
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(x, y, w, h);
}

// Clouds drift across (the painted ones in sprites/cloud_*); on wet days they're heavier and grey.
const CLOUDS = [['cloud_s', 22], ['cloud_m', 24], ['cloud_l', 40]];
const newCloud = (w, top, spread) => { const [s, h] = rand.pick(CLOUDS); return { s, h: h * rand.range(0.85, 1.25), x: rand() * w, y: top + rand() * spread, v: 3 + rand() * 5 }; };

function drawClouds(r, list, x0, y0, weather, scale = 1) {
  const wet = weather === 'rain' || weather === 'storm';
  for (const cl of list) {
    r.sprite(cl.s, x0 + cl.x, y0 + cl.y, { h: cl.h * scale * (wet ? 1.4 : 1), ay: 0.5, alpha: wet ? 0.95 : 0.85, filter: wet ? 'grayscale(0.7) brightness(0.78)' : undefined });
  }
}

// ------------------------------------------------------------------ the street outside the shop
const CARS = ['view_car_yellow', 'view_wagon', 'view_van', 'view_taxi'];
const DRY_WALKERS = ['view_ped_bag', 'view_ped_cane', 'view_ped_dog', 'view_ped_kid', 'view_ped_bag'];
const WET_WALKERS = ['view_ped_umbrella', 'view_ped_red_umbrella', 'view_ped_kid', 'view_ped_umbrella'];
// lanes, in view px (the painting is 640 x 600 world px): wheel/foot line and scale
const LANES = {
  far: { y: 482, k: 0.4, speed: [26, 38] },            // far sidewalk: people across the street
  road1: { y: 521, k: 0.5, speed: [150, 230], dir: -1 },  // far lane, right to left
  road2: { y: 556, k: 0.58, speed: [160, 250], dir: 1 },  // near lane, left to right
  near: { y: 598, k: 1.15, speed: [52, 70] },           // our sidewalk, right past the window
};

export class StreetView {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.w = o.w; this.h = o.h; this.follow = o.follow;
    this.movers = []; this.timers = { car: 1, far: 2, near: 5, bike: 14 };
    this.clouds = Array.from({ length: 4 }, (_, i) => Object.assign(newCloud(this.w, 20, 40), { x: i * 180 + rand() * 80 }));
  }

  async load() {
    [this.img, this.lights] = await Promise.all([Assets.bg('view_shop'), Assets.bg('view_shop_lights')]);
  }

  // left edge in world px for a camera position
  left(camX) { return this.x + camX * this.follow; }

  spawn(kind, time, weather) {
    const n = nightness(time);
    const wet = weather === 'rain' || weather === 'storm';
    if (kind === 'car') {
      const lane = rand() < 0.5 ? 'road1' : 'road2';
      const L = LANES[lane];
      this.add({ s: rand.pick(CARS), lane, dir: L.dir, v: rand.range(...L.speed), car: true });
    } else if (kind === 'bike') {
      this.add({ s: 'view_cyclist', lane: 'road2', dir: 1, v: rand.range(90, 120), bob: 0.6 });
    } else {
      const L = LANES[kind];
      const pool = wet ? WET_WALKERS : DRY_WALKERS;
      if (n > 0.8 && rand() < 0.5) return;
      this.add({ s: rand.pick(pool), lane: kind, dir: rand() < 0.5 ? 1 : -1, v: rand.range(...L.speed), bob: 1, ph: rand() * 6 });
    }
  }

  add(m) {
    const im = Assets.img(m.s);
    if (!im) return;
    const L = LANES[m.lane];
    m.k = L.k * (m.car ? 1 : rand.range(0.94, 1.06));
    m.w = im.naturalWidth * m.k; m.hh = im.naturalHeight * m.k;
    m.x = m.dir > 0 ? -m.w : this.w + m.w;
    m.y = L.y;
    this.movers.push(m);
  }

  update(dt, time, weather) {
    const n = nightness(time);
    const storm = weather === 'storm';
    const busy = (1 - n * 0.6) * (storm ? 0.5 : 1);
    for (const k of Object.keys(this.timers)) {
      this.timers[k] -= dt * busy;
      if (this.timers[k] > 0) continue;
      this.spawn(k, time, weather);
      this.timers[k] = k === 'car' ? rand.range(3, 9) : k === 'far' ? rand.range(4, 10) : k === 'near' ? rand.range(9, 22) : rand.range(25, 60);
      if (k === 'bike' && (weather !== 'clear' && weather !== 'cloudy')) this.timers[k] *= 2;
    }
    for (const m of this.movers) { m.x += m.dir * m.v * dt; if (m.bob) m.ph = (m.ph || 0) + dt * 7.5; }
    this.movers = this.movers.filter(m => m.x > -m.w * 1.2 && m.x < this.w + m.w * 1.2);
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > this.w + 80) Object.assign(c, newCloud(this.w, 20, 40), { x: -80 }); }
  }

  // Everything behind the glass, in world space. tint(): darken it to the outdoor light.
  draw(r, t, time, weather, tint) {
    const c = r.ctx;
    const x0 = this.left(r.cam.x), y0 = this.y;
    fillSky(c, x0, y0, this.w, this.h * 0.5, time, weather);
    drawClouds(r, this.clouds, x0, y0, weather);
    if (this.img) c.drawImage(this.img, x0, y0, this.w, this.h);
    const order = ['far', 'road1', 'road2', 'near'];
    for (const lane of order) for (const m of this.movers) if (m.lane === lane) this.drawMover(r, m, x0, y0);
    tint();
    const n = nightness(time);
    if (n > 0.02) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = n;
      if (this.lights) c.drawImage(this.lights, x0, y0, this.w, this.h);
      c.restore();
      for (const m of this.movers) if (m.car) {
        const fx = x0 + m.x + m.dir * m.w * 0.47, ry = y0 + m.y - m.hh * 0.32;
        r.glow(fx, ry, 26, [255, 236, 190], 0.55 * n);
        r.glow(x0 + m.x - m.dir * m.w * 0.47, ry, 12, [255, 60, 50], 0.5 * n);
      }
    }
  }

  drawMover(r, m, x0, y0) {
    const bob = m.bob ? -Math.abs(Math.sin(m.ph)) * 2.2 * m.k * 2 : 0;
    const rot = m.bob ? Math.sin(m.ph) * 0.02 : 0;
    r.sprite(m.s, x0 + m.x, y0 + m.y + bob, { h: m.hh, flip: m.dir < 0, rot });
  }
}

// ------------------------------------------------------------------ rooftops behind the flat
export class RoofView {
  // w, h: the painting's size in world px; k: drawn at this scale (the window is small)
  constructor(o) {
    this.x = o.x; this.y = o.y; this.w = o.w; this.h = o.h; this.follow = o.follow; this.k = o.k || 1;
    this.clouds = Array.from({ length: 5 }, (_, i) => Object.assign(newCloud(o.w, 18, 80), { x: i * 110 + rand() * 60 }));
    this.birds = [];
    this.birdT = 4;
    this.stars = Array.from({ length: 26 }, () => ({ x: rand() * o.w, y: rand() * o.h * 0.45, p: rand() * 6 }));
    this.smoke = [];
  }

  async load() {
    [this.img, this.lights] = await Promise.all([Assets.bg('view_home'), Assets.bg('view_home_lights')]);
  }

  left(camX) { return this.x + camX * this.follow; }

  update(dt, time, weather) {
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > this.w + 80) Object.assign(c, newCloud(this.w, 18, 80), { x: -80 }); }
    const n = nightness(time);
    this.birdT -= dt;
    if (this.birdT <= 0 && n < 0.6 && weather !== 'storm') {
      this.birdT = rand.range(7, 16);
      const dir = rand() < 0.5 ? 1 : -1, y = 40 + rand() * 90;
      const flock = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < flock; i++) this.birds.push({ x: dir > 0 ? -20 - i * 14 : this.w + 20 + i * 14, y: y + (i % 2) * 8 + rand() * 6, v: dir * rand.range(38, 52), ph: rand() * 6 });
    }
    for (const b of this.birds) { b.x += b.v * dt; b.ph += dt * 9; }
    this.birds = this.birds.filter(b => b.x > -60 && b.x < this.w + 60);
    // smoke from the brick chimney between the two nearest roofs
    if (rand() < dt * 1.4) this.smoke.push({ x: 307 + rand() * 4, y: 292, a: 0, s: 3 + rand() * 2 });
    for (const p of this.smoke) { p.a += dt; p.y -= 9 * dt; p.x += (4 + Math.sin(p.a * 2) * 3) * dt; p.s += 3 * dt; }
    this.smoke = this.smoke.filter(p => p.a < 5);
  }

  draw(r, t, time, weather, tint) {
    const c = r.ctx;
    const n = nightness(time);
    const wet = weather === 'rain' || weather === 'storm';
    c.save();
    c.translate(this.left(r.cam.x), this.y);
    c.scale(this.k, this.k);
    fillSky(c, 0, 0, this.w, this.h, time, weather);
    if (n > 0.3 && !wet) {
      for (const s of this.stars) { c.fillStyle = `rgba(255,248,230,${(0.35 + 0.5 * Math.abs(Math.sin(t * 0.8 + s.p))) * n})`; c.fillRect(s.x, s.y, 2, 2); }
      r.sprite('moon', this.w * 0.22, 46, { h: 30, ay: 0.5, alpha: n });
    } else if (!wet && n < 0.5) {
      const h = time / 60;
      r.glow(this.w * (0.1 + 0.8 * Math.min(1, Math.max(0, (h - 7) / 12))), 50 + Math.abs(h - 13) * 6, 70, [255, 240, 200], 0.35 * (1 - n));
    }
    drawClouds(r, this.clouds, 0, 0, weather, 1.3);
    // pigeons wheeling over the rooftops
    for (const b of this.birds) r.sprite(Math.sin(b.ph) > 0 ? 'pigeon_fly_up' : 'pigeon_fly_down', b.x, b.y, { h: 13, ay: 0.5, flip: b.v < 0 });
    if (this.img) c.drawImage(this.img, 0, 0, this.w, this.h);
    for (const p of this.smoke) { c.fillStyle = `rgba(235,232,228,${0.3 * (1 - p.a / 5)})`; c.beginPath(); c.arc(p.x, p.y, p.s, 0, Math.PI * 2); c.fill(); }
    c.restore();
    tint();
    if (n > 0.02 && this.lights) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = n;
      c.translate(this.left(r.cam.x), this.y); c.scale(this.k, this.k);
      c.drawImage(this.lights, 0, 0, this.w, this.h);
      c.restore();
    }
  }
}

export { ambientFor };
