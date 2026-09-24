// Laundromat simulation: machines, drop-off orders, self-service walk-ins, wear and satisfaction.
// Pure game logic (no drawing); scenes/laundromat.js renders it and drives the player actions.
import { G, addMoney, addStat, stars, weekday, takeItem } from './state.js';
import { makeRng, clamp } from '../engine/util.js';
import { REGULARS, SERVICES } from '../data/regulars.js';

export const OPEN_AT = 8 * 60;
export const CLOSE_AT = 18 * 60;

export const MODELS = {
  classic: { kind: 'washer', name: 'Classic front-loader', cycle: 32, soap: 1, wear: 5.5, price: 140, sprite: 'machine_washer_idle',
    blurb: 'Rosa\'s old workhorse. Honest, loud, a little temperamental.' },
  speed: { kind: 'washer', name: 'SpinQueen 900', cycle: 20, soap: 1, wear: 4.5, price: 320, sprite: 'machine_washer_orange',
    blurb: 'Fast cycles. Orders wash in almost half the time.' },
  eco: { kind: 'washer', name: 'Blue Heron Eco', cycle: 26, soap: 0.5, wear: 2.5, price: 260, sprite: 'machine_washer_blue',
    blurb: 'Gentle, reliable, sips detergent. Customers love it for delicates.' },
  stack: { kind: 'dryer', name: 'Twin-Tumble dryer stack', cycle: 36, wear: 3.5, price: 380, sprite: 'machine_stack_unit',
    blurb: 'Two dryer drums in one tower.' },
};

export const WASHER_SLOTS = 5;
export const DRYER_UNITS = 2;

const SELF_WASH = 3.5, SELF_DRY = 2.5;

// Runtime (non-saved) simulation state for the current shift.
export const Sim = {
  events: [],            // queued events for the scene: {type, ...}
  selfQueue: [],         // walk-ins waiting for a dryer: [{washer}]
  nextWalkIn: 0,
  plan: [],              // today's scheduled drop-offs
  puddles: [],           // {id, x, y, size}
  litter: [],            // {id, x, y, kind:'sock'|'lint'}
  seq: 1,
};

export function emit(type, data) { Sim.events.push(Object.assign({ type }, data || {})); }

// ------------------------------------------------------------------ machines
export function washers() { return G.machines.filter(m => m.kind === 'washer').sort((a, b) => a.slot - b.slot); }
export function dryers() { return G.machines.filter(m => m.kind === 'dryer').sort((a, b) => a.slot - b.slot); }
export function machine(id) { return G.machines.find(m => m.id === id); }
export function modelOf(m) { return MODELS[m.model] || MODELS.classic; }

export function cycleMinutes(m) {
  let c = modelOf(m).cycle;
  if (m.kind === 'dryer' && m.lint >= 5) c *= 1.35;
  return c;
}

export function isFree(m) { return !m.broken && !m.state && !m.load; }

export function ensureMachineFields() {
  for (const m of G.machines) {
    if (m.state === undefined) m.state = null;       // null | 'running' | 'done'
    if (m.load === undefined) m.load = null;         // order id or 'self'
    if (m.t === undefined) m.t = 0;
    if (m.dur === undefined) m.dur = 0;
    if (m.lint === undefined) m.lint = 0;
    if (m.uses === undefined) m.uses = 0;
  }
}

// Start a cycle with an order (or 'self'). Returns {ok, reason}.
export function startCycle(m, load) {
  if (m.broken) return { ok: false, reason: 'broken' };
  if (m.state) return { ok: false, reason: 'busy' };
  const model = modelOf(m);
  if (m.kind === 'washer' && load !== 'self') {
    if ((G.inv.detergent || 0) < model.soap) return { ok: false, reason: 'soap' };
    G.inv.detergent = Math.round(((G.inv.detergent || 0) - model.soap) * 10) / 10;
  }
  // wear & possible breakdown at start
  m.cond = clamp((m.cond ?? 60) - model.wear * (0.6 + Math.random() * 0.8), 0, 100);
  const breakChance = m.cond < 12 ? 0.55 : m.cond < 25 ? 0.2 : m.cond < 40 ? 0.05 : 0.0;
  m.load = load; m.state = 'running'; m.t = 0; m.dur = cycleMinutes(m);
  m.uses++;
  if (m.kind === 'dryer') m.lint = (m.lint || 0) + 1;
  G.stats.cycles++;
  G.vars.cyclesToday = (G.vars.cyclesToday || 0) + 1;
  G.vars.weekCycles = (G.vars.weekCycles || 0) + 1;
  if (Math.random() < breakChance && G.day > 1) {
    m.breakAt = 0.25 + Math.random() * 0.5;   // breaks partway through
  } else m.breakAt = null;
  emit('cycleStart', { m });
  return { ok: true };
}

