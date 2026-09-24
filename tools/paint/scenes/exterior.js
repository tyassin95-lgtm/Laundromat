// Exterior scenes: Linden Street, Linden Park, the community garden, the riverside walk,
// the view across the street (seen through the laundromat windows) and the far skyline.
// Every scene can be painted normally (variant 'base') or as an emissive layer ('lights')
// that contains only glowing windows/lamps, which the game adds at night.
(function () {
  const { Painter, PAL, shade, mix, rng } = Paint;
  let GROUND = 560;            // building base / back edge of the sidewalk (outsideView lowers it)

  // ---------------------------------------------------------------- shared pieces
  function sky(p, w, h, top, bottom) { p.vgrad(0, 0, w, h, [[0, top], [1, bottom]]); }

  function sidewalk(p, x0, x1, o = {}) {
    const c = p.ctx, r = p.rand(o.seed || 5);
    p.rect(x0, GROUND, x1 - x0, 92, '#a79d88');
    for (let y = GROUND, row = 0; y < GROUND + 92; y += 23, row++) {
      for (let x = x0 - (row % 2) * 30; x < x1; x += 60) {
        c.fillStyle = mix('#b3a992', '#978d78', r());
        c.fillRect(x + 1.2, y + 1.2, 57.6, 20.6);
      }
    }
    p.strokes(x0, GROUND, x1 - x0, 92, { colors: ['#6f6756', '#cfc5ad'], len: 18, width: 2, alpha: 0.12, seed: 7 });
    p.mottle(x0, GROUND, x1 - x0, 92, { scale: 60, amount: 0.12, seed: 8, tint: '#5a5040', tintAmount: 0.3 });
    p.vshade(x0, GROUND, x1 - x0, 20, '#000', 0.28, 0);
    // curb and road
    p.rect(x0, GROUND + 92, x1 - x0, 12, '#c2b8a2');
    p.rect(x0, GROUND + 102, x1 - x0, 4, '#6e6758');
    p.ink([[x0, GROUND + 92], [x1, GROUND + 92]], 1.6, PAL.ink, { alpha: 0.8 });
    p.rect(x0, GROUND + 106, x1 - x0, 720 - GROUND - 106, PAL.asphalt);
    p.strokes(x0, GROUND + 106, x1 - x0, 60, { colors: ['#5a5652', '#3b3835', '#6a655e'], len: 30, width: 3, alpha: 0.2, seed: 9 });
    for (let x = x0 + 40; x < x1; x += 160) p.rect(x, 700, 80, 4, 'rgba(230,220,190,0.45)');
    p.vshade(x0, GROUND + 106, x1 - x0, 50, '#000', 0.2, 0);
  }

  function cornice(p, x, y, w, color) {
    p.rect(x - 6, y, w + 12, 14, color || shade(PAL.brick, -0.2));
    p.rect(x - 10, y - 8, w + 20, 9, shade(color || PAL.brick, 0.1));
    for (let i = x; i < x + w; i += 16) p.rect(i, y + 14, 8, 6, shade(color || PAL.brick, -0.3));
    p.inkRect(x - 10, y - 8, w + 20, 22, 1.5, PAL.ink, { alpha: 0.8 });
  }

  // A sash window on a facade; in "lights" mode only the glass glows.
  function facadeWindow(p, x, y, w, h, o = {}) {
    const lit = o.lit !== undefined ? o.lit : true;
    if (p.emissive) {
      if (lit) {
        p.litInterior(x + 5, y + 5, w - 10, h - 10, { color: o.glow || '#f2b45a', seed: o.seed, curtains: o.curtains ? shade(o.curtains, -0.1) : null, props: 2 });
        p.glow(x + w / 2, y + h / 2, Math.max(w, h), '#ffb45a', 0.18);
      }
      return;
    }
    const glassTop = o.glass || '#5d7d8c';
    p.window(x, y, w, h, {
      frame: o.frame || PAL.cream, frameW: 5, cols: o.cols || 2, rows: o.rows || 2, seed: o.seed,
      inside: (ix, iy, iw, ih) => {
        p.vgrad(ix, iy, iw, ih, [[0, shade(glassTop, 0.25)], [1, shade(glassTop, -0.35)]]);
        p.ctx.save(); p.ctx.globalAlpha = 0.22; p.ctx.fillStyle = '#fff';
        p.ctx.beginPath(); p.ctx.moveTo(ix, iy + ih * 0.7); p.ctx.lineTo(ix + iw * 0.6, iy); p.ctx.lineTo(ix + iw * 0.8, iy); p.ctx.lineTo(ix, iy + ih); p.ctx.fill(); p.ctx.restore();
        if (o.curtains) {
          p.ctx.fillStyle = o.curtains; p.ctx.globalAlpha = 0.9;
          p.ctx.fillRect(ix, iy, iw * 0.22, ih); p.ctx.fillRect(ix + iw * 0.78, iy, iw * 0.22, ih);
          p.ctx.globalAlpha = 1;
        }
      },
      sill: true,
    });
    if (o.flowers) flowerBox(p, x - 4, y + h + 10, w + 8, o.seed);
  }

  function flowerBox(p, x, y, w, seed) {
    const r = p.rand(seed || 3);
    p.rect(x, y, w, 14, PAL.woodD); p.inkRect(x, y, w, 14, 1.3, PAL.ink);
    for (let i = 0; i < w / 6; i++) {
      const fx = x + 3 + r() * (w - 6), fy = y - 2 - r() * 12;
      p.ellipse(fx, fy + 6, 5 + r() * 3, 4, r.pick([PAL.grass, PAL.grassD, '#7d8c44']));
    }
    for (let i = 0; i < w / 10; i++) p.ellipse(x + 4 + r() * (w - 8), y - 4 - r() * 12, 2.6, 2.6, r.pick(['#e08a3c', '#e8c24e', '#f3ead8', '#c4692e']));
  }

  function door(p, x, y, w, h, color, o = {}) {
    if (p.emissive) { if (o.glassLit) p.litInterior(x + 10, y + 12, w - 20, h * 0.45, { color: '#f0b060' }); return; }
    p.rect(x - 6, y - 8, w + 12, h + 8, shade(color, -0.3));
    p.planks(x, y, w, h, { vertical: true, plankH: w / 3, colors: [color, shade(color, 0.08), shade(color, -0.08)], seed: o.seed || 4 });
    if (o.glass) {
      p.rect(x + 10, y + 12, w - 20, h * 0.45, '#40525a');
      p.vgrad(x + 12, y + 14, w - 24, h * 0.45 - 4, [[0, '#6d8994'], [1, '#34454c']]);
      p.inkRect(x + 10, y + 12, w - 20, h * 0.45, 1.3, PAL.ink);
    }
    p.ellipse(x + w - 12, y + h * 0.58, 4, 4, PAL.gold, PAL.ink, 1);
    p.inkRect(x, y, w, h, 1.8, PAL.ink);
  }

  function signBoard(p, x, y, w, h, text, o = {}) {
    if (p.emissive) { if (o.neon) p.text(text, x + w / 2, y + h / 2 + 1, o.font || '700 26px Fraunces', o.neon, { shadow: o.neon, shadowBlur: 14 }); return; }
    p.rect(x, y, w, h, o.bg || PAL.tealD);
    p.rect(x + 4, y + 4, w - 8, h - 8, 'rgba(0,0,0,0)');
    p.inkRect(x + 4, y + 4, w - 8, h - 8, 1, o.fg || PAL.cream, { alpha: 0.6 });
    p.text(text, x + w / 2, y + h / 2 + 1, o.font || '700 26px Fraunces', o.fg || PAL.cream, o.scaleX ? { scaleX: o.scaleX } : {});
    if (o.sub) p.text(o.sub, x + w / 2, y + h - 9, 'italic 11px Fraunces', o.fg || PAL.cream);
    p.specks(x, y, w, h, { colors: ['#7d4a2a', '#e3c9a0', '#2a1c14'], size: 1.2, count: Math.round(w * h / 300), alpha: 0.5, seed: o.seed || 9 });
    p.inkRect(x, y, w, h, 1.8, PAL.ink);
  }

  // Brick building with an optional storefront at ground level.
  function building(p, x, w, o) {
    const topY = o.top ?? -20;
    const gfTop = o.gfTop ?? 262;
    if (!p.emissive) {
      if (o.clad) { p.planks(x, topY, w, GROUND - topY, { vertical: true, plankH: 18, colors: o.clad, seed: o.seed }); }
      else p.brickWall(x, topY, w, GROUND - topY, { colors: o.bricks, seed: o.seed, bw: 28, bh: 10 });
      p.mottle(x, topY, w, GROUND - topY, { scale: 80, amount: 0.1, seed: (o.seed || 1) + 1, tint: '#3a2418', tintAmount: 0.25 });
      p.hshade(x, topY, 30, GROUND - topY, '#000', 0.25, 0);
      p.hshade(x + w - 30, topY, 30, GROUND - topY, '#000', 0, 0.2);
      if (o.cornice !== false) cornice(p, x, gfTop - 18, w, o.corniceColor);
      p.ink([[x, topY], [x, GROUND]], 2, PAL.ink);
      p.ink([[x + w, topY], [x + w, GROUND]], 2, PAL.ink);
    }
    // upper windows
    const n = o.upperWindows || 0;
    for (let i = 0; i < n; i++) {
      const ww = o.upperW || 70, wh = o.upperH || 118;
      const wx = x + (w / n) * (i + 0.5) - ww / 2;
      const lit = o.litUpper ? o.litUpper[i] : ((i * 7 + (o.seed || 0)) % 3 !== 0);
      facadeWindow(p, wx, o.upperY ?? 60, ww, wh, { seed: (o.seed || 1) * 10 + i, lit, curtains: o.curtains && o.curtains[i % o.curtains.length], flowers: o.flowers && i % 2 === 0, frame: o.frame });
    }
    if (o.storefront) o.storefront(x, gfTop, w, GROUND - gfTop);
  }

  function lampPost(p, x, lit) {
    if (p.emissive) { p.glow(x, 250, 90, '#ffd070', 0.8); p.glow(x, 250, 26, '#fff4c0', 0.9); return; }
    // the game draws lamp-post sprites; the painted backdrop only needs the light pool.
    void lit;
  }

  // ---------------------------------------------------------------- storefronts
  function laundromatFront(p, x, y, w, h) {
    const gx = x + 30, gw = w - 170, gy = y + 60, gh = h - 90;
    if (p.emissive) {
      laundromatWindow(p, gx, gy, gw, gh);
      p.glow(gx + gw / 2, gy + gh / 2, gw * 0.8, '#ffc870', 0.18);
      p.litInterior(x + w - 118, y + 76, 72, 110, { color: '#f4c877' });
      return;
    }
    p.rect(x + 8, y, w - 16, h, PAL.tealD);
    laundromatWindow(p, gx, gy, gw, gh);
    p.window(gx, gy, gw, gh, { frame: PAL.teal, frameW: 8, cols: 3, rows: 1, sill: false, seed: 71 });
    p.text("Rosa's", gx + gw / 2, gy + 48, '40px Pacifico', 'rgba(247,226,170,0.85)', { outline: 'rgba(60,30,20,0.4)', outlineWidth: 3 });
    p.text('SELF-SERVICE · WASH & FOLD', gx + gw / 2, gy + 80, '700 13px Fraunces', 'rgba(247,226,170,0.75)');
    p.rect(gx - 6, gy + gh, gw + 12, 26, PAL.teal); p.inkRect(gx - 6, gy + gh, gw + 12, 26, 1.5, PAL.ink);
    door(p, x + w - 118, y + 76, 72, h - 76, PAL.teal, { glass: true, seed: 72 });
    p.awning(x + 16, y - 2, w - 32, 34, { a: PAL.teal, b: PAL.cream, stripes: 13, drop: 16, seed: 73 });
  }

  // Rosa's interior seen through the front window. Base layer = daylight paint;
  // emissive layer = the warm glow added at night (machines block some light, their doors glow).
  function laundromatWindow(p, gx, gy, gw, gh) {
    const c = p.ctx;
    const wy = gy + gh * 0.5;
    const mw = 74, mh = 98, my = gy + gh - mh - 4;
    const xs = [0, 1, 2, 3].map(i => gx + 30 + i * ((gw - 60 - mw) / 3));
    const lamps = [gx + gw * 0.2, gx + gw * 0.5, gx + gw * 0.8];
    if (p.emissive) {
      p.vgrad(gx, gy, gw, gh, [[0, '#f5c77c'], [0.55, '#eab060'], [1, '#a86c34']]);
      for (const lx of lamps) p.glow(lx, gy + 30, 80, '#fff0c0', 0.7);
      for (const mx of xs) {
        p.rect(mx, my, mw, mh, '#b88a55');
        p.ellipse(mx + mw / 2 - 2, my + 18 + (mh - 18) * 0.5, mw * 0.3, mw * 0.3, '#ffe4a8');
      }
      return;
    }
    // back wall (mint, like the real interior) over a tile wainscot
    p.rect(gx, gy, gw, wy - gy, '#8fb3a2');
    for (let xx = gx + 6; xx < gx + gw; xx += 14) p.rect(xx, gy, 5, wy - gy, 'rgba(255,255,255,0.07)');
    p.rect(gx, wy, gw, gy + gh - wy, '#e4d8bd');
    for (let yy = wy + 12; yy < gy + gh; yy += 12) p.ink([[gx, yy], [gx + gw, yy]], 0.7, 'rgba(110,95,70,0.35)');
    for (let xx = gx + 12; xx < gx + gw; xx += 12) p.ink([[xx, wy], [xx, gy + gh]], 0.7, 'rgba(110,95,70,0.22)');
    p.rect(gx, wy - 4, gw, 5, PAL.tealD);
    // pendant lamps, clock, price chalkboard
    for (const lx of lamps) {
      p.ink([[lx, gy], [lx, gy + 16]], 1.2, '#2a2520');
      p.poly([[lx - 16, gy + 30], [lx + 16, gy + 30], [lx + 9, gy + 16], [lx - 9, gy + 16]], PAL.tealD, PAL.ink, 1.1);
      p.ellipse(lx, gy + 31, 7, 3, '#fff0c0');
    }
    const ck = gx + gw * 0.91;
    p.ellipse(ck, gy + 60, 12, 12, '#f4ead2', PAL.ink, 1.2);
    p.ink([[ck, gy + 60], [ck, gy + 52]], 1.2, PAL.ink); p.ink([[ck, gy + 60], [ck + 6, gy + 62]], 1.2, PAL.ink);
    p.rect(gx + 14, gy + 44, 56, 38, '#2f3a33'); p.inkRect(gx + 14, gy + 44, 56, 38, 1.2, '#6a4a2e');
    for (let k = 0; k < 4; k++) p.rect(gx + 20, gy + 51 + k * 8, 28 + (k * 9) % 16, 1.6, 'rgba(240,235,220,0.7)');
    // the machines
    const r = p.rand(177);
    for (const mx of xs) {
      p.vshade(mx + 4, my + mh - 6, mw, 10, '#000000', 0, 0.3);
      p.rect(mx, my, mw, mh, '#efe4c8');
      p.rect(mx + mw - 12, my, 12, mh, 'rgba(120,100,70,0.22)');
      p.rect(mx, my, mw, 18, '#dccfb0');
      p.ink([[mx, my + 18], [mx + mw, my + 18]], 1, PAL.ink);
      p.ellipse(mx + mw - 14, my + 9, 3.2, 3.2, '#b3402f'); p.ellipse(mx + mw - 25, my + 9, 3.2, 3.2, '#3f6c74');
      p.rect(mx + 8, my + 5, 20, 7, '#3a4a4a');
      const cx = mx + mw / 2 - 2, cy = my + 18 + (mh - 18) * 0.5, rr = mw * 0.3;
      p.ellipse(cx, cy, rr + 4, rr + 4, '#c9c6bb', PAL.ink, 1.2);
      p.ellipse(cx, cy, rr, rr, '#44545a');
      for (let k = 0; k < 3; k++) p.ellipse(cx - 6 + r() * 12, cy + 3 + r() * 7, 7 + r() * 4, 4 + r() * 3, r.pick(['#c9b88f', '#b86a4a', '#7fa0b0', '#e0c070']));
      p.ellipse(cx - rr * 0.35, cy - rr * 0.38, rr * 0.28, rr * 0.14, 'rgba(255,255,255,0.4)');
      p.specks(mx, my, mw, mh, { colors: ['#b8763a', '#6c9aa0'], size: 1.2, count: 10, alpha: 0.5, seed: Math.round(mx) });
      p.inkRect(mx, my, mw, mh, 1.3, PAL.ink);
    }
    // glass tint + reflections
    p.vgrad(gx, gy, gw, gh, [[0, 'rgba(190,215,225,0.16)'], [1, 'rgba(40,60,70,0.2)']]);
    p.clipRect(gx, gy, gw, gh, () => {
      c.save(); c.globalAlpha = 0.12; c.fillStyle = '#ffffff';
      for (const [a, b] of [[0.1, 0.17], [0.46, 0.5], [0.72, 0.83]]) {
        c.beginPath(); c.moveTo(gx + gw * a, gy); c.lineTo(gx + gw * b, gy); c.lineTo(gx + gw * b - 70, gy + gh); c.lineTo(gx + gw * a - 70, gy + gh); c.closePath(); c.fill();
      }
      c.restore();
    });
  }

  function cafeFront(p, x, y, w, h) {
    const gx = x + 26, gw = w - 190, gy = y + 70, gh = h - 100;
    if (p.emissive) {
      cafeInterior(p, gx, gy, gw, gh);
      p.glow(gx + gw / 2, gy + gh / 2, gw * 0.7, '#ffb050', 0.18);
      p.litInterior(x + w - 130, y + 90, 80, 110, { color: '#f5b460' });
      p.text('CORNER CUP', x + w / 2, y + 30, '700 30px Fraunces', '#ffcf7a', { shadow: '#ff9a3a', shadowBlur: 18 });
      return;
    }
    p.planks(x + 6, y, w - 12, h, { vertical: true, plankH: 22, colors: ['#3e5a4a', '#46634f', '#365243'], seed: 81 });
    cafeInterior(p, gx, gy, gw, gh);
    p.window(gx, gy, gw, gh, { frame: '#2c4034', frameW: 8, cols: 2, rows: 1, sill: false, seed: 82 });
    signBoard(p, x + 40, y + 10, w - 80, 42, 'CORNER CUP', { bg: '#2c4034', fg: '#f3d9a4', font: '700 26px Fraunces', sub: null, seed: 83 });
    door(p, x + w - 130, y + 90, 80, h - 90, '#8a4a2a', { glass: true, seed: 84 });
    p.awning(x + 20, y + 52, gw + 20, 30, { a: PAL.rust, b: PAL.cream, stripes: 9, drop: 14, seed: 85 });
  }

  // The Corner Cup seen through its window: counter, espresso machine, cups, bulbs, plants.
  function cafeInterior(p, gx, gy, gw, gh) {
    const c = p.ctx;
    const cy = gy + gh - 64;
    const bulbs = [0.15, 0.38, 0.62, 0.85].map(f => gx + gw * f);
    if (p.emissive) {
      p.vgrad(gx, gy, gw, gh, [[0, '#f3b865'], [0.6, '#e49a4a'], [1, '#9a5a2a']]);
      for (const bx of bulbs) p.glow(bx, gy + 40, 60, '#fff0c0', 0.8);
      p.rect(gx + 14, cy, gw - 28, 64, '#8a5a30');
      return;
    }
    p.rect(gx, gy, gw, gh, '#5f7a68');
    for (let xx = gx; xx < gx + gw; xx += 18) p.rect(xx, gy, 8, gh, 'rgba(255,255,255,0.05)');
    // shelves with jars and cups
    for (const sy of [gy + 58, gy + 96]) {
      p.rect(gx + 20, sy, gw - 40, 5, '#7a5134'); p.ink([[gx + 20, sy + 5], [gx + gw - 20, sy + 5]], 0.9, PAL.ink);
      const r = p.rand(sy);
      for (let xx = gx + 26; xx < gx + gw - 40; xx += 20 + r() * 8) {
        const jh = 10 + r() * 12;
        p.rect(xx, sy - jh, 12, jh, r.pick(['#e8dcc0', '#c9a24c', '#b86a4a', '#e6d2a6', 'rgba(200,220,210,0.8)']));
        p.inkRect(xx, sy - jh, 12, jh, 0.7, PAL.ink);
      }
    }
    // hanging bulbs on cords
    for (const bx of bulbs) { p.ink([[bx, gy], [bx, gy + 30]], 1, '#2a2520'); p.ellipse(bx, gy + 36, 6, 8, '#ffe6a8', PAL.ink, 0.9); }
    // counter with an espresso machine and a cake stand
    p.rect(gx + 14, cy, gw - 28, 64, '#8a5a36');
    p.rect(gx + 14, cy, gw - 28, 8, '#c9a27a'); p.inkRect(gx + 14, cy, gw - 28, 64, 1.3, PAL.ink);
    for (let xx = gx + 30; xx < gx + gw - 30; xx += 34) p.ink([[xx, cy + 10], [xx, cy + 64]], 0.8, 'rgba(40,20,10,0.35)');
    const ex = gx + gw * 0.62;
    p.rect(ex, cy - 40, 62, 40, '#b8b8b0'); p.rect(ex, cy - 40, 62, 8, '#8a8a84'); p.inkRect(ex, cy - 40, 62, 40, 1.1, PAL.ink);
    p.ellipse(ex + 18, cy - 20, 6, 6, '#3a3a36'); p.ellipse(ex + 44, cy - 20, 6, 6, '#3a3a36');
    p.ellipse(gx + gw * 0.25, cy - 6, 30, 6, '#e8dcc0', PAL.ink, 1); p.ellipse(gx + gw * 0.25, cy - 16, 22, 12, '#e0a05a', PAL.ink, 1);
    // plant in the corner
    p.rect(gx + gw - 44, cy - 26, 22, 26, '#b86a4a'); p.inkRect(gx + gw - 44, cy - 26, 22, 26, 1, PAL.ink);
    for (let k = 0; k < 6; k++) p.ellipse(gx + gw - 33 + (k - 2.5) * 7, cy - 34 - (k % 2) * 8, 9, 5, '#5a7a3a', PAL.ink, 0.8);
    p.vgrad(gx, gy, gw, gh, [[0, 'rgba(190,215,225,0.14)'], [1, 'rgba(40,60,70,0.2)']]);
    p.clipRect(gx, gy, gw, gh, () => {
      c.save(); c.globalAlpha = 0.1; c.fillStyle = '#ffffff';
      for (const [a, b] of [[0.2, 0.26], [0.6, 0.7]]) { c.beginPath(); c.moveTo(gx + gw * a, gy); c.lineTo(gx + gw * b, gy); c.lineTo(gx + gw * b - 60, gy + gh); c.lineTo(gx + gw * a - 60, gy + gh); c.closePath(); c.fill(); }
      c.restore();
    });
  }

  function bodegaFront(p, x, y, w, h, closed) {
    const gx = x + 24, gw = w - 150, gy = y + 80, gh = h - 110;
    if (p.emissive) {
      if (!closed) { p.litInterior(gx, gy, gw, gh, { color: '#f6d27a', props: 5 }); p.glow(gx + gw / 2, gy + gh / 2, gw * 0.6, '#ffd070', 0.2); }
      return;
    }
    p.rect(x + 6, y, w - 12, h, '#8f3f2c');
    p.vgrad(gx, gy, gw, gh, closed ? [[0, '#5a5a58'], [1, '#2e2e2c']] : [[0, '#a8b0a0'], [1, '#5b6356']]);
    if (!closed) {
      // shelves of cans and fruit
      const r = p.rand(91);
      for (let row = 0; row < 3; row++) for (let i = 0; i < gw / 16; i++) p.rect(gx + 6 + i * 16, gy + 24 + row * 38, 11, 16, r.pick(['#c4692e', '#e8b04e', '#7d8c44', '#b3402f', '#3f6c74']));
    }
    p.window(gx, gy, gw, gh, { frame: '#e6d2a6', frameW: 6, cols: 2, rows: 1, sill: false, seed: 92 });
    if (closed) {
      p.rect(gx + gw / 2 - 70, gy + gh / 2 - 34, 140, 68, '#f2ead8'); p.inkRect(gx + gw / 2 - 70, gy + gh / 2 - 34, 140, 68, 1.5, PAL.ink);
      p.text('FOR LEASE', gx + gw / 2, gy + gh / 2 - 8, '700 22px Fraunces', '#b3402f');
      p.text('Crestline Properties', gx + gw / 2, gy + gh / 2 + 16, '12px sans-serif', '#333');
    }
    signBoard(p, x + 30, y + 16, w - 60, 50, "DELGADO'S", { bg: '#e6d2a6', fg: '#8f3f2c', font: '700 28px Fraunces', sub: 'GROCERY · SINCE 1991', seed: 93 });
    door(p, x + w - 114, y + 96, 76, h - 96, '#3f6c74', { glass: true, seed: 94 });
    if (!closed) {
      // fruit crates on the sidewalk
      for (let i = 0; i < 3; i++) {
        const cx = x + 40 + i * 70;
        p.rect(cx, GROUND - 38, 60, 38, PAL.wood); p.inkRect(cx, GROUND - 38, 60, 38, 1.4, PAL.ink);
        const r = p.rand(95 + i);
        for (let k = 0; k < 9; k++) p.ellipse(cx + 8 + r() * 44, GROUND - 40 + r() * 6, 7, 6, r.pick(['#d8792e', '#e8b04e', '#9aa84a', '#c4392e']), PAL.ink, 0.8);
      }
    }
  }

  function alderEntrance(p, x, y, w, h) {
    if (p.emissive) { p.litInterior(x + w / 2 - 44, y + 60, 88, 150, { color: '#f0c070' }); for (const wx of [x + 50, x + w - 150]) p.litInterior(wx, y + 70, 100, 130, { color: '#f2b45a', curtains: '#a04a3a' }); return; }
    // stoop
    p.rect(x + w / 2 - 80, GROUND - 36, 160, 36, PAL.stone);
    for (let i = 0; i < 3; i++) { p.rect(x + w / 2 - 80 + i * 8, GROUND - 36 + i * 12, 160 - i * 16, 12, shade(PAL.stone, -i * 0.06)); p.inkRect(x + w / 2 - 80 + i * 8, GROUND - 36 + i * 12, 160 - i * 16, 12, 1.2, PAL.ink); }
    door(p, x + w / 2 - 44, y + 60, 88, h - 96, '#5a3a2a', { glass: true, seed: 61 });
    p.rect(x + w / 2 - 60, y + 30, 120, 22, PAL.stoneL); p.inkRect(x + w / 2 - 60, y + 30, 120, 22, 1.2, PAL.ink);
    p.text('ALDER ARMS', x + w / 2, y + 41, '700 14px Fraunces', PAL.ink);
    for (const wx of [x + 50, x + w - 150]) facadeWindow(p, wx, y + 70, 100, 130, { seed: wx, curtains: '#a04a3a', flowers: true });
  }

  // ---------------------------------------------------------------- scenes
  function linden(variant, scale) {
    const W = 2600;
    const p = new Painter(W, 720, scale || 1.5, 4242);
    p.emissive = variant === 'lights';
    const closed = variant === 'closed';
    if (!p.emissive) { p.ctx.clearRect(0, 0, W, 720); }
    // Alder Arms (June's building)
    building(p, 0, 560, { seed: 11, gfTop: 270, upperWindows: 4, upperY: 40, curtains: ['#a04a3a', '#3f6c74', '#c9a24c'], flowers: true, bricks: ['#8a4a32', '#7a4230', '#96573a'], storefront: (x, y, w, h) => alderEntrance(p, x, y, w, h) });
    // Rosa's laundromat + apartment above
    building(p, 560, 620, { seed: 12, gfTop: 262, upperWindows: 3, upperY: 44, upperW: 96, litUpper: [true, true, false], curtains: ['#e8b04e', '#3f6c74'], bricks: ['#9c5a3c', '#a8633f', '#8e4c33'], corniceColor: '#6a3a28', storefront: (x, y, w, h) => laundromatFront(p, x, y, w, h) });
    // Corner Cup café (painted clapboard)
    building(p, 1180, 580, { seed: 13, gfTop: 262, upperWindows: 3, upperY: 50, clad: ['#c9b48a', '#bfa97e', '#d4c096'], frame: '#2c4034', corniceColor: '#2c4034', storefront: (x, y, w, h) => cafeFront(p, x, y, w, h) });
    // Delgado's bodega
    building(p, 1760, 400, { seed: 14, gfTop: 262, upperWindows: 2, upperY: 56, curtains: ['#e8b04e'], bricks: ['#a65d3e', '#b4694a', '#94503a'], storefront: (x, y, w, h) => bodegaFront(p, x, y, w, h, closed) });
    // side wall + vacant lot with the old Cap & Seal factory ruin behind a fence
    if (!p.emissive) {
      p.brickWall(2160, 120, 90, GROUND - 120, { seed: 15, colors: ['#8a4a32', '#7a4230'] });
      p.ink([[2250, 120], [2250, GROUND]], 2, PAL.ink);
      // factory ruin in the distance
      p.rect(2250, 180, 350, GROUND - 180, '#8f6a55');
      p.brickWall(2270, 150, 300, GROUND - 150, { seed: 16, colors: ['#9a7a64', '#8a6a55', '#a88a70'], bw: 22, bh: 8 });
      for (let i = 0; i < 4; i++) p.rect(2295 + i * 70, 230, 40, 70, '#3e3a36');
      p.text('CAP & SEAL CO.', 2420, 190, '700 22px Fraunces', 'rgba(240,230,210,0.55)');
      p.shadeOverlay(2250, 120, 350, GROUND - 120, '#c8c0b0', 0.35, 'screen');
      // weeds
      p.strokes(2250, GROUND - 60, 350, 60, { colors: [PAL.grass, PAL.grassD, '#8a8f45'], len: 16, width: 2.4, alpha: 0.7, angle: -Math.PI / 2, angleJitter: 0.5, count: 260, seed: 17 });
      // chain-link fence
      const c = p.ctx;
      c.save(); c.strokeStyle = 'rgba(80,80,80,0.55)'; c.lineWidth = 1;
      for (let x = 2250; x < W; x += 12) { c.beginPath(); c.moveTo(x, GROUND - 150); c.lineTo(x + 75, GROUND); c.stroke(); c.beginPath(); c.moveTo(x + 75, GROUND - 150); c.lineTo(x, GROUND); c.stroke(); }
      c.restore();
      for (let x = 2256; x < W; x += 110) { p.rect(x, GROUND - 158, 5, 158, '#6a6a66'); p.ink([[x, GROUND - 158], [x, GROUND]], 1, PAL.ink); }
      p.rect(2250, GROUND - 160, W - 2250, 4, '#7a7a74');
    }
    if (!p.emissive) {
      sidewalk(p, 0, W, { seed: 21 });
      p.vshade(0, 0, W, 60, '#000', 0.2, 0);
      p.grain(0.03, { seed: 22 });
    } else {
      // street-lamp light pools
      for (const lx of [360, 1160, 1900, 2460]) lampPost(p, lx, true);
    }
    return p;
  }

  function outsideView(variant, scale) {
    // What you see through the laundromat's windows: the other side of Linden Street.
    const W = 1920;
    const p = new Painter(W, 720, scale || 1.2, 777);
    p.emissive = variant === 'lights';
    if (!p.emissive) sky(p, W, 720, '#9fb4c2', '#d9d2bf');
    GROUND = 470;
    try {
      building(p, 0, 520, { seed: 31, gfTop: 190, upperWindows: 4, upperY: -20, curtains: ['#c9a24c', '#3f6c74'], bricks: ['#8e5a44', '#7e4a36'], storefront: (x, y, w, h) => bakery(p, x, y, w, h) });
      building(p, 520, 700, { seed: 32, gfTop: 190, upperWindows: 5, upperY: -20, curtains: ['#a04a3a'], bricks: ['#9a6448', '#8a5a40'], storefront: (x, y, w, h) => bookshop(p, x, y, w, h) });
      building(p, 1220, 700, { seed: 33, gfTop: 190, upperWindows: 4, upperY: -20, clad: ['#8a9a8c', '#7d8c80'], frame: PAL.cream, storefront: (x, y, w, h) => records(p, x, y, w, h) });
      if (!p.emissive) sidewalk(p, 0, W, { seed: 34 });
    } finally { GROUND = 560; }
    if (!p.emissive) {
      // near sidewalk + parked car silhouette
      p.rect(0, 610, W, 110, '#8f8676');
      p.vshade(0, 610, W, 110, '#000', 0.05, 0.3);
      p.shadeOverlay(0, 0, W, 720, '#c8d4dc', 0.18, 'screen');
      p.grain(0.025, { seed: 35 });
    }
    return p;
  }

  function bakery(p, x, y, w, h) {
    if (p.emissive) { p.litInterior(x + 30, y + 70, w - 180, h - 100, { color: '#f7c070', props: 3 }); return; }
    p.rect(x + 6, y, w - 12, h, '#e6d2a6');
    p.vgrad(x + 30, y + 70, w - 180, h - 100, [[0, '#a8a896'], [1, '#606a60']]);
    p.window(x + 30, y + 70, w - 180, h - 100, { frame: '#8f3f2c', frameW: 7, cols: 2, rows: 1, sill: false, seed: 41 });
    signBoard(p, x + 30, y + 14, w - 60, 44, 'BAKERY', { bg: '#8f3f2c', fg: '#f3e3c3', font: '700 26px Fraunces', seed: 42 });
    door(p, x + w - 128, y + 88, 76, h - 88, '#8f3f2c', { glass: true, seed: 43 });
  }
  function bookshop(p, x, y, w, h) {
    if (p.emissive) { p.litInterior(x + 30, y + 70, w - 200, h - 100, { color: '#f0b860', props: 5 }); return; }
    p.rect(x + 6, y, w - 12, h, '#2b4d55');
    p.vgrad(x + 30, y + 70, w - 200, h - 100, [[0, '#8a9aa0'], [1, '#4a5a5e']]);
    const r = p.rand(51);
    for (let row = 0; row < 3; row++) for (let i = 0; i < (w - 220) / 12; i++) p.rect(x + 40 + i * 12, y + 90 + row * 36, 9, 28, r.pick(['#8f3f2c', '#3f6c74', '#c9a24c', '#5a6a3a', '#e6d2a6']));
    p.window(x + 30, y + 70, w - 200, h - 100, { frame: PAL.cream, frameW: 7, cols: 3, rows: 1, sill: false, seed: 52 });
    signBoard(p, x + 40, y + 14, w - 80, 44, 'PAGE & PRESS BOOKS', { bg: '#e6d2a6', fg: '#2b4d55', font: '700 24px Fraunces', seed: 53 });
    door(p, x + w - 150, y + 88, 80, h - 88, '#6a3a28', { glass: true, seed: 54 });
  }
  function records(p, x, y, w, h) {
    if (p.emissive) { p.litInterior(x + 30, y + 70, w - 190, h - 100, { color: '#e8a0c0', props: 3 }); p.text('RECORDS', x + (w - 160) / 2 + 30, y + 110, '700 28px Fraunces', '#ff9ad0', { shadow: '#ff5ab0', shadowBlur: 16 }); return; }
    p.rect(x + 6, y, w - 12, h, '#3a3040');
    p.vgrad(x + 30, y + 70, w - 190, h - 100, [[0, '#7a7a8a'], [1, '#3a3a48']]);
    p.window(x + 30, y + 70, w - 190, h - 100, { frame: '#c48fa0', frameW: 7, cols: 2, rows: 1, sill: false, seed: 61 });
    p.text('RECORDS', x + (w - 160) / 2 + 30, y + 110, '700 28px Fraunces', 'rgba(255,200,230,0.7)');
    signBoard(p, x + 40, y + 14, w - 80, 44, 'SPIN CITY', { bg: '#c48fa0', fg: '#2a1c24', font: '700 26px Fraunces', seed: 62 });
    door(p, x + w - 140, y + 88, 80, h - 88, '#2a2a30', { glass: true, seed: 63 });
  }

  function skyline(variant, scale) {
    const W = 2400, H = 720;
    const p = new Painter(W, H, scale || 1, 999);
    p.emissive = variant === 'lights';
    const r = p.rand(1001);
    const c = p.ctx;
    // far towers
    let x = -20;
    while (x < W) {
      const bw = 50 + r() * 110, bh = 120 + r() * 260;
      const top = 470 - bh;
      if (!p.emissive) {
        p.rect(x, top, bw, bh + 250, mix('#7f8e9e', '#65758a', r()));
        if (r() < 0.25) { p.rect(x + bw * 0.4, top - 30, 6, 30, '#6b7a8e'); }
      }
      for (let wy = top + 12; wy < 520; wy += 18) for (let wx = x + 8; wx < x + bw - 10; wx += 14) {
        if (r() < 0.4) {
          if (p.emissive) p.rect(wx, wy, 6, 8, r() < 0.8 ? 'rgba(255,214,140,0.85)' : 'rgba(200,220,255,0.7)');
          else p.rect(wx, wy, 6, 8, 'rgba(210,220,230,0.35)');
        }
      }
      x += bw + r() * 12;
    }
    // bridge (like the one in Remy's mural)
    if (!p.emissive) {
      c.save(); c.strokeStyle = '#5b6b80'; c.lineWidth = 5;
      for (const tx of [1600, 2000]) { p.rect(tx - 10, 300, 20, 220, '#5b6b80'); p.rect(tx - 16, 296, 32, 10, '#5b6b80'); }
      c.beginPath(); c.moveTo(1450, 470); c.quadraticCurveTo(1600, 300, 1800, 440); c.quadraticCurveTo(2000, 300, 2200, 470); c.stroke();
      p.rect(1400, 455, 850, 12, '#5b6b80');
      c.lineWidth = 1.2; for (let bx = 1460; bx < 2200; bx += 22) { c.beginPath(); c.moveTo(bx, 460); c.lineTo(bx, 470 - Math.abs(Math.sin((bx - 1400) / 800 * Math.PI * 2)) * 150); c.stroke(); }
      c.restore();
      p.shadeOverlay(0, 0, W, H, '#dfe6ee', 0.25, 'screen');
    } else {
      for (let bx = 1460; bx < 2200; bx += 44) p.glow(bx, 458, 10, '#ffe0a0', 0.8);
    }
    return p;
  }

  function park(variant, scale) {
    const W = 2000;
    const p = new Painter(W, 720, scale || 1.5, 5151);
    p.emissive = variant === 'lights';
    if (p.emissive) { for (const lx of [300, 1050, 1760]) lampPost(p, lx, true); return p; }
    p.ctx.clearRect(0, 0, W, 720);
    const r = p.rand(5152);
    // distant tree line
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = 330 + r() * 60, s = 60 + r() * 70;
      p.ellipse(x, y, s, s * 0.8, mix('#56663a', '#6f7d45', r()));
    }
    p.shadeOverlay(0, 250, W, 200, '#c8d0b8', 0.35, 'screen');
    // lawn
    p.vgrad(0, 400, W, 320, [[0, '#7d8c47'], [1, '#5f6d34']]);
    p.strokes(0, 400, W, 320, { colors: ['#8f9c52', '#56632c', '#a3ad62'], len: 12, width: 2, alpha: 0.35, angle: -Math.PI / 2, angleJitter: 0.4, count: 5000, seed: 5153 });
    // iron fence behind the path
    const c = p.ctx;
    p.rect(0, 506, W, 4, '#2e2a26');
    p.rect(0, 540, W, 3, '#2e2a26');
    for (let x = 6; x < W; x += 16) { c.fillStyle = '#2e2a26'; c.fillRect(x, 498, 3, 60); c.beginPath(); c.moveTo(x - 2, 498); c.lineTo(x + 1.5, 490); c.lineTo(x + 5, 498); c.fill(); }
    // hedges
    for (let x = 0; x < W; x += 60) p.ellipse(x + 30, 556, 44, 22, mix('#4e5c2c', '#5f6d34', r()), null);
    p.strokes(0, 530, W, 50, { colors: ['#3e4a22', '#6f7d3c'], len: 8, width: 2, alpha: 0.4, count: 1800, seed: 5154 });
    // gravel path
    p.rect(0, 572, W, 108, '#c2b395');
    p.strokes(0, 572, W, 108, { colors: ['#a89878', '#d8cab0', '#8a7a60'], len: 4, width: 2, alpha: 0.5, count: 7000, seed: 5155 });
    p.vshade(0, 572, W, 16, '#000', 0.2, 0);
    p.ink([[0, 572], [W, 572]], 1.5, PAL.ink, { alpha: 0.6 });
    p.ink([[0, 680], [W, 680]], 1.5, PAL.ink, { alpha: 0.6 });
    p.rect(0, 680, W, 40, '#6a7a3a');
    p.strokes(0, 680, W, 40, { colors: ['#8f9c52', '#56632c'], len: 10, width: 2, alpha: 0.5, angle: -Math.PI / 2, count: 900, seed: 5156 });
    // stone fountain
    const fx = 1000, fy = 520;
    p.ellipse(fx, fy + 30, 150, 34, PAL.stoneD, PAL.ink, 2);
    p.ellipse(fx, fy + 22, 140, 28, '#5d8a9a');
    p.strokes(fx - 130, fy + 5, 260, 40, { colors: ['#8ab8c8', '#4a7a8a', '#d0e8f0'], len: 20, width: 2, alpha: 0.4, seed: 5157, clip: cc => cc.ellipse(fx, fy + 22, 136, 25, 0, 0, Math.PI * 2) });
    p.rect(fx - 18, fy - 90, 36, 110, PAL.stone); p.inkRect(fx - 18, fy - 90, 36, 110, 1.6, PAL.ink);
    p.ellipse(fx, fy - 92, 60, 14, PAL.stoneL, PAL.ink, 1.6);
    p.ellipse(fx, fy - 96, 50, 9, '#6d9aaa');
    p.grain(0.03, { seed: 5158 });
    return p;
  }

  function garden(variant, scale) {
    const W = 1800;
    const p = new Painter(W, 720, scale || 1.5, 6161);
    p.emissive = variant === 'lights';
    if (p.emissive) {
      for (const [wx, wy] of [[140, 150], [380, 150], [620, 150], [1180, 170], [1420, 170]]) p.litInterior(wx, wy, 80, 100, { color: '#f2b45a', curtains: '#a04a3a' });
      p.glow(1520, 420, 70, '#ffc070', 0.5);
      return p;
    }
    p.ctx.clearRect(0, 0, W, 720);
    // backs of the buildings
    p.brickWall(0, -20, 880, 520, { seed: 6162, colors: ['#8a4a32', '#7a4230', '#96573a'] });
    p.brickWall(1040, 20, 760, 480, { seed: 6163, colors: ['#9c5a3c', '#8e4c33'] });
    p.rect(880, 60, 160, 440, '#6b5a4c');
    p.mottle(0, -20, W, 520, { scale: 90, amount: 0.1, seed: 6164, tint: '#3a2418', tintAmount: 0.2 });
    for (const [wx, wy] of [[140, 150], [380, 150], [620, 150], [1180, 170], [1420, 170]]) facadeWindow(p, wx, wy, 80, 100, { seed: wx, curtains: '#a04a3a' });
    // fire escape
    const c = p.ctx;
    c.save(); c.strokeStyle = '#2e2a26'; c.lineWidth = 3;
    for (const fy of [120, 280]) { c.strokeRect(330, fy + 100, 200, 8); for (let x = 330; x <= 530; x += 20) { c.beginPath(); c.moveTo(x, fy + 60); c.lineTo(x, fy + 100); c.stroke(); } c.beginPath(); c.moveTo(330, fy + 60); c.lineTo(530, fy + 60); c.stroke(); }
    c.beginPath(); c.moveTo(350, 228); c.lineTo(500, 380); c.stroke();
    c.restore();
    // wooden fence
    p.planks(0, 380, W, 140, { vertical: true, plankH: 26, colors: ['#8a6a4a', '#7d5e40', '#96764f'], seed: 6165 });
    p.rect(0, 400, W, 8, '#6a4e34'); p.rect(0, 480, W, 8, '#6a4e34');
    p.vshade(0, 380, W, 140, '#000', 0.05, 0.25);
    // tool shed
    p.planks(1420, 300, 220, 220, { vertical: true, plankH: 22, colors: ['#3f6c74', '#467680', '#35606a'], seed: 6166 });
    p.poly([[1400, 300], [1530, 240], [1660, 300]], '#6a3a28', PAL.ink, 2);
    p.rect(1490, 380, 70, 140, '#2b4d55'); p.inkRect(1490, 380, 70, 140, 1.6, PAL.ink);
    p.inkRect(1420, 300, 220, 220, 2, PAL.ink);
    p.rect(1455, 330, 150, 26, PAL.cream); p.inkRect(1455, 330, 150, 26, 1.2, PAL.ink);
    p.text('LINDEN GROWERS', 1530, 344, '700 13px Fraunces', PAL.tealD);
    // rain barrel
    p.rect(1680, 430, 60, 90, '#6a4a30'); for (const by of [446, 500]) p.rect(1678, by, 64, 5, '#3a3a36'); p.inkRect(1680, 430, 60, 90, 1.5, PAL.ink);
    // ground: soil and grass
    p.vgrad(0, 520, W, 200, [[0, '#6a5238'], [1, '#54402c']]);
    p.strokes(0, 520, W, 200, { colors: ['#7a6040', '#4a3622', '#8a7050'], len: 8, width: 3, alpha: 0.4, count: 4000, seed: 6167 });
    p.rect(0, 580, W, 90, '#8a7a5a');
    p.strokes(0, 580, W, 90, { colors: ['#a09070', '#6a5a40', '#b8a888'], len: 5, width: 2, alpha: 0.5, count: 4000, seed: 6168 });
    p.ink([[0, 580], [W, 580]], 1.2, PAL.ink, { alpha: 0.5 });
    p.ink([[0, 670], [W, 670]], 1.2, PAL.ink, { alpha: 0.5 });
    p.rect(0, 670, W, 50, '#5f6d34');
    p.strokes(0, 668, W, 52, { colors: ['#8f9c52', '#56632c'], len: 10, width: 2, alpha: 0.6, angle: -Math.PI / 2, count: 1200, seed: 6169 });
    p.grain(0.03, { seed: 6170 });
    return p;
  }

  function riverside(variant, scale) {
    const W = 1800;
    const p = new Painter(W, 720, scale || 1.5, 7171);
    p.emissive = variant === 'lights';
    if (p.emissive) { for (const lx of [260, 900, 1540]) lampPost(p, lx, true); return p; }
    p.ctx.clearRect(0, 0, W, 720);
    // far bank + water (sky comes from the skyline layer)
    p.rect(0, 440, W, 22, '#5a6a70');
    p.vgrad(0, 460, W, 120, [[0, '#5d7f8e'], [1, '#34505c']]);
    p.strokes(0, 462, W, 110, { colors: ['#8ab0c0', '#2e4852', '#c0d8e0'], len: 40, width: 2, alpha: 0.3, angleJitter: 0.05, count: 900, seed: 7172 });
    // embankment wall + railing
    p.rect(0, 540, W, 50, PAL.stone);
    for (let x = 0; x < W; x += 60) { p.rect(x + 1, 541, 58, 24, shade(PAL.stone, (x % 120) ? 0.04 : -0.04)); p.rect(x + 31, 565, 58, 24, shade(PAL.stone, (x % 120) ? -0.03 : 0.05)); }
    p.inkRect(0, 540, W, 50, 1.5, PAL.ink);
    const c = p.ctx;
    p.rect(0, 470, W, 6, '#2e2a26');
    p.rect(0, 510, W, 3, '#2e2a26');
    for (let x = 10; x < W; x += 30) { c.fillStyle = '#2e2a26'; c.fillRect(x, 470, 3, 72); }
    for (let x = 0; x < W; x += 300) { p.rect(x + 140, 460, 14, 84, '#2e2a26'); p.ellipse(x + 147, 458, 10, 6, '#2e2a26'); }
    // promenade
    p.rect(0, 590, W, 130, '#b4a68a');
    for (let y = 590, row = 0; y < 720; y += 26, row++) for (let x = -((row % 2) * 40); x < W; x += 80) { c.fillStyle = mix('#bcae92', '#a09276', Math.random()); c.fillRect(x + 1, y + 1, 78, 24); }
    p.vshade(0, 590, W, 20, '#000', 0.25, 0);
    p.mottle(0, 590, W, 130, { scale: 70, amount: 0.12, seed: 7173, tint: '#5a5040', tintAmount: 0.3 });
    p.grain(0.03, { seed: 7174 });
    return p;
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.linden = linden;
  window.Scenes.outside = outsideView;
  window.Scenes.skyline = skyline;
  window.Scenes.park = park;
  window.Scenes.garden = garden;
  window.Scenes.riverside = riverside;
})();
