// Minimal promise-based tweening.
import { Ease } from './util.js';

class Tweens {
  constructor() { this.list = []; this.timers = []; }

  to(obj, props, dur = 0.3, ease = Ease.outQuad, delay = 0) {
    if (typeof ease === 'string') ease = Ease[ease] || Ease.outQuad;
    let resolve;
    const p = new Promise(r => (resolve = r));
    const tw = { obj, props, dur: Math.max(0.0001, dur), ease, delay, t: 0, from: null, resolve, dead: false };
    this.list.push(tw);
    p.tween = tw;
    return p;
  }

  wait(sec) {
    return new Promise(r => this.timers.push({ t: sec, r }));
  }

  kill(obj) {
    for (const tw of this.list) if (tw.obj === obj) { tw.dead = true; tw.resolve(); }
  }

  update(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) { this.timers.splice(i, 1); tm.r(); }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      if (tw.dead) { this.list.splice(i, 1); continue; }
      if (tw.delay > 0) { tw.delay -= dt; continue; }
      if (!tw.from) {
        tw.from = {};
        for (const k in tw.props) tw.from[k] = tw.obj[k];
      }
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(k);
      for (const key in tw.props) tw.obj[key] = tw.from[key] + (tw.props[key] - tw.from[key]) * e;
      if (k >= 1) { this.list.splice(i, 1); tw.resolve(); }
    }
  }
}

export const tweens = new Tweens();
