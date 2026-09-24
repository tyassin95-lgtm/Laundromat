// Rosa's apartment above the laundromat. 1400 x 720 virtual px.
// Layout contract (web/js/scenes/home.js): door 16-104, kitchenette 120-420, window 470-890
// (glass 480-880 x 96-400, hole), desk ~1060, bed 1150-1392, floor line 472.
(function () {
  const { Painter, PAL, shade, mix } = Paint;
  const W = 1400, FLOOR = 472;

  function paintHome(variant, scale) {
    const p = new Painter(W, 720, scale || 1.5, 3131);
    const c = p.ctx;
    // ceiling with beams
    p.vgrad(0, 0, W, 58, [[0, '#6e5a44'], [1, '#8f7757']]);
    for (let x = 30; x < W; x += 170) { p.rect(x, 0, 26, 58, PAL.woodD); p.rect(x, 0, 6, 58, PAL.woodL); p.ink([[x, 0], [x, 58]], 1.2, PAL.ink, { alpha: 0.6 }); p.ink([[x + 26, 0], [x + 26, 58]], 1.2, PAL.ink, { alpha: 0.6 }); }
    p.rect(0, 56, W, 10, PAL.woodD); p.ink([[0, 66], [W, 66]], 2, PAL.ink);
    // wallpaper: dusty terracotta stripes with tiny flowers
    p.rect(0, 66, W, FLOOR - 66, '#d9b08c');
    for (let x = 0; x < W; x += 36) { p.rect(x, 66, 14, FLOOR - 66, 'rgba(190,120,90,0.35)'); p.rect(x + 14, 66, 2, FLOOR - 66, 'rgba(255,240,220,0.25)'); }
    const r = p.rand(3132);
    for (let x = 25; x < W; x += 36) for (let y = 90; y < FLOOR - 30; y += 44) {
      const yy = y + ((x / 36) % 2) * 22;
      p.ellipse(x, yy, 3.2, 3.2, 'rgba(150,80,60,0.45)'); p.ellipse(x, yy, 1.4, 1.4, 'rgba(240,210,150,0.8)');
    }
    p.mottle(0, 66, W, FLOOR - 66, { scale: 90, amount: 0.08, seed: 3133, tint: '#7a5030', tintAmount: 0.3 });
    p.strokes(0, 66, W, FLOOR - 66, { colors: ['#e8c8a8', '#b58668'], len: 30, width: 4, alpha: 0.07, angle: Math.PI / 2, seed: 3134 });
    // wainscot / skirting
    p.rect(0, 380, W, 8, PAL.woodL); p.ink([[0, 380], [W, 380]], 1.4, PAL.ink); p.ink([[0, 388], [W, 388]], 1.4, PAL.ink);
    p.planks(0, 388, W, FLOOR - 388, { vertical: true, plankH: 30, colors: ['#8a5a3a', '#94623f', '#7f5234'], seed: 3135 });
    p.rect(0, FLOOR - 10, W, 10, PAL.woodD); p.ink([[0, FLOOR], [W, FLOOR]], 2, PAL.ink);
    // floor: warm planks
    p.planks(0, FLOOR, W, 720 - FLOOR, { plankH: 22, len: 180, colors: ['#a86b3c', '#b27442', '#9a5f35', '#b8804e'], seed: 3136 });
    p.vshade(0, FLOOR, W, 60, '#000', 0.3, 0);
    p.mottle(0, FLOOR, W, 720 - FLOOR, { scale: 70, amount: 0.1, seed: 3137 });

    // door to the stairs
    const dx = 18, dy = 190;
    p.rect(dx - 8, dy - 10, 104, FLOOR - dy + 10, PAL.woodD); p.inkRect(dx - 8, dy - 10, 104, FLOOR - dy + 10, 1.8, PAL.ink);
    p.planks(dx, dy, 88, FLOOR - dy, { vertical: true, plankH: 22, colors: ['#7a4f30', '#86573a', '#6e4629'], seed: 3138 });
    p.ellipse(dx + 74, dy + 150, 5, 5, PAL.gold, PAL.ink, 1.2);
    for (const hy of [dy + 60, dy + 180]) p.rect(dx - 4, hy, 10, 20, '#5a4a38');
    p.inkRect(dx, dy, 88, FLOOR - dy, 2, PAL.ink);
    // coat hooks by the door with a scarf
    p.rect(118, 170, 70, 10, PAL.woodD); p.inkRect(118, 170, 70, 10, 1.2, PAL.ink);
    p.poly([[132, 180], [150, 180], [148, 250], [134, 256]], '#3f6c74', PAL.ink, 1.4);
    p.poly([[160, 180], [178, 180], [182, 236], [162, 240]], '#c4692e', PAL.ink, 1.4);

    // kitchenette
    const kx = 196, kw = 250;
    p.rect(kx, 300, kw, 10, '#8f7a5a');
    p.tiles(kx, 230, kw, 70, { tw: 16, th: 16, colors: ['#e9ddc0', '#f2e6cc', '#dcd0b0'], grout: '#b3a07a', seed: 3139 });
    // upper open shelf with jars
    p.rect(kx, 150, kw, 10, PAL.wood); p.inkRect(kx, 150, kw, 10, 1.4, PAL.ink);
    const jr = p.rand(3140);
    for (let i = 0; i < 8; i++) { const jx = kx + 12 + i * 30; const jh = 26 + jr() * 18; p.rect(jx, 150 - jh, 20, jh, jr.pick(['rgba(200,220,210,0.6)', '#c9a24c', '#e8dcc0', '#b86a4a'])); p.inkRect(jx, 150 - jh, 20, jh, 1, PAL.ink); }
    // counter + cabinets
    p.rect(kx - 6, 300, kw + 12, 16, '#c9b48a'); p.inkRect(kx - 6, 300, kw + 12, 16, 1.6, PAL.ink);
    p.rect(kx, 316, kw, FLOOR - 316, PAL.teal);
    for (let i = 0; i < 3; i++) { p.rect(kx + 8 + i * 80, 326, 74, FLOOR - 340, PAL.tealL); p.inkRect(kx + 8 + i * 80, 326, 74, FLOOR - 340, 1.3, PAL.ink); p.rect(kx + 40 + i * 80, 340, 12, 4, PAL.gold); }
    p.specks(kx, 316, kw, FLOOR - 316, { colors: [PAL.rust, PAL.cream], size: 1.4, count: 60, alpha: 0.6, seed: 3141 });
    p.inkRect(kx, 316, kw, FLOOR - 316, 1.8, PAL.ink);
    // stove top + sink
    p.rect(kx + 20, 292, 90, 8, '#3a3632'); p.ellipse(kx + 42, 294, 14, 3, '#1e1c1a'); p.ellipse(kx + 88, 294, 14, 3, '#1e1c1a');
    p.rect(kx + 150, 294, 80, 8, '#a8a8a0'); p.ink([[kx + 190, 294], [kx + 190, 262], [kx + 206, 262]], 3, '#8a8a82');

    // big window with window seat
    const wx = 470, wy = 86, ww = 420, wh = 324;
    p.rect(wx - 16, wy - 14, ww + 32, wh + 28, PAL.cream); p.inkRect(wx - 16, wy - 14, ww + 32, wh + 28, 1.8, PAL.ink);
    p.window(wx, wy, ww, wh, { frame: '#efe3c6', frameW: 10, cols: 3, rows: 2, hole: true, sill: false, seed: 3142 });
    // curtains
    for (const [cx, dir] of [[wx - 30, 1], [wx + ww + 30, -1]]) {
      const path = cc => { cc.moveTo(cx - 34 * dir, 70); cc.lineTo(cx + 44 * dir, 70); cc.quadraticCurveTo(cx + 18 * dir, 250, cx + 36 * dir, 430); cc.lineTo(cx - 34 * dir, 430); cc.closePath(); };
      c.fillStyle = '#b8563a'; c.beginPath(); path(c); c.fill();
      p.strokes(Math.min(cx - 34 * dir, cx + 44 * dir), 70, 78, 360, { colors: ['#8f3f2c', '#d06a48'], len: 60, width: 4, alpha: 0.25, angle: Math.PI / 2, angleJitter: 0.05, seed: cx, clip: path });
      for (let k = 0; k < 4; k++) p.ink([[cx - 20 * dir + k * 14 * dir, 80], [cx - 18 * dir + k * 12 * dir, 420]], 1, 'rgba(90,30,20,0.35)');
      p.ink([[cx + 44 * dir, 70], [cx + 18 * dir, 250], [cx + 36 * dir, 430]], 1.6, PAL.ink);
      p.ink([[cx - 34 * dir, 430], [cx + 36 * dir, 430]], 1.4, PAL.ink);
    }
    p.rect(wx - 60, 62, ww + 120, 8, '#6a4e34'); p.ellipse(wx - 62, 66, 7, 7, PAL.gold, PAL.ink, 1); p.ellipse(wx + ww + 62, 66, 7, 7, PAL.gold, PAL.ink, 1);
    // window seat
    p.rect(wx - 10, 410, ww + 20, 20, PAL.woodL); p.inkRect(wx - 10, 410, ww + 20, 20, 1.6, PAL.ink);
    p.rect(wx - 10, 430, ww + 20, FLOOR - 430, PAL.woodD); p.inkRect(wx - 10, 430, ww + 20, FLOOR - 430, 1.6, PAL.ink);
    p.rect(wx, 394, ww, 18, '#3f6c74'); p.inkRect(wx, 394, ww, 18, 1.4, PAL.ink);
    for (const [px, col] of [[wx + 30, '#e8b04e'], [wx + ww - 90, '#c4692e']]) { p.ellipse(px + 30, 386, 34, 20, col, PAL.ink, 1.4); p.strokes(px, 368, 60, 36, { colors: [shade(col, -0.2)], len: 10, width: 2, alpha: 0.3, seed: px, clip: cc => cc.ellipse(px + 30, 386, 34, 20, 0, 0, Math.PI * 2) }); }
    // radiator under the seat
    p.rect(wx + 130, 440, 160, FLOOR - 444, '#b8b0a0');
    for (let i = 0; i < 10; i++) p.rect(wx + 136 + i * 15, 444, 9, FLOOR - 452, '#d0c8b8');
    p.inkRect(wx + 130, 440, 160, FLOOR - 444, 1.4, PAL.ink);

    // wall shelf over the desk + picture rail
    p.rect(920, 330, 210, 10, PAL.wood); p.inkRect(920, 330, 210, 10, 1.3, PAL.ink);
    const br = p.rand(3143);
    for (let i = 0; i < 12; i++) { const bh = 30 + br() * 16; p.rect(930 + i * 14, 330 - bh, 11, bh, br.pick(['#8f3f2c', '#3f6c74', '#c9a24c', '#5a6a3a', '#e6d2a6'])); p.inkRect(930 + i * 14, 330 - bh, 11, bh, 0.8, PAL.ink); }

    // bed (side view): footboard left, tall headboard right
    const bx = 1146, bw = 246;
    p.vshade(bx, 640, bw, 30, '#000', 0.0, 0.35);
    p.rect(bx + 8, 600, 16, 58, PAL.woodD); p.inkRect(bx + 8, 600, 16, 58, 1.4, PAL.ink);
    p.rect(bx + bw - 40, 600, 16, 58, PAL.woodD); p.inkRect(bx + bw - 40, 600, 16, 58, 1.4, PAL.ink);
    // side rail
    p.rect(bx + 4, 578, bw - 30, 26, PAL.wood); p.inkRect(bx + 4, 578, bw - 30, 26, 1.6, PAL.ink);
    // mattress
    p.rect(bx + 10, 520, bw - 42, 60, '#efe3c6'); p.inkRect(bx + 10, 520, bw - 42, 60, 1.4, PAL.ink);
    // headboard (right) and footboard (left)
    p.rect(bx + bw - 26, 380, 24, 280, PAL.woodD); p.rect(bx + bw - 26, 380, 7, 280, PAL.woodL); p.inkRect(bx + bw - 26, 380, 24, 280, 1.8, PAL.ink);
    p.ellipse(bx + bw - 14, 378, 16, 9, PAL.woodL, PAL.ink, 1.4);
    p.rect(bx - 4, 470, 20, 190, PAL.woodD); p.rect(bx - 4, 470, 6, 190, PAL.woodL); p.inkRect(bx - 4, 470, 20, 190, 1.8, PAL.ink);
    p.ellipse(bx + 6, 468, 13, 8, PAL.woodL, PAL.ink, 1.4);
    // pillows
    p.ellipse(bx + bw - 66, 508, 46, 22, '#f7ead0', PAL.ink, 1.4);
    p.ellipse(bx + bw - 100, 514, 40, 18, '#e8d8b4', PAL.ink, 1.4);
    // quilt (patchwork) over the mattress, hanging down the side
    const qpath = cc => { cc.moveTo(bx + 12, 512); cc.quadraticCurveTo(bx + 90, 504, bx + bw - 110, 514); cc.lineTo(bx + bw - 104, 598); cc.quadraticCurveTo(bx + 90, 606, bx + 8, 600); cc.closePath(); };
    p.clip(() => {
      const qr = p.rand(3144);
      const qcols = ['#3f6c74', '#c4692e', '#efdcb2', '#e8b04e', '#8f3f2c', '#6c9aa0'];
      for (let qx = bx; qx < bx + bw - 90; qx += 24) for (let qy = 500; qy < 610; qy += 22) p.rect(qx, qy, 24, 22, qr.pick(qcols));
      p.strokes(bx, 500, bw - 90, 110, { colors: ['#2a1c14', '#fff4dd'], len: 8, width: 1, alpha: 0.18, seed: 3145 });
      for (let qx = bx; qx < bx + bw - 90; qx += 24) p.ink([[qx, 500], [qx, 610]], 0.8, 'rgba(60,40,30,0.5)');
      for (let qy = 500; qy < 610; qy += 22) p.ink([[bx, qy], [bx + bw - 90, qy]], 0.8, 'rgba(60,40,30,0.5)');
      p.vshade(bx, 560, bw, 50, '#000', 0, 0.25);
    }, qpath);
    c.beginPath(); qpath(c); c.lineWidth = 1.8; c.strokeStyle = PAL.ink; c.stroke();
    // pendant lamp
    p.ink([[700, 66], [700, 110]], 1.6, '#2a2520');
    p.ellipse(700, 122, 44, 16, '#e8b04e', PAL.ink, 1.6);
    p.poly([[664, 118], [736, 118], [724, 138], [676, 138]], '#e8b04e', PAL.ink, 1.4);

    p.vshade(0, 0, W, 90, '#000', 0.25, 0);
    p.hshade(0, 0, 60, 720, '#000', 0.3, 0);
    p.hshade(W - 60, 0, 60, 720, '#000', 0, 0.3);
    p.grain(0.035, { seed: 3146 });
    p.vignette(0.25);
    return p;
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.home = paintHome;
})();
