// Pointer input on the game canvas: taps, drags (camera pans) and long presses.
export class Input {
  constructor(el) {
    this.el = el;
    this.handlers = { tap: [], drag: [], dragEnd: [], down: [], long: [] };
    this.active = null;
    this.enabled = true;
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', () => { this.active = null; });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  on(type, fn) { this.handlers[type].push(fn); return () => { this.handlers[type] = this.handlers[type].filter(f => f !== fn); }; }
  emit(type, ...a) { for (const f of this.handlers[type]) f(...a); }

  down(e) {
    if (!this.enabled) return;
    try { this.el.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    this.active = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), dragging: false, longFired: false };
    const a = this.active;
    a.timer = setTimeout(() => {
      if (this.active === a && !a.dragging) { a.longFired = true; this.emit('long', a.x, a.y); }
    }, 550);
    this.emit('down', e.clientX, e.clientY);
  }
  move(e) {
    const a = this.active;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    a.x = e.clientX; a.y = e.clientY;
    if (!a.dragging && Math.hypot(a.x - a.x0, a.y - a.y0) > 14) { a.dragging = true; clearTimeout(a.timer); }
    if (a.dragging) this.emit('drag', dx, dy, a.x, a.y);
  }
  up(e) {
    const a = this.active;
    if (!a || a.id !== e.pointerId) return;
    clearTimeout(a.timer);
    this.active = null;
    if (!this.enabled) return;
    if (a.dragging) { this.emit('dragEnd'); return; }
    if (a.longFired) return;
    this.emit('tap', e.clientX, e.clientY);
  }
}
