// Asset loading: sprite manifest + images, lazily loaded backgrounds, fonts.
// Every visual lives in web/assets; replacing a file with another of the same name swaps it.

const cache = new Map();      // name -> HTMLImageElement
const pending = new Map();    // name -> Promise
const bgUse = new Set();      // background keys, least recently used first
const MAX_BGS = 10;
export let manifest = {};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('failed to load ' + url));
    im.src = url;
  });
}

export const Assets = {
  async init(onProgress) {
    const res = await fetch('assets/sprites/manifest.json');
    manifest = await res.json();
    const names = Object.keys(manifest);
    let done = 0;
    const total = names.length;
    await Promise.all(names.map(async n => {
      try {
        const im = await loadImage('assets/sprites/' + n + '.webp');
        cache.set(n, im);
      } catch (e) { console.warn(e.message); }
      done++;
      if (onProgress) onProgress(done / total);
    }));
  },

  // Sprite image by manifest name (sync; null if missing).
  img(name) { return cache.get(name) || null; },
  has(name) { return cache.has(name); },
  url(name) { return 'assets/sprites/' + name + '.webp'; },

  // Background image (lazy). Returns a promise. Keeps only the most recently used few in memory
  // (a big painted background decodes to ~15 MB).
  bg(name) {
    const key = 'bg:' + name;
    bgUse.delete(key); bgUse.add(key);
    while (bgUse.size > MAX_BGS) { const old = bgUse.values().next().value; bgUse.delete(old); cache.delete(old); }
    if (cache.has(key)) return Promise.resolve(cache.get(key));
    if (pending.has(key)) return pending.get(key);
    const p = loadImage('assets/bg/' + name + '.webp').then(im => { cache.set(key, im); pending.delete(key); return im; })
      .catch(e => { console.warn(e.message); pending.delete(key); return null; });
    pending.set(key, p);
    return p;
  },
  bgSync(name) { return cache.get('bg:' + name) || null; },
  dropBg(name) { cache.delete('bg:' + name); bgUse.delete('bg:' + name); },

  async fonts() {
    if (!document.fonts) return;
    const faces = ['20px "Patrick Hand"', '700 20px Fraunces', 'italic 20px Fraunces', '20px Pacifico', '700 20px Caveat'];
    try { await Promise.race([Promise.all(faces.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) { /* ignore */ }
  },
};
