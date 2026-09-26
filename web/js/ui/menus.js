// Menus and panels: journal, catalog, calendar, map, gifts, letters, settings, endings.
import { el, escapeHtml, money, clockStr, clamp } from '../engine/util.js';
import { Sound } from '../engine/audio.js';
import { G, heartsOf, stars, addMoney, giveItem, weekday, WEEKDAYS, FRIENDS, dateLabel, STORY_DAYS } from '../game/state.js';
import { Save } from '../game/save.js';
import { Settings } from '../game/settings.js';
import * as L from '../game/laundry.js';
import { UI } from './ui.js';
import { CHARACTERS, NEIGHBOUR_IDS, portraitFor } from '../data/characters.js';
import { DECOR, UPGRADES, SUPPLIES, SHOP_SLOTS, HOME_SLOTS, comfortOf } from '../data/decor.js';
import { ITEMS, RECORDS, SOCKS } from '../data/items.js';
import { SERVICES } from '../data/regulars.js';
import { LOCATIONS, MAP_ORDER } from '../data/locations.js';
import { LETTERS } from '../data/letters.js';
import { CALENDAR_MARKS } from '../data/events.js';
import { ENDINGS, CREDITS } from '../data/endings.js';
import { ROMANCE } from '../data/romance.js';
import { QUESTS } from '../data/quests.js';
import { Dialogue, formatText } from './dialogue.js';

const S = n => 'assets/sprites/' + n + '.webp';

export class Menus {
  constructor(app) { this.app = app; }

  // ------------------------------------------------------------------ context menu
  contextMenu(pos, title, options) {
    const old = document.querySelector('.ctx'); if (old) old.remove();
    const m = el('div', 'ctx');
    m.style.left = clamp(pos.x, 90, window.innerWidth - 90) + 'px';
    m.style.top = clamp(pos.y, 110, window.innerHeight - 20) + 'px';
    if (title) m.appendChild(el('div', 'title', escapeHtml(title)));
    for (const o of options) m.appendChild(UI.button(o.label, () => { m.remove(); o.run(); }, 'small', o.icon));
    document.getElementById('ui').appendChild(m);
    const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
    setTimeout(() => document.addEventListener('pointerdown', off, true), 30);
    Sound.play('pop', { vol: 0.5 });
  }

  // ------------------------------------------------------------------ notes & orders
  async readNote(o) {
    Sound.play('page', { vol: 0.6 });
    await UI.notice(`<h2>A note from ${escapeHtml(o.name)}</h2><div class="letter" style="text-align:center">${formatText(o.note)}</div>`, { ok: 'Got it' });
  }

  orderInfo(o) {
    const svc = SERVICES[o.service];
    const step = L.nextStep(o);
    const where = o.stage === 'counter' ? (o.washed ? 'Set down on the counter' : 'Waiting on the counter') : o.stage === 'ready' ? 'Folded and on the pickup shelf' :
      o.stage === 'washing' ? 'In a washer' : o.stage === 'drying' ? 'In a dryer' : o.stage === 'washed' ? 'Washed — needs a dryer' : o.stage === 'dried' ? 'Dry — needs unloading' : 'In your arms';
    const next = { wash: 'Put it in a free washer.', dry: 'Move it to a free dryer.', fold: 'Fold it at the folding table.', shelf: 'Put it on the pickup shelf.' }[step];
    let html = `<h2>${escapeHtml(o.name)}</h2><div class="summary-row"><span>Service</span><span>${svc.label}</span></div>` +
      `<div class="summary-row"><span>Pays</span><span>${money(o.price)} + tip</span></div>` +
      `<div class="summary-row"><span>Pickup</span><span class="${o.late ? 'neg' : ''}">${o.late ? 'Late!' : clockStr(o.due)}</span></div>` +
      `<div class="summary-row"><span>Status</span><span>${where}</span></div>`;
    if (o.stage !== 'ready') html += `<p style="text-align:center"><b>Next:</b> ${next}</p>`;
    if (o.softener) html += `<p style="text-align:center">Asked for lavender softener${(G.inv.softener || 0) > 0 ? '' : ' — you\'re out!'}</p>`;
    if (o.gentle) html += `<p style="text-align:center">Delicates — the gentle machines (Blue Heron, Heron Pro, Titan XL) treat them best.</p>`;
    if (o.note) html += `<div class="letter" style="text-align:center;margin-top:.6rem">“${formatText(o.note)}”</div>`;
    UI.notice(html, { ok: 'OK' });
  }

  // ------------------------------------------------------------------ letters
  async showLetter(id) {
    const L0 = LETTERS[id];
    if (!L0) return;
    Sound.play('page', { vol: 0.7 });
    const html = typeof L0.html === 'function' ? L0.html(G) : L0.html;
    const res = await UI.notice(html, { buttons: L0.buttons || [{ label: 'Fold it away', value: true, primary: true }] });
    if (L0.onChoose) await L0.onChoose(res, this.app);
    return res;
  }

  // ------------------------------------------------------------------ journal
  openJournal(tab) {
    const book = el('div', 'notebook');
    const left = el('div', 'page l'), right = el('div', 'page r');
    const tabs = el('div', 'tabs');
    book.appendChild(left); book.appendChild(right); book.appendChild(tabs);
    const pages = {
      diary: ['Diary', () => this.pageDiary(left, right)],
      friends: ['Friends', () => this.pageFriends(left, right)],
      neighbours: ['Neighbours', () => this.pageNeighbours(left, right)],
      errands: ['Errands', () => this.pageErrands(left, right)],
      shop: ['The shop', () => this.pageShop(left, right)],
      collect: ['Collections', () => this.pageCollections(left, right)],
      ledger: ['Ledger', () => this.pageLedger(left, right)],
    };
    const show = k => {
      [...tabs.children].forEach(t => t.classList.toggle('on', t.dataset.k === k));
      left.innerHTML = ''; right.innerHTML = ''; left.scrollTop = 0; right.scrollTop = 0;
      pages[k][1]();
      Sound.play('page', { vol: 0.5 });
    };
    for (const [k, [label]] of Object.entries(pages)) {
      const t = el('button', 'tab', label); t.dataset.k = k;
      t.addEventListener('click', e => { e.stopPropagation(); show(k); });
      tabs.appendChild(t);
    }
    UI.modal(book, { sound: 'book_open' });
    show(tab && pages[tab] ? tab : 'diary');
  }

