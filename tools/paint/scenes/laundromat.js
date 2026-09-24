// Laundromat interior (ground floor of Rosa's). 1920 x 720 virtual px.
// Layout contract (also used by web/js/data/layouts.js):
//   floor line y=472, back door x 12-96, counter zone 100-340, folding 340-540,
//   washer slots centres 600..1200 (step 150), dryer stacks 1340/1480,
//   storefront glass x 1560-1800 y 80-440, door x 1812-1906 y 150-472.
(function () {
  const { Painter, PAL, shade, mix } = Paint;
  const W = 1920, H = 720, FLOOR = 472;

  function paintLaundromat(variant, scale) {
    const night = variant === 'night';
    const neutral = variant === 'base';
    const p = new Painter(W, H, scale || 1.5, 1234);
    const c = p.ctx;

    // ---------------------------------------------------------------- ceiling (pressed tin)
    p.vgrad(0, 0, W, 64, [[0, '#6f6656'], [1, '#a59a80']]);
    for (let x = 0; x < W; x += 32) {
      for (let y = 4; y < 60; y += 28) {
        p.rect(x + 2, y, 28, 24, 'rgba(255,245,220,0.10)');
        p.ellipse(x + 16, y + 12, 7, 6, 'rgba(60,50,40,0.18)');
        p.ellipse(x + 15, y + 11, 5, 4, 'rgba(255,245,225,0.16)');
        p.rect(x + 2, y + 23, 28, 1.5, 'rgba(40,30,20,0.25)');
      }
    }
    p.vshade(0, 0, W, 64, '#000', 0.35, 0.0);
    // crown moulding
    p.rect(0, 60, W, 10, PAL.tealD);
    p.rect(0, 60, W, 2.5, shade(PAL.teal, 0.2));
    p.ink([[0, 70], [W, 70]], 2, PAL.ink);

    // ---------------------------------------------------------------- upper wall (retro mint, pinstripe)
    const wallTop = 70, railY = 306;
    p.rect(0, wallTop, W, railY - wallTop, '#a9bf9c');
    for (let x = 0; x < W; x += 18) {
      p.rect(x, wallTop, 2.2, railY - wallTop, 'rgba(80,110,90,0.18)');
      p.rect(x + 9, wallTop, 1, railY - wallTop, 'rgba(255,250,230,0.12)');
    }
    // faded diamond motif
    for (let x = 9; x < W; x += 36) for (let y = wallTop + 16; y < railY - 8; y += 36) {
      p.poly([[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], 'rgba(90,120,100,0.20)');
    }
    p.mottle(0, wallTop, W, railY - wallTop, { scale: 90, amount: 0.07, seed: 11, tint: '#8a7a50', tintAmount: 0.25 });
    p.strokes(0, wallTop, W, railY - wallTop, { colors: ['#c7d6b7', '#7f977f', '#b9b08a'], len: 30, width: 4, alpha: 0.08, angle: Math.PI / 2, angleJitter: 0.1, seed: 12 });
    // water stains near ceiling
    for (const sx of [180, 830, 1370]) p.glow(sx, 88, 70, '#6a5a30', 0.12, 'multiply');

    // chair rail
    p.rect(0, railY, W, 11, PAL.woodD);
    p.rect(0, railY, W, 3, PAL.woodL);
    p.ink([[0, railY], [W, railY]], 1.6, PAL.ink);
    p.ink([[0, railY + 11], [W, railY + 11]], 1.6, PAL.ink);

    // ---------------------------------------------------------------- wainscot tiles
    const tileTop = railY + 11, base = 462;
    p.tiles(0, tileTop, W, 10, { tw: 10, th: 10, colors: [PAL.teal, PAL.tealD, '#467680'], grout: '#2a3f40', seed: 21 });
    p.tiles(0, tileTop + 10, W, base - tileTop - 10, { tw: 17, th: 17, colors: [PAL.cream, PAL.creamL, '#e9d4a6', '#f1e1bd'], grout: '#b3a07a', seed: 22 });
    p.mottle(0, tileTop, W, base - tileTop, { scale: 70, amount: 0.06, seed: 23, tint: '#806a40', tintAmount: 0.3 });
    p.specks(0, tileTop, W, base - tileTop, { colors: ['#8b6a40', '#c9a878', '#6a5a4a'], size: 1.1, count: 900, alpha: 0.35, seed: 24 });
    // grime near the bottom
    p.vshade(0, base - 60, W, 60, '#5a4020', 0.0, 0.28);
    // baseboard
    p.rect(0, base, W, FLOOR - base, PAL.tealD);
    p.rect(0, base, W, 2, shade(PAL.teal, 0.15));
    p.ink([[0, base], [W, base]], 1.8, PAL.ink);
    p.ink([[0, FLOOR], [W, FLOOR]], 2.2, PAL.ink);

    // ---------------------------------------------------------------- floor: diamond checker in soft perspective
    paintFloor(p, night);

    // ---------------------------------------------------------------- pipes & utilities
    // conduit along the top of the wall
    p.rect(0, 78, W, 5, '#7c7b72');
    p.rect(0, 78, W, 1.5, '#b9b6a6');
    p.ink([[0, 83], [W, 83]], 1, PAL.ink, { alpha: 0.6 });
    for (const bx of [140, 520, 980, 1300, 1530]) { p.rect(bx - 9, 72, 18, 16, '#8c897d'); p.inkRect(bx - 9, 72, 18, 16, 1.2, PAL.ink); }
    // plumbing behind each washer slot
    for (let i = 0; i < 5; i++) {
      const cx = 600 + i * 150;
      p.rect(cx - 30, 250, 5, 120, '#b8733f'); p.rect(cx - 30, 250, 1.5, 120, '#e3a36a');
      p.rect(cx + 24, 250, 5, 120, '#b8733f'); p.rect(cx + 24, 250, 1.5, 120, '#e3a36a');
      p.ink([[cx - 30, 250], [cx - 30, 370]], 1, PAL.ink, { alpha: 0.7 });
      p.ink([[cx + 29, 250], [cx + 29, 370]], 1, PAL.ink, { alpha: 0.7 });
      p.ellipse(cx - 27.5, 262, 7, 3.5, '#b3402f', PAL.ink, 1);
      p.ellipse(cx + 26.5, 262, 7, 3.5, '#3f6f9a', PAL.ink, 1);
      p.rect(cx - 36, 244, 72, 5, '#b8733f'); p.inkRect(cx - 36, 244, 72, 5, 1, PAL.ink, { alpha: 0.7 });
    }
    // dryer ducts
    for (const dx of [1340, 1480]) {
      const x0 = dx - 16;
      p.rect(x0, 70, 32, 110, '#a8a9a2');
      for (let y = 74; y < 180; y += 7) { p.rect(x0, y, 32, 2, 'rgba(60,60,60,0.35)'); p.rect(x0, y + 2, 32, 1, 'rgba(255,255,255,0.35)'); }
      p.hshade(x0, 70, 32, 110, '#000', 0.25, 0.0);
      p.ink([[x0, 70], [x0, 180]], 1.4, PAL.ink); p.ink([[x0 + 32, 70], [x0 + 32, 180]], 1.4, PAL.ink);
      p.rect(x0 - 4, 176, 40, 8, '#8d8d86'); p.inkRect(x0 - 4, 176, 40, 8, 1.2, PAL.ink);
    }

    // ---------------------------------------------------------------- transom windows over the washers
    for (const [wx, ww] of [[560, 300]]) {
      p.window(wx, 96, ww, 118, { frame: PAL.teal, frameW: 7, cols: 3, rows: 1, hole: true, sill: false, seed: wx });
      p.rect(wx - 4, 214, ww + 8, 6, PAL.tealD); p.inkRect(wx - 4, 214, ww + 8, 6, 1.2, PAL.ink);
    }

    // ---------------------------------------------------------------- back door to the stairs
    paintBackDoor(p);

    // ---------------------------------------------------------------- price board frame (text drawn at runtime)
    p.rect(214, 112, 196, 128, PAL.woodD);
    p.rect(222, 120, 180, 112, '#26302b');
    p.strokes(222, 120, 180, 112, { colors: ['#4a5a50', '#1d2621', '#6a7a6e'], len: 30, width: 5, alpha: 0.12, seed: 31 });
    p.inkRect(214, 112, 196, 128, 2, PAL.ink);
    p.inkRect(222, 120, 180, 112, 1.2, PAL.ink, { alpha: 0.7 });
    p.rect(300, 102, 24, 12, PAL.woodD); p.ellipse(312, 104, 3, 3, PAL.gold, PAL.ink, 1);

    // enamel signs
    enamelSign(p, 1372, 108, 76, 42, 'LINT', 'clean traps', PAL.cream, PAL.rust, 41);
    enamelSign(p, 16, 124, 88, 40, 'ATTENDANT', 'on duty 8-6', PAL.teal, PAL.cream, 42);
    // picture nails for wall decor slots
    for (const nx of [990, 1150]) { p.ellipse(nx, 112, 2.2, 2.2, '#6a5a40', PAL.ink, 0.8); }
    // outlets & switch
    for (const ox of [120, 560, 1290]) { p.rect(ox, 380, 12, 18, '#e8dcc0'); p.inkRect(ox, 380, 12, 18, 1, PAL.ink); p.rect(ox + 3, 385, 2, 4, '#333'); p.rect(ox + 7, 385, 2, 4, '#333'); }
    // fire extinguisher by the back door
    p.rect(104, 382, 18, 44, '#b3402f'); p.rect(104, 382, 5, 44, '#d45a45'); p.rect(108, 372, 10, 10, '#333');
    p.inkRect(104, 382, 18, 44, 1.3, PAL.ink); p.ink([[118, 376], [128, 392], [124, 410]], 1.5, '#222');

    // ---------------------------------------------------------------- storefront
    paintStorefront(p);

    // ---------------------------------------------------------------- pendant lamps
    const lamps = [250, 720, 1070, 1500];
    for (const lx of lamps) paintPendant(p, lx, night);

    // ---------------------------------------------------------------- lighting
    if (neutral) {
      // neutral: lighting is applied at runtime
    } else if (!night) {
      // soft daylight falling from the storefront and transoms
      p.lightCone(1680, 86, 230, 520, 560, '#fff2d8', 0.10);
      p.lightCone(710, 214, 300, 420, 300, '#fff2d8', 0.05);
      p.lightCone(1050, 214, 300, 420, 300, '#fff2d8', 0.05);
      for (const lx of lamps) p.glow(lx, 120, 150, '#ffe0a0', 0.12);
      p.vshade(0, 0, W, H, '#fff4dc', 0.06, 0.0, 'screen');
    } else {
      p.shadeOverlay(0, 0, W, H, '#1c2a44', 0.48, 'multiply');
      p.shadeOverlay(0, 0, W, H, '#3a3050', 0.12, 'screen');
      for (const lx of lamps) {
        p.glow(lx, 110, 260, '#ffc870', 0.30);
        p.lightCone(lx, 104, 70, 520, 470, '#ffcf80', 0.13);
        p.glow(lx, 610, 240, '#ffc070', 0.12);
      }
      // neon "open" glow spill by the door
      p.glow(1858, 240, 90, '#ff7a50', 0.10);
    }
    // ambient occlusion in corners
    p.vshade(0, FLOOR, W, 40, '#000', 0.25, 0.0);
    p.hshade(0, 0, 60, H, '#000', 0.35, 0.0);
    p.hshade(W - 40, 0, 40, H, '#000', 0.0, 0.3);
    p.grain(0.035, { seed: 5 });
    p.vignette(night ? 0.55 : neutral ? 0.22 : 0.35);
    return p;
  }

  function paintFloor(p, night) {
    const c = p.ctx, r = p.rand(77);
    const y0 = 472, y1 = 720;
    p.rect(0, y0, W, y1 - y0, '#d9c8a4');
    // rows grow taller toward the viewer
    const rows = [];
    let y = y0, h = 15;
    while (y < y1 + 60) { rows.push([y, h]); y += h; h *= 1.16; }
    const tw = 72;
    for (let ri = 0; ri < rows.length; ri++) {
      const [ry, rh] = rows[ri];
      const off = (ri % 2) * tw / 2;
      for (let x = -tw + off; x < W + tw; x += tw) {
        const dark = ((Math.round((x - off) / tw) + ri) % 2) === 0;
        const col = dark ? mix('#3e5254', '#34474a', r()) : mix('#e6d6b3', '#d8c49c', r());
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x, ry + rh / 2); c.lineTo(x + tw / 2, ry); c.lineTo(x + tw, ry + rh / 2); c.lineTo(x + tw / 2, ry + rh); c.closePath();
        c.fill();
      }
    }
    // grout lines subtle
    p.strokes(0, y0, W, y1 - y0, { colors: ['#1d2526', '#fff5e0'], len: 40, width: 1, alpha: 0.05, seed: 78, angleJitter: 0.8 });
    p.mottle(0, y0, W, y1 - y0, { scale: 80, amount: 0.12, seed: 79, tint: '#6b5530', tintAmount: 0.35 });
    // scuffs & wear
    p.specks(0, y0, W, y1 - y0, { colors: ['#8a7550', '#3a3228', '#b8a47e'], size: 1.3, count: 1400, alpha: 0.28, seed: 80, stretch: 3 });
    // traffic paths (worn lighter band)
    p.vshade(0, 560, W, 90, '#fff2d0', 0.0, 0.10, 'screen');
    // reflections
    if (!night) p.vshade(0, y0, W, 120, '#ffffff', 0.10, 0.0, 'screen');
    // floor drain
    p.ellipse(1270, 690, 26, 8, '#5a5a55', PAL.ink, 1.4);
    for (let i = -18; i <= 18; i += 6) p.rect(1270 + i - 1, 685, 2, 10, '#2e2e2a');
    // door mat
    p.poly([[1790, 600], [1916, 600], [1920, 690], [1776, 690]], '#6b3b2a', PAL.ink, 1.6);
    p.strokes(1778, 600, 140, 90, { colors: ['#4a281c', '#8a5238'], len: 10, width: 2, alpha: 0.35, angle: Math.PI / 2, seed: 81, clip: cc => { cc.moveTo(1790, 600); cc.lineTo(1916, 600); cc.lineTo(1920, 690); cc.lineTo(1776, 690); cc.closePath(); } });
    p.text('WELCOME', 1848, 646, '700 16px Fraunces', 'rgba(230,200,150,0.55)', { scaleX: 1.2 });
  }

  function paintBackDoor(p) {
    const x = 12, y = 196, w = 84, h = 276;
    p.rect(x - 8, y - 10, w + 16, h + 10, PAL.tealD);
    p.inkRect(x - 8, y - 10, w + 16, h + 10, 1.8, PAL.ink);
    p.planks(x, y, w, h, { vertical: true, plankH: 21, colors: ['#8a5a36', '#9b6840', '#7d4f2f'], seed: 51 });
    p.rect(x + 14, y + 22, w - 28, 60, '#2d2a30');
    p.vgrad(x + 16, y + 24, w - 32, 56, [[0, '#5a4a3c'], [1, '#2a2420']]);
    p.inkRect(x + 14, y + 22, w - 28, 60, 1.6, PAL.ink);
    p.rect(x + 14, y + 100, w - 28, 64, 'rgba(0,0,0,0.12)'); p.inkRect(x + 14, y + 100, w - 28, 64, 1.2, PAL.ink, { alpha: 0.6 });
    p.rect(x + 14, y + 180, w - 28, 72, 'rgba(0,0,0,0.12)'); p.inkRect(x + 14, y + 180, w - 28, 72, 1.2, PAL.ink, { alpha: 0.6 });
    p.ellipse(x + w - 14, y + 150, 5, 5, PAL.gold, PAL.ink, 1.2);
    p.rect(x + 18, y + 88, w - 36, 12, PAL.cream); p.inkRect(x + 18, y + 88, w - 36, 12, 1, PAL.ink);
    p.text('UPSTAIRS', x + w / 2, y + 94.5, '700 7.5px Fraunces', PAL.ink);
    p.inkRect(x, y, w, h, 2, PAL.ink);
  }

  function enamelSign(p, x, y, w, h, t1, t2, bg, fg, seed) {
    p.rect(x, y, w, h, bg);
    p.rect(x + 3, y + 3, w - 6, h - 6, 'rgba(0,0,0,0)');
    p.inkRect(x + 3, y + 3, w - 6, h - 6, 1, fg, { alpha: 0.9, seed });
    p.text(t1, x + w / 2, y + h * (t2 ? 0.38 : 0.5), '700 11px Fraunces', fg);
    if (t2) p.text(t2, x + w / 2, y + h * 0.72, 'italic 9px Fraunces', fg);
    p.specks(x, y, w, h, { colors: ['#7d4a2a', '#e3c9a0'], size: 1.2, count: 16, alpha: 0.7, seed: seed + 1 });
    p.inkRect(x, y, w, h, 1.5, PAL.ink, { seed: seed + 2 });
  }

  function paintStorefront(p) {
    const gx = 1560, gy = 80, gw = 240, gh = 360;
    // pillar between dryers and glass
    p.rect(gx - 22, 70, 22, 402, PAL.tealD);
    p.rect(gx - 22, 70, 5, 402, shade(PAL.teal, 0.15));
    p.inkRect(gx - 22, 70, 22, 402, 1.6, PAL.ink);
    // big pane with transom row
    p.window(gx, gy, gw, gh, { frame: PAL.teal, frameW: 9, cols: 2, rows: 1, hole: true, sill: false, seed: 61 });
    p.rect(gx, gy + 78, gw, 7, PAL.teal); p.inkRect(gx, gy + 78, gw, 7, 1.2, PAL.ink);
    // sill / ledge (a place for plants and the cat)
    p.rect(gx - 8, gy + gh, gw + 16, 14, PAL.woodL); p.rect(gx - 8, gy + gh + 10, gw + 16, 4, PAL.woodD);
    p.inkRect(gx - 8, gy + gh, gw + 16, 14, 1.6, PAL.ink);
    p.rect(gx, gy + gh + 14, gw, 18, PAL.tealD); p.inkRect(gx, gy + gh + 14, gw, 18, 1.4, PAL.ink);
    // door
    const dx = 1812, dy = 150, dw = 94, dh = 322;
    p.rect(dx - 6, dy - 8, dw + 12, dh + 8, PAL.tealD);
    p.inkRect(dx - 6, dy - 8, dw + 12, dh + 8, 1.8, PAL.ink);
    p.window(dx, dy, dw, dh - 70, { frame: PAL.teal, frameW: 8, cols: 1, rows: 1, hole: true, sill: false, seed: 62 });
    p.rect(dx, dy + dh - 72, dw, 72, PAL.teal);
    p.rect(dx + 8, dy + dh - 60, dw - 16, 48, '#c9a36a'); p.inkRect(dx + 8, dy + dh - 60, dw - 16, 48, 1.2, PAL.ink);
    p.inkRect(dx, dy, dw, dh, 1.8, PAL.ink);
    // push bar
    p.rect(dx + 10, dy + dh - 106, dw - 20, 8, '#c8c2b0'); p.inkRect(dx + 10, dy + dh - 106, dw - 20, 8, 1.2, PAL.ink);
    p.text('PUSH', dx + dw / 2, dy + dh - 88, '700 9px Fraunces', PAL.cream);
    // bell bracket
    p.rect(dx + dw / 2 - 2, dy - 6, 4, 14, '#6a5a40');
    p.ellipse(dx + dw / 2, dy + 12, 6, 7, PAL.gold, PAL.ink, 1.2);
    // transom over the door
    p.rect(dx - 6, 70, dw + 12, 72, PAL.tealD);
    p.window(dx + 4, 78, dw - 8, 56, { frame: PAL.teal, frameW: 6, cols: 1, rows: 1, hole: true, sill: false, seed: 63 });
  }

  function paintPendant(p, x, night) {
    // cord
    p.ink([[x, 70], [x, 96]], 1.6, '#2a2520');
    // shade (enamel cone)
    const top = 96, bot = 122;
    p.poly([[x - 8, top], [x + 8, top], [x + 30, bot], [x - 30, bot]], PAL.teal);
    p.poly([[x - 8, top], [x - 2, top], [x - 22, bot], [x - 30, bot]], shade(PAL.teal, 0.2));
    p.ellipse(x, bot, 30, 6, PAL.tealD);
    p.ink([[x - 8, top], [x + 8, top], [x + 30, bot], [x - 30, bot]], 1.6, PAL.ink, { closed: true });
    p.rect(x - 5, top - 6, 10, 7, '#8c7a50'); p.inkRect(x - 5, top - 6, 10, 7, 1, PAL.ink);
    // bulb
    p.ellipse(x, bot + 4, 9, 7, night ? '#fff3c4' : '#fbe7b0', PAL.ink, 1);
    if (night) { p.glow(x, bot + 6, 60, '#ffd98a', 0.55); p.glow(x, bot + 6, 22, '#fff8e0', 0.6); }
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.laundromat = paintLaundromat;
})();