export function unload(m) {
  const load = m.load;
  m.load = null; m.state = null; m.t = 0; m.dur = 0;
  return load;
}

export function repair(m, quality) {
  m.broken = false;
  m.cond = clamp(55 + quality * 35 + G.skills.repair * 3, 0, 100);
  G.stats.repairs++;
  if (m.state === 'running') { /* resumes */ }
  emit('repaired', { m });
}

export function cleanLint(m) { m.lint = 0; emit('lintCleaned', { m }); }

// ------------------------------------------------------------------ orders
export function order(id) { return G.orders.find(o => o.id === id); }
export function activeOrders() { return G.orders.filter(o => o.stage !== 'done'); }

export function createOrder(spec) {
  const svc = SERVICES[spec.service] || SERVICES.wash_fold;
  const o = {
    id: 'o' + (G.orderSeq++),
    who: spec.who,                    // friend id or regular id
    name: spec.name,
    icon: spec.icon || null,
    service: spec.service || 'wash_fold',
    stage: 'counter',
    machine: null,
    created: G.time,
    due: Math.min(CLOSE_AT - 10, G.time + (spec.dueIn || svc.dueIn)),
    price: spec.price || svc.price,
    note: spec.note || null,
    softener: !!spec.softener,
    gentle: !!spec.gentle || spec.service === 'delicate',
    fold: null,
    late: false,
    bag: spec.bag || 'item_drawstring_bag',
    story: spec.story || null,
    day: G.day,
  };
  G.orders.push(o);
  emit('orderArrived', { o });
  return o;
}

export function stagesOf(o) {
  return (SERVICES[o.service] || SERVICES.wash_fold).stages;
}

export function stageIndex(o) {
  const st = stagesOf(o);
  const map = { counter: 0, carried: 0, washing: 0, washed: 1, drying: 1, dried: 2, folding: 2, ready: st.length, done: st.length };
  if ((o.stage === 'carried' || o.stage === 'counter') && o.washed) return o.dried ? 2 : 1;
  return map[o.stage] ?? 0;
}

// What should happen next with this order when the player holds it.
export function nextStep(o) {
  if (!o.washed) return 'wash';
  if (!o.dried) return 'dry';
  if (stagesOf(o).includes('fold') && o.fold === null) return 'fold';
  return 'shelf';
}

export function finishOrder(o, when) {
  o.stage = 'ready';
  o.readyAt = when ?? G.time;
  if (!G.shelf.includes(o.id)) G.shelf.push(o.id);
  emit('orderReady', { o });
}

// Customer collects the order: pay, tip, reputation.
export function pickup(o) {
  const onTime = !o.late && (o.readyAt ?? G.time) <= o.due + 5;
  const foldQ = o.fold === null ? 0.8 : o.fold;
  let q = (onTime ? 0.55 : 0.2) + foldQ * 0.25 + (G.cleanliness / 100) * 0.1 + comfortScore() * 0.1;
  if (o.softenerWanted !== undefined) q += o.softenerOk ? 0.05 : -0.08;
  q = clamp(q, 0, 1);
  const priceMul = G.policies.prices === 'low' ? 0.85 : G.policies.prices === 'high' ? 1.2 : 1;
  const pay = Math.round(o.price * priceMul);
  const tip = Math.round(o.price * 0.35 * Math.max(0, q - 0.45) / 0.55 * (G.policies.prices === 'high' ? 0.5 : 1));
  addMoney(pay, `${o.name} — ${SERVICES[o.service].label}`, 'order');
  if (tip > 0) addMoney(tip, `Tip from ${o.name}`, 'tip');
  const repDelta = (q - 0.55) * 4 - (G.policies.prices === 'high' ? 0.6 : 0) + (G.policies.prices === 'low' ? 0.3 : 0);
  addStat('reputation', repDelta);
  if (G.flags.petition_started && q > 0.6) G.petition += 1 + (q > 0.85 ? 1 : 0);
  o.stage = 'done';
  o.quality = q;
  G.shelf = G.shelf.filter(id => id !== o.id);
  G.today.orders++;
  G.stats.orders++;
  if (!onTime) { G.today.late++; G.stats.late++; }
  if (q > 0.9) G.stats.perfect++;
  emit('pickedUp', { o, pay, tip, q, onTime });
  return { pay, tip, q, onTime };
}