  pageDiary(l, r) {
    l.innerHTML = `<h2>${escapeHtml(G.name)}'s diary</h2>` +
      (G.goal ? `<h3>Right now</h3><p>${escapeHtml(G.goal)}</p>` : '') +
      `<h3>This month</h3><ul class="goal-list">${this.storyGoals().map(g => `<li class="${g.done ? 'done' : ''}">${g.text}</li>`).join('')}</ul>`;
    const entries = G.diary.slice().reverse();
    r.innerHTML = `<div class="diary">${entries.length ? entries.map(e => `<div class="date">${dateLabel(e.day)}</div><div>${escapeHtml(e.text)}</div>`).join('') : '<div class="date">—</div><div>Nothing written yet. Tonight, maybe.</div>'}</div>`;
  }

  storyGoals() {
    const f = G.flags;
    const list = [
      { text: 'Open Rosa\'s for the first time', done: G.day > 1 || f.ev_d1_open },
      { text: 'Fix washer #3', done: !G.machines.find(m => m.id === 'W3' && m.broken) },
      { text: 'Pay the first week\'s bills', done: G.billsPaid.length >= 1 && !f.in_debt },
      { text: 'Get to know the neighbours (3 friends at 2♥)', done: FRIENDS.filter(w => heartsOf(w) >= 2).length >= 3 },
    ];
    if (G.day >= 8) list.push({ text: 'Decide what to do about Crestline\'s offer', done: !!G.ending });
    if (f.petition_started) list.push({ text: `Petition: ${G.petition} / 150 signatures`, done: G.petition >= 150 });
    if (f.hearing_announced) list.push({ text: 'Ask friends to speak at the council hearing (Fri, Sept 26)', done: !!f.hearing_done });
    if (G.day >= 22) list.push({ text: `Community spirit ${Math.round(G.community)} / 70`, done: G.community >= 70 });
    return list;
  }

  pageFriends(l, r) {
    const card = w => {
      const c = CHARACTERS[w];
      const h = heartsOf(w);
      const met = G.flags['met_' + w];
      return `<div class="friend"><img class="face" src="${S('face_' + c.portrait + '_' + (h >= 6 ? c.exprs[1] : c.defaultExpr))}" style="${met ? '' : 'filter:brightness(0) opacity(.35)'}">` +
        `<div><div class="nm">${met ? c.full : '???'}</div><div class="ds">${met ? c.blurb : 'Not met yet.'}</div>` +
        `<div class="hearts">${Array.from({ length: 10 }, (_, i) => `<i class="${i < h ? 'on' : ''}"></i>`).join('')}</div>` +
        (met ? `<div class="ds">Loves: ${this.lovesHint(w)}</div>` : '') + this.romanceLine(w) + `</div></div>`;
    };
    l.innerHTML = `<h2>Friends</h2>${card('walt')}${card('maya')}`;
    r.innerHTML = `<h2>&nbsp;</h2>${card('june')}${card('remy')}<p class="ds" style="margin-top:.6rem">Talk every day, bring gifts, and finish their laundry on time. New ♥ unlock new moments.</p>`;
  }

  pageNeighbours(l, r) {
    const card = w => {
      const c = CHARACTERS[w];
      const met = G.flags['met_' + w];
      const h = heartsOf(w);
      const face = met && portraitFor(w, h >= 3 ? 'smile' : null);
      const img = face ? `<img class="face" src="${S(face)}">` : `<img class="face icon" src="${S(c.icon)}" style="${met ? '' : 'opacity:.45'}">`;
      return `<div class="friend">${img}<div><div class="nm">${c.full}</div>` +
        `<div class="ds">${met ? c.blurb : 'You know the name from the laundry tickets. You haven\'t really talked yet.'}</div>` +
        `<div class="hearts">${Array.from({ length: 5 }, (_, i) => `<i class="${i < h ? 'on' : ''}"></i>`).join('')}</div>${this.romanceLine(w)}</div></div>`;
    };
    const [a, b, c, d] = NEIGHBOUR_IDS;
    l.innerHTML = `<h2>Neighbours</h2>${card(a)}${card(b)}`;
    r.innerHTML = `<h2>&nbsp;</h2>${card(c)}${card(d)}<p class="ds" style="margin-top:.6rem">Regulars stop to talk when they bring laundry in. Finish it on time. The ones who like you will stand up for the shop.</p>`;
  }

  romanceLine(w) {
    const st = this.app.quests && this.app.quests.status(w);
    return st ? `<div class="rom">♥ ${st}</div>` : '';
  }

  pageErrands(l, r) {
    const Q = this.app.quests;
    const face = id => { const q = QUESTS[id]; return q.giver === 'biscuit' ? q.icon : (portraitFor(q.giver) || q.icon); };
    const active = Object.entries(G.quests || {}).filter(([id, s]) => QUESTS[id] && s.state === 'active');
    const done = Object.entries(G.quests || {}).filter(([id, s]) => QUESTS[id] && s.state === 'done');
    const card = id => {
      const q = QUESTS[id];
      const n = Q.stepsDone(id);
      const who = q.giver === 'biscuit' ? 'Biscuit' : CHARACTERS[q.giver].name;
      const steps = q.steps.map((st, i) => `<li class="${i < n ? 'done' : ''}">${escapeHtml(st.text)}${i >= n ? Q.progress(id, st) : ''}</li>`).join('');
      const ready = n >= q.steps.length ? `<div class="rom">Done! ${q.giver === 'biscuit' ? 'Go and see Biscuit.' : 'Tell ' + who + '.'}</div>` : '';
      return `<div class="friend errand"><img class="face${q.giver === 'biscuit' ? ' icon' : ''}" src="${S(face(id))}"><div><div class="nm">${escapeHtml(q.title)}</div>` +
        `<div class="ds">${escapeHtml(q.blurb)}</div><ul class="goal-list">${steps}</ul>${ready}<div class="ds">Reward: ${escapeHtml(q.reward.text)}</div></div></div>`;
    };
    l.innerHTML = `<h2>Errands</h2>` + (active.length ? active.map(([id]) => card(id)).join('')
      : '<p class="ds">Nothing on your list. Friends and neighbours sometimes ask for a hand when you talk to them — once they know you a little.</p>');
    const left = Object.keys(QUESTS).length - active.length - done.length;
    r.innerHTML = `<h2>Done</h2>` + (done.length ? `<ul class="goal-list plain">${done.map(([id]) => `<li class="done">${escapeHtml(QUESTS[id].title)} <span class="ds">— ${escapeHtml(QUESTS[id].reward.text)}</span></li>`).join('')}</ul>` : '<p class="ds">None yet.</p>') +
      (left > 0 ? `<p class="ds" style="margin-top:.6rem">${left} more errand${left > 1 ? 's' : ''} to find around Linden Street.</p>` : '<p class="ds" style="margin-top:.6rem">You\'ve found every errand on Linden Street. Rosa would be proud. And tired.</p>');
  }

