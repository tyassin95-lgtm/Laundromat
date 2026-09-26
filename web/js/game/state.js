// The single serialisable game state object (G) and helpers that mutate it.
import { clamp } from '../engine/util.js';

export const SAVE_VERSION = 3;
export const STORY_DAYS = 28;
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const FRIENDS = ['walt', 'maya', 'june', 'remy'];
export const NEIGHBOURS = ['delgado', 'priya', 'haddad', 'kai'];   // 5-heart friendships

export function newState(name) {
  return {
    version: SAVE_VERSION,
    name: name || 'Nora',
    shop: "Rosa's",
    day: 1,
    time: 7 * 60,
    phase: 'morning',       // morning | shift | evening | night
    location: 'home',
    weather: 'rain',
    money: 120,
    energy: 100,
    reputation: 28,          // 0..100 -> stars
    cleanliness: 55,         // 0..100
    community: 8,            // 0..100 community spirit
    petition: 0,
    flags: {},
    vars: {},
    hearts: { walt: 0, maya: 0, june: 0, remy: 0 },   // friendship points, 100 = one heart
    talked: {},              // who -> day last talked
    gifted: {},              // who -> day last gifted
    inv: { detergent: 10, softener: 0, parts: 1, tea: 4 },
    decor: [],               // owned decor ids (not yet placed or placed)
    placed: {},              // slotId -> decor id (laundromat) ; home slots prefixed "h:"
    upgrades: [],
    machines: [
      { id: 'W1', kind: 'washer', slot: 0, model: 'classic', cond: 62, broken: false },
      { id: 'W2', kind: 'washer', slot: 1, model: 'classic', cond: 55, broken: false },
      { id: 'W3', kind: 'washer', slot: 2, model: 'classic', cond: 20, broken: true },
      { id: 'D1', kind: 'dryer', slot: 0, model: 'stack', cond: 60, broken: false },
      { id: 'D2', kind: 'dryer', slot: 1, model: 'stack', cond: 52, broken: false },
    ],
    orders: [],
    orderSeq: 1,
    shelf: [],               // order ids waiting for pickup
    skills: { repair: 0, fold: 0, sketch: 0, knit: 0, photo: 0 },
    collections: { socks: [], records: ['title', 'laundromat_day2'], photos: [], sketches: [] },
    policies: { prices: 'normal', freeTea: false, pwyc: false },
    stats: { orders: 0, late: 0, perfect: 0, earned: 0, tips: 0, cycles: 0, repairs: 0, mopped: 0, gifts: 0, days: 0, spent: 0 },
    today: freshToday(),
    diary: [],
    ledger: [],
    billsPaid: [],
    debt: 0,
    goal: '',
    ending: null,
    endingsSeen: [],
    record: null,            // record playing in the laundromat
    seen: {},
    rngSeed: (Math.random() * 1e9) | 0,
    playSeconds: 0,
  };
}

export function freshToday() {
  return { income: 0, tips: 0, expenses: 0, orders: 0, late: 0, selfServe: 0, hearts: {}, notes: [], events: [], talked: [], photos: 0 };
}

export let G = newState();
export function setState(s) { G = s; }

// ------------------------------------------------------------------ derived helpers
export const heartsOf = who => Math.floor((G.hearts[who] || 0) / 100);
export const stars = () => clamp(Math.round(G.reputation / 20 * 2) / 2, 0.5, 5);
export const weekOf = day => Math.ceil(day / 7);
export const weekday = day => (day - 1) % 7;          // 0 = Monday (Sept 1 is a Monday)
export const isSunday = day => weekday(day) === 6;
export const flag = f => !!G.flags[f];
// The shop opens on Sundays only for pay-what-you-can afternoons (a policy June suggests in week 2).
export const sundayOpen = () => !!(G.flags.open_sundays || G.policies.pwyc);
export const pwycToday = () => !!G.policies.pwyc && isSunday(G.day);

export function setFlag(f, v = true) { G.flags[f] = v; }

export function addMoney(amount, label, kind) {
  G.money += amount;
  if (amount >= 0) { G.today.income += amount; if (kind === 'tip') G.today.tips += amount; G.stats.earned += amount; }
  else { G.today.expenses += -amount; G.stats.spent += -amount; }
  if (label) {
    G.ledger.push({ day: G.day, label, amount: Math.round(amount * 100) / 100 });
    if (G.ledger.length > 120) G.ledger.splice(0, G.ledger.length - 120);
  }
}

export function addStat(key, v, lo = 0, hi = 100) {
  G[key] = clamp((G[key] || 0) + v, lo, hi);
}

export function hasItem(id, n = 1) { return (G.inv[id] || 0) >= n; }
export function giveItem(id, n = 1) { G.inv[id] = (G.inv[id] || 0) + n; }
export function takeItem(id, n = 1) { if ((G.inv[id] || 0) < n) return false; G.inv[id] -= n; if (G.inv[id] <= 0) delete G.inv[id]; return true; }

export function dateLabel(day) {
  const d = day || G.day;
  if (d <= 30) return `${WEEKDAYS[weekday(d)]} · Sept ${d}`;
  return `${WEEKDAYS[weekday(d)]} · Oct ${d - 30}`;
}
