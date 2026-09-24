// Heads-up display: date/time, money, reputation, energy, goal ribbon, order tickets, buttons.
import { el, clockStr, money } from '../engine/util.js';
import { G, stars, dateLabel } from '../game/state.js';
import * as L from '../game/laundry.js';
import { SERVICES } from '../data/regulars.js';
import { UI } from './ui.js';

const WEATHER_ICON = { clear: '☀', cloudy: '☁', rain: '☂', storm: '⛈' };

export class Hud {
  constructor(app) {
    this.app = app;
    this.root = el('div', 'hud hidden');
    const left = el('div', 'hud-left');
    this.timeChip = el('div', 'chip');
    this.timeChip.innerHTML = '<img src="assets/sprites/icon_clock.webp"><span class="t"></span>';
    left.appendChild(this.timeChip);
    const right = el('div', 'hud-right');
    this.moneyChip = el('div', 'chip');
    this.moneyChip.innerHTML = '<img src="assets/sprites/icon_coin.webp"><b class="m"></b>';
    this.repChip = el('div', 'chip');
    this.repChip.innerHTML = '<div class="stars"></div><div class="energy" title="Energy"><div></div></div>';
    right.appendChild(this.moneyChip); right.appendChild(this.repChip);
    this.root.appendChild(left); this.root.appendChild(right);
    this.goal = el('div', 'goal hidden');
    this.buttons = el('div', 'hud-buttons hidden');
    this.tickets = el('div', 'tickets');
    this.moneyChip.addEventListener('click', () => this.app.menus.openJournal('ledger'));
    this.repChip.addEventListener('click', () => this.app.menus.openJournal('shop'));
    this.timeChip.addEventListener('click', () => this.app.menus.openCalendar());
    const ui = document.getElementById('ui');
    ui.appendChild(this.root); ui.appendChild(this.goal); ui.appendChild(this.buttons); ui.appendChild(this.tickets);
    this.mode = 'hidden';
    this.btns = {};
    this.buildButtons();
  }

  buildButtons() {
    const add = (id, icon, fn) => { const b = UI.iconButton(icon, fn); b.dataset.id = id; this.btns[id] = b; this.buttons.appendChild(b); return b; };
    add('menu', 'icon_gear', () => this.app.menus.openPause());
    add('journal', 'icon_journal', () => this.app.menus.openJournal());
    add('catalog', 'icon_detergent', () => this.app.menus.openCatalog());
    add('map', 'icon_map', () => this.app.day.openMap());
    add('close', 'icon_home', () => this.app.day.askCloseEarly());
  }

  // modes: hidden | shift | free | home | map
  setMode(mode) {
    this.mode = mode;
    const show = mode !== 'hidden';
    this.root.classList.toggle('hidden', !show);
    this.buttons.classList.toggle('hidden', !show);
    this.tickets.classList.toggle('hidden', mode !== 'shift');
    const vis = { menu: show, journal: show, catalog: mode === 'shift' || mode === 'free' || mode === 'home', map: mode === 'free' && G.flags.map_unlocked, close: mode === 'shift' };
    for (const [id, b] of Object.entries(this.btns)) b.classList.toggle('hidden', !vis[id]);
    this.refresh();
    this.refreshTickets();
  }

  show(on) { this.root.classList.toggle('hidden', !on); this.buttons.classList.toggle('hidden', !on); if (!on) this.tickets.classList.add('hidden'); else if (this.mode === 'shift') this.tickets.classList.remove('hidden'); }

  refresh() {
    const w = WEATHER_ICON[G.weather] || '';
    this.timeChip.querySelector('.t').innerHTML = `${dateLabel()} <span class="sub">${w}</span> <b>${clockStr(G.time)}</b>`;
    this.moneyChip.querySelector('.m').textContent = money(G.money);
    const st = stars();
    const sw = this.repChip.querySelector('.stars');
    let h = '';
    for (let i = 1; i <= 5; i++) h += `<img src="assets/sprites/icon_star.webp" class="${st >= i - 0.25 ? '' : 'off'}">`;
    if (sw.innerHTML !== h) sw.innerHTML = h;
    this.repChip.querySelector('.energy > div').style.width = Math.round(G.energy) + '%';
    const closeBtn = this.btns.close;
    if (closeBtn) closeBtn.classList.toggle('glow', this.mode === 'shift' && G.time >= 17 * 60);
    this.btns.map && this.btns.map.classList.toggle('glow', this.mode === 'free' && !!G.flags.map_unlocked && !G.flags.map_opened);
  }

  setGoal(text) {
    G.goal = text || '';
    this.goal.textContent = text || '';
    this.goal.classList.toggle('hidden', !text);
  }

  refreshTickets() {
    if (this.mode !== 'shift') { this.tickets.innerHTML = ''; return; }
    const active = G.orders.filter(o => o.stage !== 'done').sort((a, b) => a.due - b.due);
    const scene = this.app.scene;
    const carry = scene && scene.carry ? scene.carry : [];
    const frag = document.createDocumentFragment();
    for (const o of active.slice(0, 6)) {
      const t = el('div', 'ticket' + (carry.includes(o.id) ? ' selected' : ''));
      const svc = SERVICES[o.service];
      const stages = L.stagesOf(o);
      const idx = L.stageIndex(o);
      const icon = o.icon ? `assets/sprites/${o.icon}.webp` : 'assets/sprites/icon_basket.webp';
      const late = !o.late && G.time > o.due - 30 && o.stage !== 'ready';
      t.innerHTML = `<div class="who"><img src="${icon}">${o.name}</div><div class="kind">${svc.label}</div>` +
        `<div class="stage">${stages.map((s, i) => `<span class="${i < idx ? 'done' : i === idx && o.stage !== 'counter' ? 'now' : ''}"></span>`).join('')}</div>` +
        `<div class="due ${o.late || late ? 'late' : ''}">${o.stage === 'ready' ? 'Ready ✓' : o.stage === 'counter' ? 'At the counter' : (o.late ? 'Late!' : 'Due ' + clockStr(o.due))}</div>` +
        (o.note ? '<img class="note-ico" src="assets/sprites/icon_speech.webp">' : '');
      t.addEventListener('click', e => { e.stopPropagation(); this.app.menus.orderInfo(o); });
      frag.appendChild(t);
    }
    this.tickets.innerHTML = '';
    this.tickets.appendChild(frag);
  }
}
