// Audio: Web Audio for sound effects and seamless ambience loops, <audio> elements for
// streamed music with crossfades. Files live in assets/audio/{sfx,amb,music}/<name>.ogg.
import { clamp } from './util.js';

const SFX_NAMES = [
  'shop_bell', 'bell_small', 'thunder', 'thunder_far', 'meow', 'meow2', 'purr', 'camera', 'needle_drop', 'phone_buzz',
  'ratchet', 'wrench', 'applause', 'applause_big', 'spray', 'coin', 'coins_jar', 'type_key', 'type_bell', 'chime',
  'machine_door', 'kettle', 'pencil', 'mop', 'knitting', 'pigeons', 'bus', 'click', 'select', 'confirm', 'back', 'error',
  'pop', 'drop', 'toggle', 'tick', 'question', 'open', 'close', 'coins', 'coins2', 'cloth1', 'cloth2', 'cloth3', 'cloth4',
  'book_open', 'book_close', 'page', 'door_open', 'door_close', 'creak', 'latch', 'metal_click', 'clank', 'clank2', 'cup',
  'thud', 'step_tile1', 'step_tile2', 'step_tile3', 'step_wood1', 'step_wood2', 'step_wood3', 'jingle_good', 'jingle_great',
  'jingle_sad', 'jingle_day', 'jingle_week', 'jingle_steel', 'machine_done', 'machine_start', 'machine_error', 'blip',
  'heart', 'sparkle', 'whoosh', 'whoosh2', 'register', 'notify',
];