  lovesHint(w) {
    const known = G.vars['knownLoves_' + w] || [];
    const c = CHARACTERS[w];
    return c.loves.map(t => known.includes(t) ? (ITEMS[t] ? ITEMS[t].name : t) : '?').join(', ');
  }

  pageShop(l, r) {
    const comfort = comfortOf(G.placed);
    const meter = (label, v, max = 100) => `<div class="stat-line"><span>${label}</span><span>${Math.round(v)}${max === 100 ? '' : ' / ' + max}</span></div><div class="meter"><div style="width:${clamp(v / max * 100, 0, 100)}%"></div></div>`;
    l.innerHTML = `<h2>${escapeHtml(G.shop)}</h2>` +
      `<div class="stat-line"><span>Reputation</span><span>${'★'.repeat(Math.round(stars()))}${'☆'.repeat(5 - Math.round(stars()))}</span></div>` +
      meter('Cleanliness', G.cleanliness) + meter('Comfort', comfort, 80) + meter('Community spirit', G.community) +
      (G.flags.petition_started ? meter('Petition signatures', G.petition, 150) : '') +
      `<div class="stat-line"><span>Detergent</span><span>${Math.floor(G.inv.detergent || 0)} loads</span></div>` +
      `<div class="stat-line"><span>Softener</span><span>${G.inv.softener || 0} loads</span></div>` +
      `<div class="stat-line"><span>Spare parts</span><span>${G.inv.parts || 0}</span></div>`;
    const ms = G.machines.map(m => `<div class="stat-line"><span>${m.kind === 'washer' ? 'Washer' : 'Dryer'} ${m.id} · ${L.modelOf(m).name}</span><span class="${m.broken ? 'neg' : ''}">${m.broken ? 'broken' : Math.round(m.cond) + '%'}</span></div>`).join('');
    r.innerHTML = `<h2>Machines</h2>${ms}<h3>All-time</h3>` +
      `<div class="stat-line"><span>Orders done</span><span>${G.stats.orders}</span></div>` +
      `<div class="stat-line"><span>Perfect folds</span><span>${G.stats.perfectFolds || 0}</span></div>` +
      `<div class="stat-line"><span>Machine cycles</span><span>${G.stats.cycles}</span></div>` +
      `<div class="stat-line"><span>Repairs</span><span>${G.stats.repairs}</span></div>` +
      `<div class="stat-line"><span>Earned</span><span>${money(G.stats.earned)}</span></div>`;
  }

  pageCollections(l, r) {
    const socks = SOCKS.map(s => { const got = G.collections.socks.includes(s.id); return `<div class="gitem ${got ? '' : 'locked'}"><img src="${S('item_sock')}">${got ? s.name : '???'}</div>`; }).join('');
    l.innerHTML = `<h2>Lost socks</h2><p class="ds">${G.collections.socks.length} / ${SOCKS.length} — returned to the lost-and-found basket.</p><div class="grid-items">${socks}</div>`;
    const recs = Object.entries(RECORDS).map(([k, rec]) => { const got = G.collections.records.includes(k); return `<div class="gitem ${got ? '' : 'locked'}"><img src="${S('item_vinyl')}">${got ? rec.name : '???'}</div>`; }).join('');
    const photos = G.collections.photos.slice(-12).map(p => `<li>📷 ${escapeHtml(p.title)}</li>`).join('') || '<li>No photos yet.</li>';
    const sketches = G.collections.sketches.slice(-8).map(p => `<li>✎ ${escapeHtml(p.title)}</li>`).join('') || '<li>No sketches yet.</li>';
    r.innerHTML = `<h2>Records</h2><div class="grid-items">${recs}</div><h3>Photos (${G.collections.photos.length})</h3><ul>${photos}</ul><h3>Sketches (${G.collections.sketches.length})</h3><ul>${sketches}</ul>`;
  }

  pageLedger(l, r) {
    l.innerHTML = `<h2>Ledger</h2><div class="stat-line"><span>Cash</span><span><b>${money(G.money)}</b></span></div>` +
      `<div class="stat-line"><span>Next bills</span><span>Sunday night</span></div>` +
      `<div class="stat-line"><span>Estimated</span><span>${money(this.app.day.billsFor(G.day).reduce((a, b) => a + b[1], 0))}</span></div>` +
      `<h3>This week's bills</h3>${this.app.day.billsFor(G.day).map(([k, v]) => `<div class="summary-row"><span>${k}</span><span>${money(v)}</span></div>`).join('')}`;
    const rows = G.ledger.slice(-40).reverse().map(e => `<div class="summary-row"><span>${escapeHtml(e.label)}</span><span class="${e.amount < 0 ? 'neg' : 'pos'}">${e.amount < 0 ? '-' : '+'}${money(Math.abs(e.amount)).replace('-', '')}</span></div>`).join('');
    r.innerHTML = `<h2>Recent</h2>${rows || '<p>Nothing yet.</p>'}`;
  }

  // ------------------------------------------------------------------ catalog / shop
  openCatalog(tab) {
    const book = el('div', 'notebook');
    const left = el('div', 'page l'), right = el('div', 'page r');
    const tabs = el('div', 'tabs');
    book.appendChild(left); book.appendChild(right); book.appendChild(tabs);
    const market = tab === 'market';
    const pages = market ? { market: ['Flea market', () => this.pageMarket(left, right, refresh)] } : {
      supplies: ['Supplies', () => this.pageSupplies(left, right, refresh)],
      machines: ['Machines', () => this.pageMachines(left, right, refresh)],
      upgrades: ['Upgrades', () => this.pageUpgrades(left, right, refresh)],
      decor: ['Decor', () => this.pageDecor(left, right, refresh)],
      prices: ['Prices', () => this.pagePrices(left, right, refresh)],
    };
    let cur = tab && pages[tab] ? tab : Object.keys(pages)[0];
    function refresh() { left.innerHTML = ''; right.innerHTML = ''; pages[cur][1](); }
    const show = k => { cur = k; [...tabs.children].forEach(t => t.classList.toggle('on', t.dataset.k === k)); refresh(); Sound.play('page', { vol: 0.5 }); };
    for (const [k, [label]] of Object.entries(pages)) {
      const t = el('button', 'tab', label); t.dataset.k = k;
      t.addEventListener('click', e => { e.stopPropagation(); show(k); });
      tabs.appendChild(t);
    }
    this.catalogModal = UI.modal(book, { sound: 'book_open', onClose: () => { this.app.hud.refresh(); } });
    show(cur);
  }