// ------------------------------------------------------------------ comfort / decor
let comfortFn = () => 0;
export function setComfortFn(fn) { comfortFn = fn; }
export function comfortScore() { return clamp(comfortFn(), 0, 1); }

// ------------------------------------------------------------------ daily plan
export function planDay(extra = []) {
  const rng = makeRng(G.rngSeed + G.day * 7919);
  const wd = weekday(G.day);
  const st = stars();
  let n = Math.round(1.5 + st * 1.1 + (wd === 5 ? 2 : 0) + (wd === 0 ? 1 : 0) + (G.weather === 'rain' ? 0.5 : 0));
  if (G.day === 1) n = 2;
  if (G.flags.storm_day) n = Math.max(2, n - 2);
  n = clamp(n, 1, 10);
  const pool = REGULARS.filter(r => (!r.from || G.day >= r.from) && (!r.until || G.day <= r.until) && (!r.flag || G.flags[r.flag]) && (!r.notFlag || !G.flags[r.notFlag]));
  const picks = rng.shuffle(pool).slice(0, n);
  const plan = [];
  const start = OPEN_AT + 20, end = 15 * 60 + 30;
  picks.forEach((r, i) => {
    const at = Math.round(start + (end - start) * ((i + rng()) / picks.length));
    const service = rng.chance(0.18) ? 'rush' : rng.pick(r.services || ['wash_fold']);
    const note = pickNote(r, rng);
    plan.push({ at, who: r.id, name: r.name, icon: r.icon, service, note, bag: rng.pick(r.bags || ['item_drawstring_bag', 'item_tote_bag', 'item_hamper', 'item_wicker_basket']), softener: rng.chance(r.softener || 0.2) });
  });
  for (const e of extra) plan.push(e);
  plan.sort((a, b) => a.at - b.at);
  Sim.plan = plan;
  Sim.nextWalkIn = OPEN_AT + 15 + rng() * 30;
  Sim.puddles = [];
  Sim.litter = [];
  Sim.selfQueue = [];
  G.vars.cyclesToday = 0;
  return plan;
}

function pickNote(r, rng) {
  if (!r.notes) return null;
  // notes can be day-gated: {text, from, until}
  const ok = r.notes.filter(n => typeof n === 'string' || ((!n.from || G.day >= n.from) && (!n.until || G.day <= n.until)));
  if (!ok.length || !rng.chance(0.75)) return null;
  const n = rng.pick(ok);
  return typeof n === 'string' ? n : n.text;
}

function walkInRate() {
  // walk-ins per game hour
  const t = G.time / 60;
  const peak = 1 + 0.6 * Math.exp(-Math.pow(t - 12.5, 2) / 2) + 0.8 * Math.exp(-Math.pow(t - 17, 2) / 1.5);
  const w = G.weather === 'rain' ? 1.3 : G.weather === 'storm' ? 0.6 : 1;
  const price = G.policies.prices === 'high' ? 0.75 : G.policies.prices === 'low' ? 1.2 : 1;
  const comfort = 0.85 + comfortScore() * 0.4;
  return 0.55 * (0.35 + stars() / 4) * peak * w * price * comfort;
}

