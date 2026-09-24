// DOM UI toolkit: modals (with a back-button stack), toasts, fades, confirm dialogs, buttons.
import { el, sleep } from '../engine/util.js';
import { Sound } from '../engine/audio.js';

const root = () => document.getElementById('ui');
const stack = [];   // open modals, topmost last

export const UI = {
  root,

  button(label, onClick, cls = '', icon = null) {
    const b = el('button', 'btn ' + cls);
    if (icon) { const i = el('img', 'ico'); i.src = 'assets/sprites/' + icon + '.webp'; b.appendChild(i); }
    const s = el('span', '', label); b.appendChild(s);
    b.addEventListener('click', e => { e.stopPropagation(); if (b.disabled) return; Sound.play('click', { vol: 0.7 }); onClick && onClick(e); });
    return b;
  },

  iconButton(icon, onClick, title) {
    const b = el('button', 'icon-btn');
    const i = el('img'); i.src = 'assets/sprites/' + icon + '.webp'; i.alt = title || icon;
    b.appendChild(i);
    b.addEventListener('click', e => { e.stopPropagation(); Sound.play('click', { vol: 0.7 }); onClick && onClick(e); });
    return b;
  },

  // Opens a modal. content: element. opts: {close: bool, onClose, clear, noBackdropClose}
  modal(content, opts = {}) {
    const wrap = el('div', 'modal' + (opts.clear ? ' clear' : ''));
    wrap.appendChild(content);
    content.classList.add('pop');
    let closed = false;
    const api = {
      el: wrap,
      close: (silent) => {
        if (closed) return; closed = true;
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        wrap.style.transition = 'opacity .15s'; wrap.style.opacity = '0';
        setTimeout(() => wrap.remove(), 160);
        if (!silent) Sound.play('close', { vol: 0.5 });
        opts.onClose && opts.onClose();
      },
      canClose: opts.close !== false,
    };
    if (opts.close !== false) {
      const x = UI.iconButton('icon_gear', () => api.close());
      x.classList.add('close');
      x.innerHTML = '<span style="font-size:2rem;line-height:1;color:#3a2a1e">✕</span>';
      wrap.appendChild(x);
      if (!opts.noBackdropClose) wrap.addEventListener('click', e => { if (e.target === wrap) api.close(); });
    }
    root().appendChild(wrap);
    stack.push(api);
    Sound.play(opts.sound || 'open', { vol: 0.5 });
    return api;
  },

  closeAll() { while (stack.length) stack[stack.length - 1].close(true); },
  hasModal() { return stack.length > 0; },

  // Android back button: returns true if something was closed.
  back() {
    const top = stack[stack.length - 1];
    if (top && top.canClose) { top.close(); return true; }
    return !!top; // an uncloseable modal swallows back
  },

  toast(text, icon, cls = '', ms = 2600) {
    let box = root().querySelector('.toasts');
    if (!box) { box = el('div', 'toasts pass'); root().appendChild(box); }
    const t = el('div', 'toast ' + cls);
    if (icon) { const i = el('img'); i.src = 'assets/sprites/' + icon + '.webp'; t.appendChild(i); }
    t.appendChild(el('span', '', text));
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, ms);
  },

  confirm(title, text, yes = 'Yes', no = 'Not now') {
    return new Promise(resolve => {
      const box = el('div', 'notice frame-notice');
      const inner = el('div', 'inner');
      inner.appendChild(el('h2', '', title));
      if (text) inner.appendChild(el('p', '', text));
      const act = el('div', 'actions');
      let m;
      act.appendChild(UI.button(no, () => { m.close(true); resolve(false); }));
      act.appendChild(UI.button(yes, () => { m.close(true); resolve(true); }, 'primary'));
      inner.appendChild(act);
      box.appendChild(inner);
      m = UI.modal(box, { onClose: () => resolve(false), noBackdropClose: true });
    });
  },

  // A notice/letter panel. html: inner HTML. Returns promise resolved on close.
  notice(html, opts = {}) {
    return new Promise(resolve => {
      const box = el('div', 'notice frame-notice');
      const inner = el('div', 'inner');
      inner.innerHTML = html;
      const act = el('div', 'actions');
      let m;
      for (const b of opts.buttons || [{ label: opts.ok || 'OK', value: true, primary: true }]) {
        act.appendChild(UI.button(b.label, () => { m.close(true); resolve(b.value); }, b.primary ? 'primary' : ''));
      }
      inner.appendChild(act);
      box.appendChild(inner);
      m = UI.modal(box, { close: opts.close === true, onClose: () => resolve(opts.dismissValue), sound: opts.sound || 'page', noBackdropClose: true });
    });
  },

  fader() {
    let f = root().querySelector('.fader');
    if (!f) { f = el('div', 'fader'); root().appendChild(f); }
    return f;
  },
  async fadeOut(ms = 450) { const f = UI.fader(); f.style.transitionDuration = ms + 'ms'; f.classList.add('on'); await sleep(ms + 30); },
  async fadeIn(ms = 450) { const f = UI.fader(); f.style.transitionDuration = ms + 'ms'; f.classList.remove('on'); await sleep(ms); },

  async dayCard(l1, l2, l3, ms = 2200) {
    const c = el('div', 'daycard');
    c.innerHTML = `<div class="d1">${l1 || ''}</div><div class="d2">${l2 || ''}</div><div class="d3">${l3 || ''}</div>`;
    root().appendChild(c);
    await sleep(ms);
    c.classList.add('out');
    await sleep(800);
    c.remove();
  },

  moneyPop(amount, x, y) {
    const p = el('div', 'money-pop' + (amount < 0 ? ' neg' : ''), (amount < 0 ? '-$' : '+$') + Math.abs(Math.round(amount)));
    p.style.left = x + 'px'; p.style.top = y + 'px';
    root().appendChild(p);
    setTimeout(() => p.remove(), 1300);
  },
};