  row(img, name, desc, btnLabel, onBuy, disabled) {
    const r = el('div', 'shop-row');
    r.innerHTML = `<img src="${S(img)}"><div class="info"><div class="nm">${name}</div><div class="ds">${desc}</div></div>`;
    if (btnLabel) { const b = UI.button(btnLabel, onBuy, 'small'); if (disabled) b.disabled = true, b.classList.add('disabled'); r.appendChild(b); }
    return r;
  }

  spend(price, label) {
    if (G.money < price) { UI.toast('Not enough money.', 'icon_coin', 'bad'); Sound.play('error', { vol: 0.5 }); return false; }
    addMoney(-price, label);
    Sound.play('register', { vol: 0.6 });
    this.app.hud.refresh();
    return true;
  }

  buySupply(id) {
    const s = SUPPLIES[id];
    if (!this.spend(s.price, 'Supplies: ' + s.name)) return false;
    const item = s.item || id;
    G.inv[item] = (G.inv[item] || 0) + s.qty;
    UI.toast(`+${s.qty} ${s.unit} of ${s.name.toLowerCase()}`, s.sprite);
    return true;
  }

  pageSupplies(l, r, refresh) {
    l.appendChild(el('h2', '', 'Supplies'));
    l.appendChild(el('p', 'ds', `Stock — detergent ${Math.floor(G.inv.detergent || 0)} · softener ${G.inv.softener || 0} · parts ${G.inv.parts || 0} · tea ${G.inv.tea || 0}`));
    for (const [id, s] of Object.entries(SUPPLIES)) {
      (Object.keys(SUPPLIES).indexOf(id) < 3 ? l : r).appendChild(this.row(s.sprite, `${s.name} · ${money(s.price)}`, s.blurb, 'Buy', () => { this.buySupply(id); refresh(); }));
    }
    r.insertBefore(el('h2', '', '&nbsp;'), r.firstChild);
  }

  // The upgrade tree: pick washers or dryers on the left, a model in the tree, and install it in
  // an empty bay or upgrade a machine that it grows out of on the right.
  pageMachines(l, r, refresh) {
    const kind = this.machineKind || 'washer';
    const keys = Object.keys(L.MODELS).filter(k => L.MODELS[k].kind === kind);
    const sel = keys.includes(this.machineSel) ? this.machineSel : keys[0];
    const units = () => kind === 'washer' ? L.washers() : L.dryers().filter(d => d.slot % 2 === 0);
    const tog = el('div', 'kind-toggle');
    for (const [k, label] of [['washer', 'Washers'], ['dryer', 'Dryers']]) {
      const b = el('button', 'kt' + (k === kind ? ' on' : ''), label);
      b.addEventListener('click', e => { e.stopPropagation(); this.machineKind = k; this.machineSel = null; Sound.play('page', { vol: 0.4 }); refresh(); });
      tog.appendChild(b);
    }
    l.appendChild(tog);
    const tree = el('div', 'mtree');
    const tiers = [...new Set(keys.map(k => L.MODELS[k].tier))].sort((a, b) => a - b);
    for (const t of tiers) {
      const row = el('div', 'mrow');
      for (const k of keys.filter(k => L.MODELS[k].tier === t)) {
        const M = L.MODELS[k];
        const n = units().filter(m => m.model === k).length, open = L.unlocked(k);
        const node = el('button', 'mnode' + (k === sel ? ' sel' : '') + (open ? '' : ' locked') + (n ? ' have' : ''));
        node.dataset.k = k;
        node.innerHTML = `<img src="${S(M.sprite)}" alt=""><span class="nm">${M.name}</span><span class="st">${n ? '×' + n + ' in the shop' : open ? money(M.price) : 'locked'}</span>`;
        node.addEventListener('click', e => { e.stopPropagation(); this.machineSel = k; Sound.play('click', { vol: 0.5 }); refresh(); });
        row.appendChild(node);
      }
      tree.appendChild(row);
    }
    l.appendChild(tree);
    requestAnimationFrame(() => this.treeLines(tree, keys));

    // details of the selected model
    const M = L.MODELS[sel];
    const open = L.unlocked(sel);
    r.appendChild(el('h2', '', M.name));
    const d = el('div', 'mdetail');
    d.innerHTML = `<img class="big${open ? '' : ' locked'}" src="${S(M.sprite)}" alt=""><p class="ds">${M.blurb}</p>`;
    const rate = (v, lo, hi) => v <= lo ? 'low' : v >= hi ? 'high' : 'medium';
    const stats = [['Cycle', M.cycle + ' min'], kind === 'washer' ? ['Detergent', M.soap + (M.soap === 1 ? ' load' : ' of a load') + ' per wash'] : ['Lint', rate(M.lint, 0.6, 1.3)], ['Wear', rate(M.wear, 2, 4)]];
    const perks = [M.gentle && 'Gentle with delicates', M.care && 'Everything comes out a little nicer', M.selfPay && 'Walk-ins pay more to use it'].filter(Boolean);
    d.innerHTML += `<div class="mstats">${stats.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('')}</div>` + (perks.length ? `<ul class="mperks">${perks.map(p => `<li>${p}</li>`).join('')}</ul>` : '');
    r.appendChild(d);
    const act = el('div', 'mact');
    if (!open) {
      act.appendChild(el('p', 'ds', `Grows out of the ${M.from.map(k => L.MODELS[k].name).join(' or the ')}. Put one in the shop to unlock it.`));
    } else {
      const bays = kind === 'washer' ? L.WASHER_SLOTS : L.DRYER_UNITS;
      const taken = new Set(units().map(m => kind === 'washer' ? m.slot : Math.floor(m.slot / 2)));
      const free = [...Array(bays).keys()].find(i => !taken.has(i));
      if (free !== undefined) {
        act.appendChild(UI.button(`${kind === 'washer' ? 'Install in bay ' + (free + 1) : 'Install a new tower'} · ${money(M.price)}`, () => {
          if (!this.spend(M.price, `New ${kind}: ${M.name}`)) return;
          L.installModel(kind, free, sel);
          UI.toast(`${M.name} installed!`, kind === 'washer' ? 'icon_washer' : 'icon_dryer'); Sound.play('sparkle', { vol: 0.6 });
          refresh();
        }, 'small primary'));
      }
      for (const m of units().filter(m => (M.from || []).includes(m.model))) {
        const cost = L.upgradeCost(m.model, sel);
        const label = kind === 'washer' ? `washer ${m.slot + 1}` : `dryer tower ${Math.floor(m.slot / 2) + 1}`;
        const busy = L.unitBusy(m);
        act.appendChild(UI.button(busy ? `Upgrade ${label} (busy)` : `Upgrade ${label} · ${money(cost)}`, () => {
          if (L.unitBusy(m)) { UI.toast('That machine is busy right now.', 'icon_washer', 'bad'); return; }
          if (!this.spend(cost, `Upgrade: ${M.name}`)) return;
          const old = L.modelOf(m).name;
          L.upgradeUnit(m, sel);
          UI.toast(`${old} → ${M.name}`, kind === 'washer' ? 'icon_washer' : 'icon_dryer'); Sound.play('sparkle', { vol: 0.6 });
          refresh();
        }, 'small' + (busy ? ' disabled' : '')));
      }
      if (free === undefined && !act.children.length) act.appendChild(el('p', 'ds', (M.from ? 'Upgrade a machine it grows out of to get one.' : 'Every bay is full.') + ' Trade-ins are worth 40% of the old machine.'));
    }
    r.appendChild(act);
    // what's in the shop now
    r.appendChild(el('h3', '', kind === 'washer' ? 'Your washers' : 'Your dryer towers'));
    const bays = kind === 'washer' ? L.WASHER_SLOTS : L.DRYER_UNITS;
    for (let i = 0; i < bays; i++) {
      const m = units().find(q => (kind === 'washer' ? q.slot : Math.floor(q.slot / 2)) === i);
      r.appendChild(el('div', 'summary-row', m ? `<span>${i + 1}. ${L.modelOf(m).name}</span><span class="${m.broken ? 'neg' : ''}">${m.broken ? 'broken' : Math.round(m.cond) + '%'}</span>` : `<span>${i + 1}. empty</span><span></span>`));
    }
  }

