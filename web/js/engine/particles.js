// Particles (sparkles, hearts, coins, bubbles, steam, leaves...) and weather (rain, rain on glass).
import { Assets } from './assets.js';
import { rand } from './util.js';

export class Particles {
  constructor() { this.ps = []; }

  emit(type, x, y, n = 1, o = {}) {
    for (let i = 0; i < n; i++) {
      const p = { type, x, y, vx: 0, vy: 0, life: 1, age: 0, size: 1, rot: 0, vr: 0, alpha: 1, g: 0, drag: 0, color: o.color };
      switch (type) {
        case 'sparkle':
          p.vx = rand.range(-60, 60); p.vy = rand.range(-110, -30); p.life = rand.range(0.5, 1.0); p.size = rand.range(3, 7); p.g = 60; break;
        case 'heart':
          p.vx = rand.range(-25, 25); p.vy = rand.range(-90, -60); p.life = 1.5; p.size = rand.range(22, 30); p.vr = rand.range(-0.6, 0.6); break;
        case 'coin':
          p.vx = rand.range(-40, 40); p.vy = rand.range(-260, -180); p.life = 0.9; p.size = rand.range(22, 28); p.g = 520; p.vr = rand.range(-6, 6); break;
        case 'bubble':
          p.vx = rand.range(-15, 15); p.vy = rand.range(-50, -25); p.life = rand.range(1.5, 3); p.size = rand.range(3, 9); p.phase = rand() * 6; break;
        case 'steam':
          p.vx = rand.range(-8, 8); p.vy = rand.range(-40, -25); p.life = rand.range(1.2, 2.2); p.size = rand.range(6, 12); p.grow = 14; break;
        case 'smoke':
          p.vx = rand.range(-12, 12); p.vy = rand.range(-50, -30); p.life = rand.range(1.2, 2); p.size = rand.range(8, 14); p.grow = 16; break;
        case 'dust':
          p.vx = rand.range(-6, 6); p.vy = rand.range(-4, 4); p.life = rand.range(4, 8); p.size = rand.range(1, 2.2); p.phase = rand() * 6; break;
        case 'splash':
          p.vx = rand.range(-70, 70); p.vy = rand.range(-140, -60); p.life = 0.45; p.size = rand.range(1.5, 3); p.g = 700; break;
        case 'leaf':
          p.vx = rand.range(20, 60); p.vy = rand.range(25, 50); p.life = rand.range(5, 9); p.size = rand.range(11, 17); p.vr = rand.range(-2, 2); p.phase = rand() * 6;
          p.sprite = rand.pick(['leaf_maple', 'leaf_linden', 'leaf_oak']); break;
        case 'note':
          p.vx = rand.range(-20, 20); p.vy = rand.range(-50, -35); p.life = 2; p.size = rand.range(14, 20); p.phase = rand() * 6; p.glyph = rand.pick(['♪', '♫']); break;
        case 'zzz':
          p.vx = rand.range(5, 15); p.vy = -22; p.life = 2.2; p.size = rand.range(12, 18); break;
        case 'lint':
          p.vx = rand.range(-30, 30); p.vy = rand.range(-50, -10); p.life = 1.4; p.size = rand.range(2, 4); p.g = 40; break;
        default: break;
      }
      Object.assign(p, o.override || {});
      p.x += (o.spread || 0) * (rand() - 0.5);
      p.y += (o.spreadY || 0) * (rand() - 0.5);
      p.max = p.life;
      this.ps.push(p);
    }
  }

