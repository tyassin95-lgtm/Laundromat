// Visual-novel style dialogue overlay: portraits, name plate, typewriter text, choices.
import { el, escapeHtml } from '../engine/util.js';
import { Sound } from '../engine/audio.js';
import { CHARACTERS, portraitFor } from '../data/characters.js';
import { G } from '../game/state.js';
import { Settings } from '../game/settings.js';

let root = null, box = null, textEl = null, nameEl = null, nextEl = null, choicesEl = null;
const portraits = { left: null, right: null };
let typing = null;     // {full, i, resolve}
let waiting = null;    // resolve for "tap to continue"

export function formatText(s) {
  let t = escapeHtml(s)
    .replace(/\{name\}/g, escapeHtml(G.name))
    .replace(/\{shop\}/g, escapeHtml(G.shop))
    .replace(/\{day\}/g, String(G.day))
    .replace(/\{money\}/g, '$' + Math.round(G.money))
    .replace(/\{var\.(\w+)\}/g, (_, k) => escapeHtml(String(G.vars[k] ?? '')));
  t = t.replace(/\*([^*]+)\*/g, '<span class="em">$1</span>');
  return t;
}

function speakerName(who) {
  const c = CHARACTERS[who];
  if (!c) return '';
  return c.name.replace('{name}', G.name);
}

function ensure() {
  if (root) return;
  root = el('div', 'dlg');
  root.appendChild(el('div', 'shade'));
  portraits.left = el('img', 'portrait left hidden');
  portraits.right = el('img', 'portrait right hidden');
  root.appendChild(portraits.left);
  root.appendChild(portraits.right);
  box = el('div', 'box frame-speech');
  nameEl = el('div', 'name');
  textEl = el('div', 'text');
  nextEl = el('div', 'next');
  box.appendChild(nameEl); box.appendChild(textEl); box.appendChild(nextEl);
  root.appendChild(box);
  choicesEl = el('div', 'choices');
  root.appendChild(choicesEl);
  root.addEventListener('click', onTap);
  document.getElementById('ui').appendChild(root);
}

function onTap(e) {
  if (e.target.closest('.choices')) return;
  if (typing) { finishTyping(); return; }
  if (waiting) { const w = waiting; waiting = null; nextEl.classList.remove('show'); Sound.play('tick', { vol: 0.4 }); w(); }
}

function finishTyping() {
  if (!typing) return;
  const t = typing; typing = null;
  textEl.innerHTML = t.html;
  t.resolve();
}

function typewrite(html, who) {
  return new Promise(resolve => {
    const speed = Settings.textSpeed();   // chars / sec, Infinity = instant
    if (!isFinite(speed)) { textEl.innerHTML = html; resolve(); return; }
    // Walk the HTML, revealing visible characters progressively.
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const plain = tmp.textContent;
    const pitch = (CHARACTERS[who] && CHARACTERS[who].voice) || 1;
    typing = { html, resolve };
    let shown = 0, acc = 0, last = performance.now(), blipGap = 0;
    const step = now => {
      if (!typing || typing.html !== html) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      acc += dt * speed;
      const n = Math.floor(acc);
      if (n > 0) {
        acc -= n;
        const prev = shown;
        shown = Math.min(plain.length, shown + n);
        textEl.innerHTML = revealHtml(html, shown);
        blipGap -= (shown - prev);
        if (blipGap <= 0 && Settings.get('voices') && /[a-z0-9]/i.test(plain[shown - 1] || '')) {
          Sound.play('blip', { rate: pitch * (0.94 + Math.random() * 0.12), vol: 0.28, voice: true });
          blipGap = 3;
        }
      }
      if (shown >= plain.length) { typing = null; textEl.innerHTML = html; resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Return html with only the first n visible characters shown (tags preserved, rest hidden).
function revealHtml(html, n) {
  let out = '', count = 0, i = 0;
  while (i < html.length) {
    if (html[i] === '<') { const j = html.indexOf('>', i); out += html.slice(i, j + 1); i = j + 1; continue; }
    if (html[i] === '&') { const j = html.indexOf(';', i); if (count < n) out += html.slice(i, j + 1); else out += `<span style="opacity:0">${html.slice(i, j + 1)}</span>`; count++; i = j + 1; continue; }
    if (count < n) out += html[i]; else out += `<span style="opacity:0">${html[i]}</span>`;
    count++; i++;
  }
  return out;
}

function showPortrait(who, expr) {
  const c = CHARACTERS[who];
  const side = c && c.side === 'left' ? 'left' : 'right';
  const other = side === 'left' ? 'right' : 'left';
  const img = portraits[side];
  const src = portraitFor(who, expr);
  if (src) {
    const url = 'assets/sprites/' + src + '.webp';
    const wasHidden = img.classList.contains('hidden') || img.dataset.who !== who;
    if (!img.src.endsWith(url)) img.src = url;
    img.dataset.who = who;
    img.classList.remove('hidden', 'dim');
    if (!wasHidden) { img.classList.remove('bump'); void img.offsetWidth; img.classList.add('bump'); }
    else { img.style.animation = 'none'; void img.offsetWidth; img.style.animation = ''; }
  } else {
    img.classList.add('hidden');
    img.dataset.who = '';
  }
  portraits[other].classList.add('dim');
  return side;
}

export const Dialogue = {
  isOpen() { return !!root; },

  open() { ensure(); },

  close() {
    if (!root) return;
    const r = root;
    root = null; typing = null; waiting = null;
    r.style.transition = 'opacity .2s'; r.style.opacity = '0';
    setTimeout(() => r.remove(), 220);
  },

  async say(who, expr, text) {
    ensure();
    choicesEl.innerHTML = '';
    const html = formatText(text);
    if (who) {
      const side = showPortrait(who, expr);
      nameEl.innerHTML = `<span>${escapeHtml(speakerName(who))}</span>`;
      nameEl.classList.toggle('right', side === 'right');
      textEl.classList.remove('narration');
    } else {
      nameEl.innerHTML = '';
      textEl.classList.add('narration');
      portraits.left.classList.add('dim'); portraits.right.classList.add('dim');
    }
    nextEl.classList.remove('show');
    await typewrite(html, who);
    nextEl.classList.add('show');
    await new Promise(r => { waiting = r; });
  },

  choose(options) {
    ensure();
    nextEl.classList.remove('show');
    return new Promise(resolve => {
      choicesEl.innerHTML = '';
      options.forEach((o, i) => {
        const b = el('button', 'btn');
        b.innerHTML = `<span>${formatText(o)}</span>`;
        b.style.animationDelay = (i * 0.07) + 's';
        b.addEventListener('click', e => {
          e.stopPropagation();
          Sound.play('select', { vol: 0.7 });
          choicesEl.innerHTML = '';
          resolve(i);
        });
        choicesEl.appendChild(b);
      });
    });
  },

  // Clear portraits (e.g. between scenes).
  clearPortraits() {
    if (!root) return;
    portraits.left.classList.add('hidden'); portraits.right.classList.add('hidden');
    portraits.left.dataset.who = ''; portraits.right.dataset.who = '';
  },

  tap() { if (root) onTap({ target: root }); },
};