  // Lines from each model to the ones that grow out of it.
  treeLines(tree, keys) {
    if (!tree.isConnected) return;
    const box = tree.getBoundingClientRect();
    const node = k => tree.querySelector(`.mnode[data-k="${k}"]`);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    for (const k of keys) {
      for (const p of L.MODELS[k].from || []) {
        const a = node(p), b = node(k);
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const x1 = ra.left + ra.width / 2 - box.left, y1 = ra.bottom - box.top, x2 = rb.left + rb.width / 2 - box.left, y2 = rb.top - box.top;
        const path = document.createElementNS(ns, 'path');
        const my = (y1 + y2) / 2;
        path.setAttribute('d', `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`);
        path.setAttribute('class', L.unlocked(k) ? 'open' : '');
        svg.appendChild(path);
      }
    }
    tree.insertBefore(svg, tree.firstChild);
  }

  pageUpgrades(l, r, refresh) {
    const list = Object.entries(UPGRADES).filter(([, u]) => !u.from || G.day >= u.from);
    const owned = list.filter(([id]) => G.upgrades.includes(id)).length;
    l.appendChild(el('h2', '', 'Upgrades'));
    l.appendChild(el('p', 'ds', `${owned} of ${list.length} installed. Each one pays for itself, eventually.`));
    r.appendChild(el('h2', '', '&nbsp;'));
    list.forEach(([id, u], i) => {
      const have = G.upgrades.includes(id);
      (i < Math.ceil(list.length / 2) ? l : r).appendChild(this.row(u.sprite, `${u.name} · ${money(u.price)}`, u.blurb, have ? 'Owned' : 'Buy', async () => {
        if (!this.spend(u.price, 'Upgrade: ' + u.name)) return;
        G.upgrades.push(id);
        UI.toast(`${u.name}!`, u.sprite); Sound.play('sparkle', { vol: 0.6 });
        if (id === 'sign') await this.renameShop();
        refresh();
      }, have));
    });
  }

  async renameShop() {
    const box = el('div', 'notice frame-notice');
    const inner = el('div', 'inner name-entry');
    inner.innerHTML = '<h2>Name the shop</h2><p style="text-align:center">The new sign goes up out front.</p>';
    const inp = el('input'); inp.maxLength = 16; inp.value = G.shop;
    const wrap = el('div'); wrap.style.textAlign = 'center'; wrap.appendChild(inp); inner.appendChild(wrap);
    return new Promise(res => {
      const act = el('div', 'actions');
      let m;
      act.appendChild(UI.button('Keep "' + G.shop + '"', () => { res(); m.close(true); }));
      act.appendChild(UI.button('Hang it up', () => { const v = inp.value.trim(); if (v) G.shop = v; m.close(true); UI.toast(`"${G.shop}" — looks good.`, 'decor_hanging_sign'); res(); }, 'primary'));
      inner.appendChild(act); box.appendChild(inner);
      m = UI.modal(box, { close: false });
    });
  }

  pageDecor(l, r, refresh) {
    l.appendChild(el('h2', '', 'Decor'));
    l.appendChild(el('p', 'ds', `Comfort ${comfortOf(G.placed)} · cosy shops keep customers happy and walk-ins coming.`));
    const ids = Object.keys(DECOR);
    ids.forEach((id, i) => {
      const d = DECOR[id];
      const owned = G.decor.includes(id);
      (i < ids.length / 2 ? l : r).appendChild(this.row(d.sprite, `${d.name} · ${owned ? 'owned' : money(d.price)}`, `${d.blurb} (+${d.comfort} comfort)`, owned ? 'Place' : 'Buy', async () => {
        if (!owned) { if (!this.spend(d.price, 'Decor: ' + d.name)) return; G.decor.push(id); }
        await this.placeDecor(id);
        refresh();
      }));
    });
    r.insertBefore(el('h2', '', '&nbsp;'), r.firstChild);
  }