class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.ambBuffers = new Map();
    this.ambLoading = new Map();
    this.amb = new Map();     // name -> {src, gain, target}
    this.vol = { master: 1, music: 0.7, sfx: 0.9, amb: 0.8, voice: 0.6 };
    this.musicEls = [];       // [{el, key, target, cur}]
    this.musicKey = null;
    this.duckLevel = 1;
    this.paused = false;
    this.unlocked = false;
    this.pendingMusic = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
    this.ambBus = this.ctx.createGain(); this.ambBus.connect(this.master);
    this.applyVolumes();
  }

  // Must be called from a user gesture on browsers (WebView allows autoplay).
  unlock() {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      // silent blip to fully unlock iOS-like policies
      const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.master); s.start(0);
      if (this.pendingMusic) { const p = this.pendingMusic; this.pendingMusic = null; this.music(p.key, p.fade); }
      for (const m of this.musicEls) if (m.el.paused && m.target > 0) m.el.play().catch(() => {});
    }
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.amb, t, 0.05);
  }

  async loadAll(onProgress) {
    this.init();
    if (!this.ctx) return;
    let done = 0;
    await Promise.all(SFX_NAMES.map(async n => {
      try {
        const res = await fetch('assets/audio/sfx/' + n + '.ogg');
        const buf = await res.arrayBuffer();
        this.buffers.set(n, await this.decode(buf));
      } catch (e) { console.warn('sfx', n, e); }
      done++; if (onProgress) onProgress(done / SFX_NAMES.length);
    }));
  }

  decode(buf) {
    return new Promise((res, rej) => {
      const p = this.ctx.decodeAudioData(buf, res, rej);
      if (p && p.then) p.then(res, rej);
    });
  }

  play(name, o) {
    if (!this.ctx || this.paused) return null;
    const buf = this.buffers.get(name);
    if (!buf) return null;
    o = o || {};
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    let rate = o.rate || 1;
    if (o.jitter) rate *= 1 + (Math.random() - 0.5) * 2 * o.jitter;
    src.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = (o.vol === undefined ? 1 : o.vol) * (o.voice ? this.vol.voice / Math.max(0.001, this.vol.sfx) : 1);
    let node = g;
    if (o.pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); node = p;
    }
    src.connect(g);
    node.connect(this.sfxBus);
    src.start(this.ctx.currentTime + (o.delay || 0));
    return src;
  }

  // ------------------------------------------------------------ ambience
  async loadAmb(name) {
    if (this.ambBuffers.has(name)) return this.ambBuffers.get(name);
    if (this.ambLoading.has(name)) return this.ambLoading.get(name);
    const p = (async () => {
      try {
        const res = await fetch('assets/audio/amb/' + name + '.ogg');
        const buf = await this.decode(await res.arrayBuffer());
        this.ambBuffers.set(name, buf);
        return buf;
      } catch (e) { console.warn('amb', name, e); return null; }
      finally { this.ambLoading.delete(name); }
    })();
    this.ambLoading.set(name, p);
    return p;
  }

  // Declarative ambience: pass {name: volume}; anything not listed fades out.
  setAmbience(layers, fade = 1.5) {
    this.init();
    if (!this.ctx) return;
    this.ambTargets = layers;
    for (const [name, a] of this.amb) {
      if (!(name in layers)) this.fadeAmb(name, 0, fade);
    }
    for (const [name, v] of Object.entries(layers)) this.ambLayer(name, v, fade);
  }

  async ambLayer(name, vol, fade = 1.5) {
    if (!this.ctx) return;
    let a = this.amb.get(name);
    if (!a) {
      a = { src: null, gain: this.ctx.createGain(), target: vol, starting: true };
      a.gain.gain.value = 0;
      a.gain.connect(this.ambBus);
      this.amb.set(name, a);
      const buf = await this.loadAmb(name);
      if (!buf || this.amb.get(name) !== a) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(a.gain);
      src.start(0, Math.random() * buf.duration);
      a.src = src; a.starting = false;
    }
    a.target = vol;
    const t = this.ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.linearRampToValueAtTime(vol, t + Math.max(0.05, fade));
  }

  fadeAmb(name, vol, fade = 1.5) {
    const a = this.amb.get(name);
    if (!a || !this.ctx) return;
    const t = this.ctx.currentTime;
    a.target = vol;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(a.gain.gain.value, t);
    a.gain.gain.linearRampToValueAtTime(vol, t + Math.max(0.05, fade));
    if (vol === 0) {
      setTimeout(() => {
        if (this.amb.get(name) === a && a.target === 0) {
          try { a.src && a.src.stop(); } catch (e) { /* noop */ }
          a.gain.disconnect();
          this.amb.delete(name);
        }
      }, fade * 1000 + 120);
    }
  }

  // ------------------------------------------------------------ music
  music(key, fade = 2.0) {
    if (key === this.musicKey) return;
    this.musicKey = key;
    if (!this.unlocked && !window.AndroidBridge) { this.pendingMusic = { key, fade }; }
    for (const m of this.musicEls) { m.target = 0; m.fade = fade; }
    if (!key) return;
    const el = new window.Audio('assets/audio/music/' + key + '.ogg');
    el.loop = true; el.preload = 'auto'; el.volume = 0;
    const m = { el, key, target: 1, cur: 0, fade };
    this.musicEls.push(m);
    if (!this.paused) el.play().catch(() => { /* waits for unlock */ });
  }

  duck(level) { this.duckLevel = level; }

  update(dt) {
    for (let i = this.musicEls.length - 1; i >= 0; i--) {
      const m = this.musicEls[i];
      const step = dt / Math.max(0.05, m.fade || 1.5);
      m.cur = m.target > m.cur ? Math.min(m.target, m.cur + step) : Math.max(m.target, m.cur - step);
      const v = clamp(m.cur * this.vol.music * this.vol.master * this.duckLevel, 0, 1);
      if (Math.abs(m.el.volume - v) > 0.001) m.el.volume = v;
      if (m.target === 0 && m.cur === 0) { m.el.pause(); m.el.src = ''; this.musicEls.splice(i, 1); }
    }
  }

  pauseAll() {
    this.paused = true;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
    for (const m of this.musicEls) m.el.pause();
  }

  resumeAll() {
    this.paused = false;
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    for (const m of this.musicEls) if (m.target > 0) m.el.play().catch(() => {});
  }
}

export const Sound = new AudioManager();
