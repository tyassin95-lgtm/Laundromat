// Hand-drawn neighbourhood map on old paper. 1280 x 720. Pins are added by the game (percent coords
// in web/js/data/locations.js).
(function () {
  const { Painter, PAL, shade, mix } = Paint;

  function paintMap(variant, scale) {
    const W = 1280, H = 720;
    const p = new Painter(W, H, scale || 1.5, 8181);
    const c = p.ctx;
    const r = p.rand(8182);
    // paper
    p.vgrad(0, 0, W, H, [[0, '#ecd9b0'], [1, '#dcc394']]);
    p.mottle(0, 0, W, H, { scale: 120, amount: 0.14, seed: 8183, tint: '#8a6a3a', tintAmount: 0.35 });
    p.fibres(0, 0, W, H, { colors: ['#b89868', '#f7ead0'], count: 2500, seed: 8184 });
    // river along the bottom
    c.save();
    c.beginPath(); c.moveTo(0, 590); c.bezierCurveTo(300, 560, 520, 640, 800, 600); c.bezierCurveTo(1000, 575, 1150, 610, W, 590); c.lineTo(W, H); c.lineTo(0, H); c.closePath();
    c.fillStyle = '#8fb3b8'; c.fill(); c.restore();
    p.strokes(0, 590, W, 130, { colors: ['#6f9aa0', '#b8d4d6'], len: 30, width: 2, alpha: 0.35, count: 400, seed: 8185, clip: cc => { cc.moveTo(0, 600); cc.bezierCurveTo(300, 570, 520, 650, 800, 610); cc.bezierCurveTo(1000, 585, 1150, 620, W, 600); cc.lineTo(W, H); cc.lineTo(0, H); cc.closePath(); } });
    p.ink([[0, 590], [150, 572], [300, 568], [420, 590], [520, 612], [650, 612], [800, 600], [950, 582], [1100, 590], [1280, 590]], 2.2, PAL.ink2, { wobble: 1 });
    p.text('~ the river ~', 250, 650, 'italic 26px Caveat', '#4a6a70');
    // bridge
    p.rect(980, 560, 26, 160, '#b8a888'); p.inkRect(980, 560, 26, 160, 1.6, PAL.ink);
    // streets
    const street = (pts, w) => { p.ink(pts, w + 6, '#8a7a5a', { wobble: 0.6 }); p.ink(pts, w, '#f3e6c8', { wobble: 0.6 }); };
    street([[0, 330], [1280, 318]], 34);           // Linden Street
    street([[640, 0], [652, 330], [660, 560]], 24);   // Alder Lane
    street([[980, 318], [992, 560]], 20);          // Mill Road
    street([[160, 330], [170, 560]], 18);
    street([[0, 560], [1280, 548]], 16);           // River Walk
    p.text('LINDEN STREET', 400, 330, '700 22px Fraunces', '#6b5440', { scaleX: 1.25 });
    p.text('ALDER LN', 668, 170, '700 15px Fraunces', '#6b5440', { rotate: Math.PI / 2 });
    p.text('RIVER WALK', 1120, 548, '700 15px Fraunces', '#6b5440');
    // city blocks (hatched)
    const block = (x, y, w, h, tint) => {
      p.rect(x, y, w, h, tint || '#d9c29a');
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = 'rgba(107,84,64,0.35)'; c.lineWidth = 1.2;
      for (let k = -h; k < w; k += 9) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.stroke(); }
      c.restore();
      p.inkRect(x, y, w, h, 1.6, PAL.ink2, { seed: x + y });
    };
    block(40, 360, 100, 170); block(200, 360, 180, 80); block(410, 360, 210, 170, '#e3cfa6');
    block(690, 360, 270, 170); block(1030, 360, 220, 160, '#cdb58a');
    block(40, 200, 560, 100); block(690, 220, 260, 80); block(1030, 200, 230, 90, '#cdb58a');
    // park: trees
    c.save(); c.fillStyle = 'rgba(111,125,60,0.35)'; c.beginPath(); c.roundRect(60, 40, 520, 140, 30); c.fill(); c.restore();
    for (let i = 0; i < 26; i++) { const tx = 90 + r() * 470, ty = 60 + r() * 100; p.ellipse(tx, ty, 16, 14, mix('#6f7d3c', '#8e9a4c', r()), PAL.ink2, 1.2); p.rect(tx - 1.5, ty + 10, 3, 8, PAL.woodD); }
    p.ellipse(330, 110, 34, 20, '#8fb3b8', PAL.ink2, 1.4);
    p.text('Linden Park', 470, 58, '700 24px Caveat', '#4a5a2a');
    // community garden (behind Alder Arms)
    c.save(); c.fillStyle = 'rgba(138,106,70,0.35)'; c.fillRect(210, 450, 170, 80); c.restore();
    for (let gx = 222; gx < 370; gx += 36) for (let gy = 462; gy < 520; gy += 26) { p.rect(gx, gy, 26, 16, '#7d8c44'); p.inkRect(gx, gy, 26, 16, 1, PAL.ink2); }
    // construction site (old factory)
    c.save(); c.setLineDash([8, 6]); c.strokeStyle = '#b3402f'; c.lineWidth = 2.5; c.strokeRect(1030, 200, 230, 90); c.restore();
    p.text('old Cap & Seal lot', 1145, 190, 'italic 20px Caveat', '#8f3f2c');
    // compass rose
    const cx = 1180, cy = 90;
    p.ellipse(cx, cy, 44, 44, 'rgba(255,248,230,0.5)', PAL.ink2, 1.5);
    p.poly([[cx, cy - 40], [cx + 8, cy], [cx, cy + 40], [cx - 8, cy]], '#8f3f2c', PAL.ink2, 1.2);
    p.poly([[cx - 40, cy], [cx, cy - 8], [cx + 40, cy], [cx, cy + 8]], '#3f6c74', PAL.ink2, 1.2);
    p.text('N', cx, cy - 52, '700 16px Fraunces', PAL.ink2);
    // title cartouche
    p.rect(690, 36, 360, 80, 'rgba(255,248,230,0.55)'); p.inkRect(690, 36, 360, 80, 2, PAL.ink2);
    p.inkRect(696, 42, 348, 68, 1, PAL.ink2, { alpha: 0.6 });
    p.text('Linden Street', 870, 72, '36px Pacifico', '#8f3f2c');
    p.text('& environs — as Rosa knew it', 870, 100, 'italic 16px Fraunces', PAL.ink2);
    // doodles & coffee ring
    c.save(); c.strokeStyle = 'rgba(120,80,40,0.25)'; c.lineWidth = 6; c.beginPath(); c.arc(140, 640, 44, 0.3, 5.9); c.stroke(); c.restore();
    p.text('good bench →', 150, 250, 'italic 20px Caveat', '#6b5440', { rotate: -0.08 });
    p.vignette(0.35);
    p.grain(0.03, { seed: 8186 });
    return p;
  }

  window.Scenes = window.Scenes || {};
  window.Scenes.map = paintMap;
})();