  async placeDecor(id) {
    const d = DECOR[id];
    const slots = d.slots.map(s => ({ s, info: SHOP_SLOTS[s] || HOME_SLOTS[s], home: s.startsWith('h_') }));
    const buttons = slots.map(({ s, info, home }) => {
      const cur = G.placed[s];
      return { label: `${home ? 'Home' : 'Shop'} · ${info.label}${cur ? (cur === id ? ' ✓' : ' (swap)') : ''}`, value: s };
    });
    buttons.push({ label: 'Keep in storage', value: null });
    const where = await UI.notice(`<h2>Place: ${d.name}</h2><p style="text-align:center">Where should it go?</p>`, { buttons, dismissValue: null });
    if (!where) return;
    for (const [s, v] of Object.entries(G.placed)) if (v === id) delete G.placed[s];
    G.placed[where] = id;
    Sound.play('drop', { vol: 0.6 });
    UI.toast(`${d.name} placed.`, d.sprite);
    const sc = this.app.scene; if (sc && sc.buildEntities) sc.buildEntities();
    if (sc && sc.updateSound) sc.updateSound();
  }

  pagePrices(l, r, refresh) {
    l.appendChild(el('h2', '', 'Prices'));
    l.appendChild(el('p', '', 'Wash & fold pricing. Cheaper keeps the neighbourhood coming; pricier pays the bills but costs goodwill.'));
    const seg = el('div', 'seg');
    for (const [k, label] of [['low', 'Friendly'], ['normal', 'Rosa\'s'], ['high', 'Market rate']]) {
      const b = el('button', G.policies.prices === k ? 'on' : '', label);
      b.addEventListener('click', e => { e.stopPropagation(); const prev = G.policies.prices; G.policies.prices = k; if (prev !== k) this.app.story.trigger('prices', { from: prev, to: k }); Sound.play('toggle', { vol: 0.6 }); refresh(); });
      seg.appendChild(b);
    }
    l.appendChild(seg);
    const mul = G.policies.prices === 'low' ? 0.85 : G.policies.prices === 'high' ? 1.2 : 1;
    l.appendChild(el('p', 'ds', Object.values(SERVICES).map(s => `${s.label}: ${money(s.price * mul)}`).join(' · ')));
    r.appendChild(el('h2', '', 'House rules'));
    const toggle = (key, label, desc) => {
      const row = el('div', 'setting');
      row.innerHTML = `<div><div>${label}</div><div class="ds">${desc}</div></div>`;
      const b = el('div', 'seg'); const on = el('button', G.policies[key] ? 'on' : '', G.policies[key] ? 'On' : 'Off');
      on.addEventListener('click', e => { e.stopPropagation(); G.policies[key] = !G.policies[key]; this.app.story.trigger('policy', { key, on: G.policies[key] }); Sound.play('toggle', { vol: 0.6 }); refresh(); });
      b.appendChild(on); row.appendChild(b); r.appendChild(row);
    };
    toggle('freeTea', 'Free tea for customers', 'Needs a kettle in the shop. Uses your tea. People linger kindly.');
    if (G.flags.pwyc_idea) toggle('pwyc', 'Pay-what-you-can Sundays', 'Open Sundays for neighbours who are struggling.');
  }

  pageMarket(l, r, refresh) {
    l.appendChild(el('h2', '', 'Flea market'));
    l.appendChild(el('p', 'ds', 'Saturdays and Sundays in Linden Park. Everything slightly used, everything slightly magic.'));
    const recs = Object.entries(RECORDS).filter(([k]) => !G.collections.records.includes(k)).slice(0, 4);
    for (const [k, rec] of recs) l.appendChild(this.row('item_vinyl', `${rec.name} · ${money(12)}`, rec.blurb, 'Buy', () => {
      if (!this.spend(12, 'Record: ' + rec.name)) return; G.collections.records.push(k); UI.toast(`"${rec.name}" added to your records.`, 'item_vinyl'); refresh();
    }));
    if (!recs.length) l.appendChild(el('p', '', 'You own every record in the crates!'));
    r.appendChild(el('h2', '', '&nbsp;'));
    const deals = [['lantern', 18], ['cat_planter', 16], ['flower_vase', 12], ['pothos', 10]];
    for (const [id, price] of deals) {
      const d = DECOR[id]; const owned = G.decor.includes(id);
      r.appendChild(this.row(d.sprite, `${d.name} · ${owned ? 'owned' : money(price)}`, d.blurb, owned ? 'Owned' : 'Buy', async () => {
        if (!this.spend(price, 'Flea market: ' + d.name)) return; G.decor.push(id); await this.placeDecor(id); refresh();
      }, owned));
    }
    r.appendChild(this.row('item_vinyl', `A spare record (gift) · ${money(10)}`, 'Wrapped in brown paper. Someone will love it.', 'Buy', () => { if (!this.spend(10, 'Record (gift)')) return; giveItem('record', 1); UI.toast('A record to give away.', 'item_vinyl'); }));
    r.appendChild(this.row('item_yarn_basket', `Yarn bundle · ${money(8)}`, 'Makes knitting faster (one extra row).', 'Buy', () => { if (!this.spend(8, 'Yarn')) return; G.vars.knitProgress = (G.vars.knitProgress || 0) + 1; UI.toast('Soft, teal, and very inviting.', 'item_yarn_basket'); }));
  }

  // ------------------------------------------------------------------ gifts
  pickGift(who) {
    return new Promise(resolve => {
      const items = Object.entries(G.inv).filter(([k, n]) => n > 0 && ITEMS[k] && ITEMS[k].gift);
      if (!items.length) { UI.toast('You have nothing to give. Make, buy, or find something first.', 'icon_heart'); resolve(null); return; }
      let page = 0;
      const box = el('div', 'slots');
      const title = el('div', 'title', `A gift for ${CHARACTERS[who].name}`);
      const cells = el('div', 'cellz');
      const pager = el('div', 'pager');
      box.appendChild(title); box.appendChild(cells); box.appendChild(pager);
      let m;
      const render = () => {
        cells.innerHTML = '';
        const slice = items.slice(page * 6, page * 6 + 6);
        for (const [k, n] of slice) {
          const it = ITEMS[k];
          const s = el('button', 'slot');
          s.innerHTML = `<img src="${S(it.sprite)}"><div>${it.name}</div><div class="q">×${n}</div>`;
          s.addEventListener('click', e => { e.stopPropagation(); resolve(k); m.close(true); });
          cells.appendChild(s);
        }
        pager.innerHTML = '';
        if (items.length > 6) {
          pager.appendChild(UI.button('‹', () => { page = Math.max(0, page - 1); render(); }, 'small'));
          pager.appendChild(UI.button('›', () => { page = Math.min(Math.ceil(items.length / 6) - 1, page + 1); render(); }, 'small'));
        }
      };
      render();
      m = UI.modal(box, { onClose: () => resolve(null) });
    });
  }

