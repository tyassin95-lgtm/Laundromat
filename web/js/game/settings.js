// Player settings (persisted separately from the save game).
import { Save } from './save.js';
import { Sound } from '../engine/audio.js';

const DEFAULTS = { music: 0.7, sfx: 0.9, amb: 0.8, voices: true, voiceVol: 0.6, textSpeed: 'normal', textSize: 1, vibrate: true, quality: 1, pace: 'normal' };
let s = Object.assign({}, DEFAULTS);

export const Settings = {
  load() { s = Object.assign({}, DEFAULTS, Save.loadSettings() || {}); this.apply(); },
  save() { Save.saveSettings(s); },
  get(k) { return s[k]; },
  set(k, v) { s[k] = v; this.apply(); this.save(); },
  all() { return Object.assign({}, s); },
  apply() {
    Sound.vol.music = s.music; Sound.vol.sfx = s.sfx; Sound.vol.amb = s.amb; Sound.vol.voice = s.voiceVol;
    Sound.applyVolumes();
    document.documentElement.style.setProperty('--ts', String(s.textSize));
  },
  textSpeed() { return { slow: 28, normal: 55, fast: 110, instant: Infinity }[s.textSpeed] || 55; },
};

export function vibrate(ms = 12) {
  if (!s.vibrate) return;
  try {
    if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(ms);
    else if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* noop */ }
}
