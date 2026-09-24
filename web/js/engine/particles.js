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
          p.vx = rand.range(20, 60); p.vy = rand.range(25, 50); p.life = rand.range(5, 9); p.size = rand.range(5, 9); p.vr = rand.range(-2, 2); p.phase = rand() * 6;
          p.color = o.color || rand.pick(['#d8792e', '#e8a33c', '#b85a2a', '#c9a13a']); break;
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
        case 'splash': case 'lint': {
          ctx.globalAlpha = t;
          ctx.fillStyle = p.type === 'splash' ? 'rgba(200,225,240,0.9)' : '#d9d2c3';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'leaf': {
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.age * 2 + p.phase)) * 0.7 + 0.3);
          ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(60,30,15,0.7)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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

// Droplets running down window glass (drawn inside given rects, world space).
export class GlassRain {
  constructor(rects) {
    this.rects = rects; this.drops = []; this.intensity = 0;
    for (const r of rects) for (let i = 0; i < 40; i++) this.drops.push(this.mk(r, true));
  }
  mk(r, anywhere) {
    return { r, x: r.x + rand() * r.w, y: anywhere ? r.y + rand() * r.h : r.y - rand() * 20, v: rand.range(8, 30), s: rand.range(1.2, 3.4), run: rand() < 0.35, trail: [] };
  }
  update(dt) {
    if (this.intensity <= 0) return;
    for (const d of this.drops) {
      if (d.run) {
        d.v += (rand() - 0.3) * 60 * dt; d.v = Math.max(10, Math.min(120, d.v));
        d.y += d.v * dt; d.x += (rand() - 0.5) * 8 * dt;
        d.trail.push([d.x, d.y]); if (d.trail.length > 14) d.trail.shift();
      } else if (rand() < 0.002) d.run = true;
      if (d.y > d.r.y + d.r.h) Object.assign(d, this.mk(d.r, false), { trail: [] });
    }
  }
  draw(ctx) {
    if (this.intensity <= 0) return;
    ctx.save();
    for (const r of this.rects) {
      ctx.save();
      ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      ctx.globalAlpha = this.intensity;
      for (const d of this.drops) {
        if (d.r !== r) continue;
        if (d.trail.length > 1) {
          ctx.strokeStyle = 'rgba(220,235,250,0.18)'; ctx.lineWidth = d.s * 0.7;
          ctx.beginPath(); ctx.moveTo(d.trail[0][0], d.trail[0][1]);
          for (const [x, y] of d.trail) ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(225,238,250,0.45)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.s * 0.8, d.s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(d.x - d.s * 0.3, d.y - d.s * 0.3, d.s * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