// ------------------------------------------------------------------ tick (game minutes)
export function tick(dm) {
  // scheduled drop-offs
  while (Sim.plan.length && Sim.plan[0].at <= G.time) {
    const p = Sim.plan.shift();
    if (G.time < CLOSE_AT - 60) createOrder(p);
  }
  // machines
  for (const m of G.machines) {
    if (m.state !== 'running' || m.broken) continue;
    m.t += dm;
    if (m.breakAt && m.t >= m.dur * m.breakAt) {
      m.broken = true; m.breakAt = null;
      emit('broke', { m });
      if (m.load === 'self') addStat('reputation', -1.5);
      continue;
    }
    if (m.t >= m.dur) {
      m.state = 'done';
      const o = m.load !== 'self' ? order(m.load) : null;
      if (o) {
        if (m.kind === 'washer') { o.washed = true; o.stage = 'washed'; }
        else { o.dried = true; o.stage = 'dried'; }
      }
      emit('cycleDone', { m, o });
      if (m.load === 'self') {
        if (m.kind === 'washer') Sim.selfQueue.push({ washer: m.id, since: G.time });
        else m.collectAt = G.time + 6 + Math.random() * 14;
      }
    }
  }
  // self-service: move washed walk-in loads to free dryers, collect dried ones
  for (let i = Sim.selfQueue.length - 1; i >= 0; i--) {
    const q = Sim.selfQueue[i];
    const w = machine(q.washer);
    if (!w || w.load !== 'self') { Sim.selfQueue.splice(i, 1); continue; }
    if (G.time - q.since < 4) continue;
    const d = dryers().find(isFree);
    if (d) {
      unload(w);
      startCycle(d, 'self');
      addMoney(SELF_DRY, null, 'self');
      G.today.selfServe += SELF_DRY;
      emit('selfMove', { from: w, to: d });
      Sim.selfQueue.splice(i, 1);
    } else if (G.time - q.since > 70) {
      // gives up and takes it home damp
      unload(w); addStat('reputation', -0.8); Sim.selfQueue.splice(i, 1); emit('selfGaveUp', { m: w });
    }
  }
  for (const d of dryers()) {
    if (d.load === 'self' && d.state === 'done' && d.collectAt && G.time >= d.collectAt) { unload(d); d.collectAt = null; emit('selfCollected', { m: d }); }
  }
  // walk-ins
  if (G.time >= Sim.nextWalkIn && G.time < CLOSE_AT - 45) {
    const rate = walkInRate();
    Sim.nextWalkIn = G.time + (60 / Math.max(0.05, rate)) * (0.5 + Math.random());
    const reserved = new Set(G.orders.filter(o => o.stage !== 'done' && o.stage !== 'ready').map(o => o.machine));
    const free = washers().filter(m => isFree(m) && !reserved.has(m.id));
    // leave at least one washer for the attendant's drop-off work
    if (free.length >= 2 || (free.length === 1 && washers().filter(isFree).length > 1)) {
      const m = free[Math.floor(Math.random() * free.length)];
      startCycle(m, 'self');
      addMoney(SELF_WASH, null, 'self');
      G.today.selfServe += SELF_WASH;
      emit('walkIn', { m });
    } else {
      addStat('reputation', -0.25);
      emit('walkInTurnedAway', {});
    }
  }
  // pickups for ready orders at/after due time; unfinished orders become late
  for (const o of G.orders) {
    if (o.stage === 'done') continue;
    if (!o.late && G.time > o.due && o.stage !== 'ready') { o.late = true; emit('orderLate', { o }); }
    if (o.stage === 'ready' && G.time >= Math.max(o.due, o.readyAt + 5) && !o.personal) {
      pickup(o);
    }
  }
  // cleanliness drift, puddles, litter
  const traffic = 0.012 * dm * (1 + (G.weather === 'rain' ? 0.8 : 0) + (G.weather === 'storm' ? 1.5 : 0));
  addStat('cleanliness', -traffic);
  const puddleChance = (G.weather === 'rain' ? 0.011 : G.weather === 'storm' ? 0.02 : 0.003) * dm;
  if (Math.random() < puddleChance && Sim.puddles.length < 4) {
    const nearDoor = Math.random() < 0.7;
    const p = { id: Sim.seq++, x: nearDoor ? 1640 + Math.random() * 200 : 560 + Math.random() * 700, y: 600 + Math.random() * 70, size: 0.7 + Math.random() * 0.5 };
    Sim.puddles.push(p);
    addStat('cleanliness', -3);
    emit('puddle', { p });
  }
  if (Math.random() < 0.0035 * dm && Sim.litter.length < 3) {
    const kind = Math.random() < 0.55 ? 'sock' : 'lint';
    const l = { id: Sim.seq++, kind, x: 520 + Math.random() * 1000, y: 585 + Math.random() * 90 };
    Sim.litter.push(l);
    emit('litter', { l });
  }
}

export function clearPuddle(id) {
  Sim.puddles = Sim.puddles.filter(p => p.id !== id);
  addStat('cleanliness', 9);
  G.stats.mopped++;
}

// Close the shop: finish anything outstanding (Nora stays late) and return a summary.
export function closeShop() {
  const leftovers = G.orders.filter(o => o.stage !== 'done');
  let late = 0;
  for (const o of leftovers) {
    o.washed = o.dried = true;
    if (o.fold === null && stagesOf(o).includes('fold')) o.fold = 0.45;
    o.readyAt = CLOSE_AT + 30;
    if (o.readyAt > o.due) o.late = true;
    o.stage = 'ready';
    const r = pickup(o);
    if (!r.onTime) late++;
  }
  for (const m of G.machines) { m.state = null; m.load = null; m.t = 0; m.collectAt = null; m.breakAt = null; }
  G.shelf = [];
  G.orders = G.orders.filter(o => o.stage !== 'done');
  Sim.plan = []; Sim.selfQueue = []; Sim.puddles = []; Sim.litter = [];
  return { leftovers: leftovers.length, late };
}

export const PRICES = { SELF_WASH, SELF_DRY };