  // ------------------------------------------------------------------ records, board, socks
  recordPicker(where) {
    const box = el('div', 'notice frame-notice');
    const inner = el('div', 'inner');
    inner.innerHTML = '<h2>Put on a record</h2>';
    let m;
    const add = (key, name, blurb) => {
      const row = this.row('item_vinyl', name, blurb, G.record === key ? 'Playing' : 'Play', () => {
        G.record = key;
        Sound.play('needle_drop', { vol: 0.7 });
        m.close(true);
        this.app.day.sceneMusic();
        const sc = this.app.scene; if (sc && sc.updateSound) sc.updateSound();
      });
      inner.appendChild(row);
    };
    for (const k of G.collections.records) { const rec = RECORDS[k]; if (rec) add(k, `${rec.name} — ${rec.artist}`, rec.blurb); }
    const off = UI.button('Lift the needle', () => { G.record = null; Sound.play('needle_drop', { vol: 0.4 }); m.close(true); this.app.day.sceneMusic(); const sc = this.app.scene; if (sc && sc.updateSound) sc.updateSound(); }, 'small');
    const act = el('div', 'actions'); act.appendChild(off); inner.appendChild(act);
    box.appendChild(inner);
    m = UI.modal(box, {});
    void where;
  }

  communityBoard() {
    const notes = [];
    if (G.flags.petition_started) notes.push(`<b>SAVE LINDEN STREET</b> — petition to the City Council. <b>${G.petition}</b> signatures so far. Sign at the counter!`);
    if (G.flags.tenants_meetings) notes.push('<b>Alder Arms Tenants\' Association</b> — Thursdays, 7pm, here at the laundromat. Cookies provided (June).');
    if (G.flags.night_wash_planned) notes.push('<b>NIGHT WASH</b> — music, snacks & spin cycles. Saturday Sept 27, 8pm. Featuring Maya O.');
    notes.push('LOST: grey cat w/ one white paw. Answers to "Pepper" (does not answer). — Apt 2B');
    notes.push('Piano lessons, cheap, patient. Ask for Mrs. Haddad.');
    if (G.day >= 9) notes.push('Anyone else get a letter from Crestline? — Priya');
    UI.notice(`<h2>Community board</h2><p>Community spirit: <b>${Math.round(G.community)}</b></p>${notes.map(n => `<p>📌 ${n}</p>`).join('')}`, { ok: 'Close' });
  }

  foundSock(where, id) {
    G.vars.socksFound = (G.vars.socksFound || 0) + 1;
    let sock = id ? SOCKS.find(s => s.id === id) : SOCKS.find(s => s.where === where && !G.collections.socks.includes(s.id));
    if (!sock || G.collections.socks.includes(sock.id)) {
      UI.toast('Another stray sock. Into the lost-and-found basket it goes.', 'item_sock');
      return;
    }
    G.collections.socks.push(sock.id);
    Sound.play('sparkle', { vol: 0.7 });
    UI.toast(`Found: ${sock.name}! (${G.collections.socks.length}/${SOCKS.length})`, 'item_sock', '', 3200);
    this.app.story.trigger('sock', { id: sock.id });
  }

  // ------------------------------------------------------------------ calendar
  openCalendar() {
    const cal = el('div', 'calendar');
    cal.appendChild(el('div', 'month', 'SEPTEMBER'));
    const cells = el('div', 'cells');
    for (let d = 1; d <= 30; d++) {
      const c = el('div', 'cell' + (d === G.day ? ' today' : '') + (d < G.day ? ' past' : ''));
      let ev = '';
      const marks = CALENDAR_MARKS.filter(m => m.day === d && (!m.flag || G.flags[m.flag]));
      if (weekday(d) === 6) ev += '<span class="ev">Bills · closed</span>';
      for (const m of marks) ev += `<span class="ev">${m.text}</span>`;
      c.innerHTML = `<span class="n">${WEEKDAYS[weekday(d)].slice(0, 2)} ${d}</span>${ev}`;
      cells.appendChild(c);
    }
    cal.appendChild(cells);
    cal.appendChild(el('div', 'legend', 'Walt: Tue & Fri mornings · June: Mon, Wed, Sat · Remy: Tue, Thu, Sat · Maya: late afternoons'));
    UI.modal(cal, { sound: 'page' });
  }

  // ------------------------------------------------------------------ map
  openMap() {
    const wrap = el('div', 'map');
    const sheet = el('div', 'sheet');
    sheet.style.backgroundImage = 'url(assets/bg/map.webp)';
    wrap.appendChild(sheet);
    const tb = el('div', 'timebar chip');
    tb.innerHTML = `<img src="${S('icon_clock')}"><span>${dateLabel()} · <b>${clockStr(G.time)}</b></span>`;
    wrap.appendChild(tb);
    let m;
    const here = G.location;
    for (const key of MAP_ORDER) {
      const Lc = LOCATIONS[key];
      const pin = el('button', 'pin' + (key === here ? ' here' : ''));
      pin.style.left = Lc.map[0] + '%'; pin.style.top = Lc.map[1] + '%';
      const faces = this.whoIsAt(key).map(w => `<img src="${S('face_' + CHARACTERS[w].portrait + '_' + CHARACTERS[w].defaultExpr)}">`).join('');
      const event = this.app.story.hasLocationEvent(key) ? '<span class="event">!</span>' : '';
      pin.innerHTML = `<div class="bub"><img class="ic" src="${S(Lc.icon)}">${faces ? `<div class="faces">${faces}</div>` : ''}${event}</div><div class="lbl">${Lc.name}</div>`;
      pin.addEventListener('click', async e => {
        e.stopPropagation();
        Sound.play('select', { vol: 0.6 });
        m.close(true);
        if (key === here && this.app.scene && this.app.scene.loc === key) return;
        await this.app.day.travel(key);
      });
      sheet.appendChild(pin);
    }
    m = UI.modal(wrap, { sound: 'page' });
  }

