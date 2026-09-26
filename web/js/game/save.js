// Save / load. The game autosaves at safe points (start of each phase, after sleeping, on pause).
// Data is kept in localStorage and mirrored to the Android app's private storage when available.
import { G, setState, newState, SAVE_VERSION } from './state.js';

const KEY = 'lastlaundromat.save.v1';
const SETTINGS_KEY = 'lastlaundromat.settings.v1';
const CHECKPOINT_KEY = 'lastlaundromat.checkpoint';
const bridge = () => (typeof window !== 'undefined' && window.AndroidBridge) || null;

function readRaw(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch (e) { /* storage unavailable */ }
  if (!raw && bridge()) { try { raw = bridge().loadBackup(key) || null; } catch (e) { /* noop */ } }
  return raw;
}

function writeRaw(key, raw) {
  try { localStorage.setItem(key, raw); } catch (e) { /* quota / unavailable */ }
  if (bridge()) { try { bridge().saveBackup(key, raw); } catch (e) { /* noop */ } }
}

export const Save = {
  exists() { return !!readRaw(KEY); },

  peek() {
    const raw = readRaw(KEY);
    if (!raw) return null;
    try { const s = JSON.parse(raw); return { name: s.name, day: s.day, money: s.money, phase: s.phase, ending: s.ending }; } catch (e) { return null; }
  },

  save() {
    try {
      G.savedAt = Date.now();
      writeRaw(KEY, JSON.stringify(G));
      return true;
    } catch (e) { console.warn('save failed', e); return false; }
  },

  load() {
    const raw = readRaw(KEY);
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      setState(migrate(s));
      return true;
    } catch (e) { console.warn('load failed', e); return false; }
  },

  wipe() {
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    if (bridge()) { try { bridge().deleteBackup(KEY); } catch (e) { /* noop */ } }
  },

  // Snapshot taken just before the final decision, so a "sell" ending can be rewound.
  saveCheckpoint() { try { writeRaw(CHECKPOINT_KEY, JSON.stringify(G)); } catch (e) { /* noop */ } },
  hasCheckpoint() { return !!readRaw(CHECKPOINT_KEY); },
  restoreCheckpoint() {
    const raw = readRaw(CHECKPOINT_KEY);
    if (!raw) return false;
    try {
      const s = migrate(JSON.parse(raw));
      delete s.flags.ev_final_morning; delete s.flags.checkpoint; delete s.flags.ending_done;
      s.ending = null; s.phase = 'morning';
      setState(s);
      writeRaw(KEY, JSON.stringify(s));
      return true;
    } catch (e) { console.warn('checkpoint restore failed', e); return false; }
  },

  loadSettings() {
    const raw = readRaw(SETTINGS_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  saveSettings(s) { writeRaw(SETTINGS_KEY, JSON.stringify(s)); },
};

// Fill in any fields added in later versions so old saves keep working.
function migrate(s) {
  const base = newState(s.name);
  const out = Object.assign(base, s);
  for (const k of ['flags', 'vars', 'hearts', 'inv', 'placed', 'skills', 'collections', 'policies', 'stats', 'today', 'talked', 'gifted', 'seen', 'quests']) {
    out[k] = Object.assign({}, base[k], s[k] || {});
  }
  out.version = SAVE_VERSION;
  return out;
}