  update(dt) {
    const ps = this.ps;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.age += dt;
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.type === 'bubble' || p.type === 'dust' || p.type === 'note') p.vx += Math.sin(p.age * 3 + p.phase) * 20 * dt;
      if (p.type === 'leaf') p.vx += Math.sin(p.age * 2 + p.phase) * 30 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.grow) p.size += p.grow * dt;
    }
  }

  draw(ctx) {
    for (const p of this.ps) {
      const t = p.life / p.max;
      ctx.save();
      switch (p.type) {
        case 'sparkle': {
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.fillStyle = p.color || '#ffe7a0';
          ctx.translate(p.x, p.y); ctx.rotate(p.age * 3);
          const s = p.size * (0.6 + t * 0.6);
          ctx.beginPath();
          for (let k = 0; k < 8; k++) { const r = k % 2 ? s * 0.35 : s; const a = k * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'heart': case 'coin': case 'zzz': {
          ctx.globalAlpha = Math.min(1, t * 2.5) * (p.type === 'heart' ? 1 : 1);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          if (p.type === 'zzz') {
            ctx.font = `700 ${p.size}px Fraunces`; ctx.fillStyle = '#f3e3c3'; ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 3;
            ctx.strokeText('z', 0, 0); ctx.fillText('z', 0, 0);
          } else {
            const im = Assets.img(p.type === 'heart' ? 'icon_heart' : 'icon_coin');
            if (im) { const s = p.size; ctx.drawImage(im, -s / 2, -s / 2, s, s * im.naturalHeight / im.naturalWidth); }
          }
          break;
        }
        case 'bubble': {
          ctx.globalAlpha = Math.min(1, t * 1.5) * 0.8;
          ctx.strokeStyle = 'rgba(230,245,255,0.9)'; ctx.lineWidth = 1;
          ctx.fillStyle = 'rgba(200,230,255,0.18)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.25, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'steam': case 'smoke': {
          ctx.globalAlpha = (p.type === 'steam' ? 0.22 : 0.4) * t;
          ctx.fillStyle = p.type === 'steam' ? '#fbf6ee' : '#3a3632';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'dust': {
          ctx.globalAlpha = Math.sin(Math.min(1, (1 - t)) * Math.PI) * 0.55;
          ctx.fillStyle = '#fff3d0';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'splash': {
          ctx.globalAlpha = t;
          ctx.fillStyle = 'rgba(200,225,240,0.9)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'lint': {
          // tufts of fluff off the lint screen (sprites/scn_lint)
          const im = Assets.img('scn_lint');
          if (!im) break;
          ctx.globalAlpha = t;
          ctx.translate(p.x, p.y); ctx.rotate(p.age * 2 + p.size);
          const h = p.size * 3.2, w = h * im.naturalWidth / im.naturalHeight;
          ctx.drawImage(im, -w / 2, -h / 2, w, h);
          break;
        }
        case 'leaf': {
          // a painted leaf (sprites/leaf_*), tumbling: it turns and flips as it falls
          const im = Assets.img(p.sprite);
          if (!im) break;
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.age * 2 + p.phase)) * 0.7 + 0.3);
          const h = p.size, w = h * im.naturalWidth / im.naturalHeight;
          ctx.drawImage(im, -w / 2, -h / 2, w, h);
          break;
        }
        case 'note': {
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.font = `${p.size}px "Patrick Hand"`; ctx.fillStyle = '#3f6c74'; ctx.strokeStyle = '#f3e3c3'; ctx.lineWidth = 3;
          ctx.strokeText(p.glyph, p.x, p.y); ctx.fillText(p.glyph, p.x, p.y);
          break;
        }
        default: break;
      }
      ctx.restore();
    }
  }
}