  whoIsAt(loc) {
    const out = [];
    const wd = weekday(G.day);
    for (const w of FRIENDS) {
      if (!G.flags['met_' + w] || !this.app.story.canVisit(w)) continue;
      const forced = G.vars['at_' + w];
      if (forced) { if (forced === loc) out.push(w); continue; }
      const ev = (this.app.routines[w] || {}).evening || {};
      if (loc === 'laundromat' && ev.laundromat_night && ev.laundromat_night.includes(wd) && G.time >= 20 * 60) { out.push(w); continue; }
      if (ev[loc] && ev[loc].includes(wd)) out.push(w);
    }
    // whoever you have a date with this evening is waiting there
    for (const [w, R] of Object.entries(ROMANCE)) {
      if (G.vars['date_' + w] === G.day && R.place === loc && !out.includes(w)) out.push(w);
    }
    return out;
  }

  // ------------------------------------------------------------------ pause / settings
  openPause() {
    const box = el('div', 'notice frame-notice');
    const inner = el('div', 'inner');
    inner.innerHTML = `<h2>Paused</h2>`;
    const set = (label, key, min = 0, max = 1) => {
      const row = el('div', 'setting');
      row.innerHTML = `<span>${label}</span>`;
      const inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = 0.05; inp.value = Settings.get(key);
      inp.addEventListener('input', () => { Settings.set(key, +inp.value); });
      row.appendChild(inp); inner.appendChild(row);
    };
    set('Music', 'music'); set('Sound effects', 'sfx'); set('Ambience', 'amb'); set('Voice blips', 'voiceVol');
    const seg = (label, key, opts) => {
      const row = el('div', 'setting'); row.innerHTML = `<span>${label}</span>`;
      const s = el('div', 'seg');
      for (const [v, t] of opts) {
        const b = el('button', Settings.get(key) === v ? 'on' : '', t);
        b.addEventListener('click', e => { e.stopPropagation(); Settings.set(key, v); [...s.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); if (key === 'quality') { this.app.r.quality = v; this.app.r.resize(); } Sound.play('toggle', { vol: 0.5 }); });
        s.appendChild(b);
      }
      row.appendChild(s); inner.appendChild(row);
    };
    seg('Text speed', 'textSpeed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]);
    seg('Text size', 'textSize', [[0.9, 'S'], [1, 'M'], [1.15, 'L'], [1.3, 'XL']]);
    seg('Shift pace', 'pace', [['relaxed', 'Relaxed'], ['normal', 'Normal'], ['brisk', 'Brisk']]);
    seg('Vibration', 'vibrate', [[true, 'On'], [false, 'Off']]);
    seg('Graphics', 'quality', [[0, 'Battery'], [1, 'Normal'], [2, 'Sharp']]);
    const act = el('div', 'actions');
    let m;
    act.appendChild(UI.button('How to play', () => { m.close(true); this.help(); }, 'small'));
    act.appendChild(UI.button('Save & quit to title', async () => { m.close(true); if (G.phase !== 'shift') Save.save(); else this.app.saveMidShift(); await this.app.toTitle(); }, 'small'));
    act.appendChild(UI.button('Resume', () => m.close(), 'primary'));
    inner.appendChild(act);
    box.appendChild(inner);
    m = UI.modal(box, {});
  }

  help() {
    UI.notice(`<h2>How to run a laundromat</h2>
      <p><b>Tap</b> anywhere on the floor to hop there. <b>Tap things</b> to use them — you pop over and do it.</p>
      <p><b>Drop-offs:</b> bags appear on the counter. Carry one to a <b>washer</b>, then a <b>dryer</b>, then <b>fold</b> it at the folding table. It goes on the pickup shelf and the customer collects it at their pickup time. Gold arrows show where the laundry you're holding can go.</p>
      <p><b>Hands full?</b> Tap a finished machine to swap loads, or tap the counter to set a bag down for later. Tap an order ticket to read its note.</p>
      <p><b>Walk-ins</b> use free washers on their own and pay coins. Keep a machine free for them.</p>
      <p><b>Chores:</b> mop puddles, clean dryer lint, fix broken machines (you'll need spare parts), and keep detergent stocked.</p>
      <p><b>Energy</b> (the bar under your stars) drains as you work. When it runs low you slow down: sit on the bench, have a cup of tea, or pet Biscuit.</p>
      <p><b>Evenings</b> are yours: see friends, take photos, sketch, knit, explore. Talk to people every day and bring gifts they love.</p>
      <p><b>Errands:</b> friends and neighbours sometimes ask for a hand. The Journal's Errands page tracks them; finishing one pays off.</p>
      <p><b>Upgrades</b> in the catalog change how the shop runs: faster washes, cheaper bills, more customers.</p>
      <p><b>Romance</b> is up to you. When someone close to you says something that matters, your answer decides whether it becomes more.</p>
      <p><b>Bills</b> come every Sunday night. Don't let Rosa's go under.</p>`, { ok: 'Got it' });
  }

  // ------------------------------------------------------------------ ending
  async playEnding(id) {
    const E = ENDINGS[id];
    Dialogue.close();            // the final choice is still on screen; the ending takes over from here
    Sound.music(E.music || 'ending', 3);
    this.app.hud.show(false);
    await UI.fadeOut(1200);
    await UI.dayCard('One year later', E.title, E.tagline, 3600);
    const cards = E.cards(G);
    for (const c of cards) {
      await new Promise(res => {
        const wrap = el('div', 'epilogue');
        wrap.innerHTML = `<div class="card">${c.img ? `<img src="${S(c.img)}">` : ''}<h3>${c.title}</h3><p>${formatText(c.text)}</p></div>`;
        const b = UI.button('Continue', () => { Sound.play('page', { vol: 0.5 }); wrap.remove(); res(); }, 'primary');
        b.style.marginTop = '1.5rem';
        wrap.querySelector('.card').appendChild(b);
        document.getElementById('ui').appendChild(wrap);
      });
    }
    await this.credits();
    await UI.fadeIn(800);
  }

  credits() {
    return new Promise(res => {
      const c = el('div', 'credits');
      const roll = el('div', 'roll');
      roll.innerHTML = CREDITS;
      roll.style.animationDuration = '60s';
      c.appendChild(roll);
      const skip = UI.button('Skip', () => { c.remove(); res(); }, 'small');
      skip.style.position = 'absolute'; skip.style.right = '2rem'; skip.style.bottom = '2rem';
      c.appendChild(skip);
      roll.addEventListener('animationend', () => { c.remove(); res(); });
      document.getElementById('ui').appendChild(c);
    });
  }
}

export { STORY_DAYS };
