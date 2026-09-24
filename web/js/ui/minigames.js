// Mini-games: folding (swipe the fold lines) and repairs (tighten bolts with a timing gauge).
import { el, rand, clamp } from '../engine/util.js';
import { Sound } from '../engine/audio.js';
import { vibrate } from '../game/settings.js';
import { G } from '../game/state.js';

const root = () => document.getElementById('ui');

const GARMENTS = {
  shirt: {
    w: 20, h: 16,
    parts: [
      { id: 'body', x: 5, y: 1, w: 10, h: 15 },
      { id: 'l', x: 0.3, y: 1, w: 5, h: 5.5, o: '100% 50%' },
      { id: 'r', x: 14.7, y: 1, w: 5, h: 5.5, o: '0% 50%' },
    ],
    steps: [
      { dir: 'right', part: 'l', t: 'rotateY(180deg) translateX(-.2rem)', arrow: [3, 4] },
      { dir: 'left', part: 'r', t: 'rotateY(180deg) translateX(.2rem)', arrow: [17, 4] },
      { dir: 'up', part: 'body', t: 'scaleY(.5) translateY(-50%)', arrow: [10, 13] },
    ],
  },
  towel: {
    w: 20, h: 14,
    parts: [
      { id: 'a', x: 2, y: 1, w: 8, h: 12, o: '100% 50%' },
      { id: 'b', x: 10, y: 1, w: 8, h: 12 },
    ],
    steps: [
      { dir: 'right', part: 'a', t: 'rotateY(180deg)', arrow: [5, 7] },
      { dir: 'up', part: 'b', t: 'scaleY(.5) translateY(-50%)', arrow: [14, 11], also: ['a'] },
    ],
  },
  pants: {
    w: 20, h: 16,
    parts: [
      { id: 'top', x: 6, y: 1, w: 8, h: 4 },
      { id: 'legL', x: 6, y: 5, w: 4, h: 10.5, o: '100% 50%' },
      { id: 'legR', x: 10, y: 5, w: 4, h: 10.5 },
    ],
    steps: [
      { dir: 'right', part: 'legL', t: 'rotateY(180deg)', arrow: [7, 10] },
      { dir: 'up', part: 'legR', t: 'scaleY(.35) translateY(-100%)', arrow: [12, 13], also: ['legL'] },
    ],
  },
};

const COLORS = ['#7fa0b0', '#c9b88f', '#b86a4a', '#6f8f6a', '#d9cfbf', '#5f6f8f', '#c48fa0', '#e0c070'];

// Returns a promise resolving to quality 0..1.
export function foldGame(opts = {}) {
  return new Promise(resolve => {
    const kind = opts.kind || rand.pick(['shirt', 'shirt', 'towel', 'pants']);
    const G1 = GARMENTS[kind];
    const color = opts.color || rand.pick(COLORS);
    const wrap = el('div', 'mg');
    const board = el('div', 'board wood');
    const hint = el('div', 'hint', 'Swipe along the arrow to fold');
    const prog = el('div', 'progress');
    G1.steps.forEach(() => prog.appendChild(el('i')));
    const gar = el('div', 'garment ' + kind);
    gar.style.setProperty('--gc', color);
    const parts = {};
    for (const p of G1.parts) {
      const d = el('div', 'part');
      d.dataset.id = p.id;
      d.style.left = (p.x / G1.w * 100) + '%'; d.style.top = (p.y / G1.h * 100) + '%';
      d.style.width = (p.w / G1.w * 100) + '%'; d.style.height = (p.h / G1.h * 100) + '%';
      if (p.o) d.style.setProperty('--o', p.o);
      gar.appendChild(d); parts[p.id] = d;
    }
    const arrow = el('div', 'arrow');
    board.appendChild(hint); board.appendChild(gar); board.appendChild(prog); gar.appendChild(arrow);
    wrap.appendChild(board);
    root().appendChild(wrap);
    Sound.play('cloth2', { vol: 0.8 });

    let step = 0, t0 = performance.now(), score = 0, stepStart = t0, done = false;
    const easy = (G.upgrades.includes('fold_board') ? 1 : 0) + G.skills.fold * 0.2;
    const arrows = { right: '➜', left: '⬅', up: '⬆', down: '⬇' };
    const showStep = () => {
      const s = G1.steps[step];
      arrow.textContent = arrows[s.dir];
      arrow.style.left = (s.arrow[0] / G1.w * 100) + '%';
      arrow.style.top = (s.arrow[1] / G1.h * 100) + '%';
      arrow.style.transform = 'translate(-50%, -50%)';
      stepStart = performance.now();
    };
    const doFold = (accuracy) => {
      const s = G1.steps[step];
      parts[s.part].style.transform = s.t;
      parts[s.part].style.zIndex = 2 + step;
      (s.also || []).forEach(a => { parts[a].style.transform += ' ' + s.t.replace('rotateY(180deg)', ''); });
      const secs = (performance.now() - stepStart) / 1000;
      const speed = clamp(1.4 - secs * 0.45 + easy * 0.25, 0.3, 1);
      score += clamp(accuracy * 0.6 + speed * 0.4 + easy * 0.05, 0, 1);
      prog.children[step].classList.add('on');
      Sound.play(rand.pick(['cloth1', 'cloth3', 'cloth4']), { vol: 0.9, jitter: 0.08 });
      Sound.play('whoosh2', { vol: 0.3 });
      vibrate(10);
      step++;
      if (step >= G1.steps.length) finish(); else showStep();
    };
    const finish = () => {
      done = true;
      arrow.remove();
      const q = score / G1.steps.length;
      hint.textContent = q > 0.85 ? 'Perfect fold!' : q > 0.65 ? 'Nice and neat.' : 'Good enough!';
      if (q > 0.85) Sound.play('sparkle', { vol: 0.6 });
      gar.style.transition = 'transform .45s cubic-bezier(.5,-.3,.6,1), opacity .45s';
      setTimeout(() => { gar.style.transform = 'translate(-50%, -50%) scale(.35) translateY(40rem)'; gar.style.opacity = '0'; }, 380);
      setTimeout(() => { wrap.remove(); resolve(q); }, 900);
    };
    // swipe detection
    let sx = 0, sy = 0, down = false;
    board.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sy = e.clientY; });
    board.addEventListener('pointermove', e => {
      if (!down || done) return;
      const tr = el('div', 'swipe-trail');
      const r = board.getBoundingClientRect();
      tr.style.left = (e.clientX - r.left) + 'px'; tr.style.top = (e.clientY - r.top) + 'px';
      board.appendChild(tr); setTimeout(() => tr.remove(), 420);
    });
    const release = e => {
      if (!down || done) return;
      down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      const len = Math.hypot(dx, dy);
      const want = G1.steps[step].dir;
      const vec = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[want];
      if (len < 18) {
        // a tap on the arrow also works (accessibility)
        if (e.target === arrow) doFold(0.75);
        return;
      }
      const cos = (dx * vec[0] + dy * vec[1]) / len;
      if (cos > 0.55) doFold(clamp((cos - 0.55) / 0.45, 0, 1) * 0.6 + 0.4);
      else { Sound.play('error', { vol: 0.4 }); arrow.animate([{ transform: 'translate(-50%,-50%) scale(1.3)' }, { transform: 'translate(-50%,-50%) scale(1)' }], 250); }
    };
    board.addEventListener('pointerup', release);
    board.addEventListener('pointercancel', () => { down = false; });
    showStep();
  });
}