// Screen-space rain for exterior scenes (streaks at two depths + splashes on the ground line).
export class Rain {
  constructor() { this.drops = []; this.splashes = []; this.intensity = 0; this.wind = -0.18; }
  update(dt, VW, groundY) {
    const target = Math.floor(this.intensity * 260);
    while (this.drops.length < target) this.drops.push(this.newDrop(VW, true));
    if (this.drops.length > target) this.drops.length = target;
    for (const d of this.drops) {
      d.y += d.v * dt; d.x += d.v * this.wind * dt;
      if (d.y > groundY + d.z * 60) {
        if (d.z > 0.6 && this.splashes.length < 80) this.splashes.push({ x: d.x, y: groundY + d.z * 60, t: 0 });
        Object.assign(d, this.newDrop(VW, false));
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) { const s = this.splashes[i]; s.t += dt; if (s.t > 0.25) this.splashes.splice(i, 1); }
  }
  newDrop(VW, anywhere) {
    const z = rand();
    return { x: rand() * (VW + 200) - 50, y: anywhere ? rand() * 720 : -rand() * 200, v: 900 + z * 700, len: 14 + z * 24, z };
  }
  draw(ctx, scale) {
    if (!this.drops.length) return;
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = 'round';
    for (const d of this.drops) {
      ctx.strokeStyle = `rgba(200,215,235,${0.12 + d.z * 0.25})`;
      ctx.lineWidth = 0.8 + d.z * 1.2;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * this.wind, d.y - d.len); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(210,225,240,0.5)'; ctx.lineWidth = 1;
    for (const s of this.splashes) {
      const r = 3 + s.t * 30;
      ctx.globalAlpha = 1 - s.t / 0.25;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

// Rain seen through a window: streaks falling outside (drawOutside, before the room is drawn, so
// the frames cover them) and drops on the glass itself (draw, after the room): small beads that
// sit and gather, and every so often one grows heavy and runs down, leaving a thin wet trail.
export class GlassRain {
  constructor(rects) {
    this.rects = rects; this.intensity = 0; this.beads = []; this.runs = []; this.streaks = []; this.t = 0;
  }
  area() { return this.rects.reduce((a, r) => a + r.w * r.h, 0); }
  bead(r) { return { r, x: r.x + rand() * r.w, y: r.y + rand() * r.h, s: rand.range(0.7, 1.9), age: rand() * 20 }; }
  update(dt) {
    this.t += dt;
    const k = this.intensity;
    if (k <= 0) { this.beads.length = 0; this.runs.length = 0; this.streaks.length = 0; return; }
    const want = Math.round(this.area() / 900 * k);
    while (this.beads.length < want) this.beads.push(this.bead(rand.pick(this.rects)));
    if (this.beads.length > want) this.beads.length = want;
    // a bead now and then gets heavy and runs
    if (rand() < dt * 1.6 * k && this.runs.length < 14) {
      const r = rand.pick(this.rects);
      this.runs.push({ r, x: r.x + rand() * r.w, y: r.y + rand() * r.h * 0.4, v: 0, s: rand.range(1.8, 3.2), trail: [], hold: rand.range(0, 0.6) });
    }
    for (let i = this.runs.length - 1; i >= 0; i--) {
      const d = this.runs[i];
      d.hold -= dt;
      if (d.hold > 0) continue;
      // runs in little surges: it sticks, lets go, sticks again
      if (rand() < dt * 1.5) d.hold = rand.range(0.05, 0.35);
      d.v = Math.min(160, d.v + 260 * dt);
      d.y += d.v * dt; d.x += (rand() - 0.5) * 10 * dt;
      d.trail.push({ x: d.x, y: d.y, t: this.t });
      while (d.trail.length && this.t - d.trail[0].t > 1.6) d.trail.shift();
      if (d.y > d.r.y + d.r.h + 4) this.runs.splice(i, 1);
      else for (const b of this.beads) if (b.r === d.r && Math.abs(b.x - d.x) < d.s + 1 && Math.abs(b.y - d.y) < 3) Object.assign(b, this.bead(b.r), { y: b.r.y + rand() * b.r.h * 0.3 });
    }
    const wantStreaks = Math.round(this.area() / 2600 * k);
    while (this.streaks.length < wantStreaks) {
      const r = rand.pick(this.rects);
      this.streaks.push({ r, x: r.x + rand() * (r.w + 40), y: r.y - rand() * r.h, v: rand.range(520, 820), len: rand.range(14, 30), a: rand.range(0.18, 0.4) });
    }
    if (this.streaks.length > wantStreaks) this.streaks.length = wantStreaks;
    for (const s of this.streaks) {
      s.y += s.v * dt; s.x -= s.v * 0.12 * dt;
      if (s.y - s.len > s.r.y + s.r.h) { s.y = s.r.y - rand() * 40; s.x = s.r.x + rand() * (s.r.w + 40); }
    }
  }
  clip(ctx, r) { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); }
  // falling rain outside, behind the glass
  drawOutside(ctx) {
    if (this.intensity <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const r of this.rects) {
      ctx.save(); this.clip(ctx, r);
      for (const s of this.streaks) {
        if (s.r !== r) continue;
        ctx.strokeStyle = `rgba(214,226,238,${s.a * this.intensity})`; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len * 0.12, s.y - s.len); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  // drops on the pane
  draw(ctx) {
    if (this.intensity <= 0) return;
    ctx.save();
    for (const r of this.rects) {
      ctx.save(); this.clip(ctx, r);
      // a faint film of water and mist low on the glass
      const g = ctx.createLinearGradient(0, r.y + r.h * 0.55, 0, r.y + r.h);
      g.addColorStop(0, 'rgba(220,230,238,0)'); g.addColorStop(1, `rgba(220,230,238,${0.16 * this.intensity})`);
      ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
      for (const b of this.beads) {
        if (b.r !== r) continue;
        ctx.fillStyle = 'rgba(28,40,52,0.28)';
        ctx.beginPath(); ctx.ellipse(b.x, b.y + b.s * 0.15, b.s, b.s * 1.1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(b.x - b.s * 0.35, b.y - b.s * 0.4, Math.max(0.45, b.s * 0.32), 0, Math.PI * 2); ctx.fill();
      }
      for (const d of this.runs) {
        if (d.r !== r) continue;
        if (d.trail.length > 1) {
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (let i = 1; i < d.trail.length; i++) {
            const p0 = d.trail[i - 1], p1 = d.trail[i];
            const a = 1 - (this.t - p1.t) / 1.6;
            ctx.strokeStyle = `rgba(200,218,232,${0.22 * a})`; ctx.lineWidth = d.s * 0.55;
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(24,36,48,0.34)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.s * 0.85, d.s * 1.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(d.x - d.s * 0.3, d.y - d.s * 0.5, d.s * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