// Repair: tighten each bolt by stopping the needle in the green zone.
export function repairGame(opts = {}) {
  return new Promise(resolve => {
    const wrap = el('div', 'mg');
    const board = el('div', 'board repair');
    const panel = el('div', 'panel');
    const hint = el('div', 'hint', 'Tap the glowing bolt');
    const gauge = el('div', 'gauge hidden');
    const zone = el('div', 'zone'); const needle = el('div', 'needle');
    gauge.appendChild(zone); gauge.appendChild(needle);
    board.appendChild(panel); board.appendChild(hint); board.appendChild(gauge);
    wrap.appendChild(board); root().appendChild(wrap);
    const n = opts.bolts || 3;
    const spots = rand.shuffle([[22, 30], [50, 26], [78, 32], [28, 62], [55, 58], [76, 66]]).slice(0, n);
    const bolts = spots.map(([x, y]) => { const b = el('div', 'bolt'); b.style.left = x + '%'; b.style.top = y + '%'; panel.appendChild(b); return b; });
    let idx = 0, attempts = 0, hits = 0, mode = 'pick', pos = 0, dir = 1, raf = 0, last = 0;
    const skill = G.skills.repair + (G.upgrades.includes('tool_kit') ? 1.5 : 0);
    const zoneW = clamp(16 + skill * 4, 16, 36);
    const speed = 95 - skill * 6;
    const setTarget = () => { bolts.forEach((b, i) => b.classList.toggle('target', i === idx)); hint.textContent = 'Tap the glowing bolt'; };
    const startGauge = () => {
      mode = 'gauge';
      gauge.classList.remove('hidden');
      const zs = 12 + Math.random() * (76 - zoneW);
      zone.style.left = zs + '%'; zone.style.width = zoneW + '%';
      zone.dataset.a = zs; zone.dataset.b = zs + zoneW;
      pos = 0; dir = 1; last = performance.now();
      hint.textContent = 'Tap when the needle is in the green!';
      const loop = now => {
        const dt = (now - last) / 1000; last = now;
        pos += dir * speed * dt;
        if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
        needle.style.left = pos + '%';
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    board.addEventListener('pointerdown', e => {
      if (mode === 'pick') {
        if (e.target === bolts[idx]) { Sound.play('metal_click', { vol: 0.7 }); startGauge(); }
        return;
      }
      if (mode === 'gauge') {
        attempts++;
        const a = +zone.dataset.a, b = +zone.dataset.b;
        if (pos >= a && pos <= b) {
          hits++;
          cancelAnimationFrame(raf);
          Sound.play('ratchet', { vol: 0.8 });
          vibrate(25);
          bolts[idx].classList.remove('target'); bolts[idx].classList.add('done');
          gauge.classList.add('hidden');
          idx++;
          if (idx >= bolts.length) {
            mode = 'done';
            hint.textContent = 'Fixed! It hums again.';
            Sound.play('machine_start', { vol: 0.8, delay: 0.3 });
            setTimeout(() => { wrap.remove(); resolve(clamp(hits / Math.max(attempts, 1), 0, 1)); }, 1100);
          } else { mode = 'pick'; setTarget(); }
        } else {
          Sound.play('clank', { vol: 0.8, jitter: 0.1 });
          vibrate(40);
          board.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], 180);
          hint.textContent = 'Clank. Try again…';
        }
      }
    });
    setTarget();
  });
}
