// Story director: event triggers, script commands, talking, gifts and friendship.
import { Runner, loadScript, hasNode } from './script.js';
import { G, heartsOf, addMoney, addStat, giveItem, takeItem, hasItem, stars, weekday, FRIENDS } from './state.js';
import { Dialogue } from '../ui/dialogue.js';
import { UI } from '../ui/ui.js';
import { Sound } from '../engine/audio.js';
import { tweens } from '../engine/tween.js';
import { CHARACTERS } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { EVENTS } from '../data/events.js';
import { CHATTER } from '../data/chatter.js';
import { LETTERS } from '../data/letters.js';
import { SCRIPTS } from '../data/story/index.js';
import { vibrate } from './settings.js';
import { makeRng } from '../engine/util.js';

export class Story {
  constructor(app) {
    this.app = app;
    for (const [tag, src] of Object.entries(SCRIPTS)) loadScript(src, tag);
    this.busy = false;
    this.queue = [];
    const self = this;
    this.runner = new Runner({
      say: (who, expr, text) => Dialogue.say(who, expr, text),
      choose: opts => Dialogue.choose(opts),
      context: () => self.context(),
      command: (name, args, runner) => self.command(name, args, runner),
      markSeen: id => { G.seen[id] = G.day; },
    });
  }

  context() {
    const hearts = {};
    for (const f of FRIENDS) hearts[f] = heartsOf(f);
    return {
      flag: G.flags, var: G.vars, vars: G.vars, hearts, pts: G.hearts, day: G.day, money: G.money, community: G.community, petition: G.petition,
      rep: G.reputation, stars: stars(), energy: G.energy, weekday: weekday(G.day), time: G.time, phase: G.phase, item: G.inv,
      seen: G.seen, name: G.name, weather: G.weather, loc: G.location, talkedToday: (w) => G.talked[w] === G.day,
      owns: (d) => G.decor.includes(d), placed: (d) => Object.values(G.placed).includes(d), upgrade: (u) => G.upgrades.includes(u),
      skill: G.skills, socks: G.collections.socks.length, records: G.collections.records.length, ending: G.ending,
      ev: this.lastEventData || {}, Math,
    };
  }

  // Play a script node as a conversation (pauses the game while open).
  async play(nodeId) {
    if (!hasNode(nodeId)) { console.warn('missing node', nodeId); return; }
    if (this.busy) { await new Promise(r => this.queue.push(r)); }
    this.busy = true;
    this.app.uiBlock++;
    Sound.duck(0.6);
    Dialogue.open();
    try { await this.runner.run(nodeId); }
    catch (e) { console.error('script error in', nodeId, e); }
    finally {
      Dialogue.close();
      Sound.duck(1);
      this.app.uiBlock--;
      this.busy = false;
      this.app.hud.refresh();
      const next = this.queue.shift(); if (next) next();
    }
  }

  // Find and play story events for a trigger. Returns true if something played.
  async trigger(on, data = {}) {
    const ctx = this.context();
    for (const ev of EVENTS) {
      if (ev.on !== on) continue;
      if (ev.once !== false && G.flags['ev_' + ev.id]) continue;
      if (ev.day && ev.day !== G.day) continue;
      if (ev.minDay && G.day < ev.minDay) continue;
      if (ev.maxDay && G.day > ev.maxDay) continue;
      if (ev.who && ev.who !== data.who) continue;
      if (ev.loc && ev.loc !== (data.loc || G.location)) continue;
      if (ev.at && (G.time < ev.at || G.time > ev.at + 90)) continue;
      if (ev.weekday !== undefined && ev.weekday !== weekday(G.day)) continue;
      if (ev.cond && !this.runner.eval(ev.cond)) continue;
      if (ev.once !== false) G.flags['ev_' + ev.id] = true;
      this.lastEventData = data;
      if (ev.node) await this.play(ev.node);
      if (ev.run) await ev.run(this.app, data);
      return true;
    }
    void ctx;
    return false;
  }

  hasLocationEvent(loc) {
    return EVENTS.some(ev => ev.on === 'location' && ev.loc === loc && !G.flags['ev_' + ev.id] &&
      (!ev.day || ev.day === G.day) && (!ev.minDay || G.day >= ev.minDay) && (!ev.maxDay || G.day <= ev.maxDay) &&
      (ev.weekday === undefined || ev.weekday === weekday(G.day)) && (!ev.cond || this.runner.eval(ev.cond)));
  }

  onMinute() {
    // time-based events during the shift
    if (this.busy) return;
    this.trigger('time');
  }

  canVisit(who) {
    if (G.flags['away_' + who]) return false;
    if (who === 'maya' && G.flags.maya_left) return false;
    return true;
  }

  // ------------------------------------------------------------------ friendship
  addHearts(who, pts, quiet) {
    if (!FRIENDS.includes(who)) return;
    const before = heartsOf(who);
    G.hearts[who] = Math.max(0, Math.min(1000, (G.hearts[who] || 0) + pts));
    const after = heartsOf(who);
    G.today.hearts[who] = (G.today.hearts[who] || 0) + pts;
    if (after > before) {
      Sound.play('heart', { vol: 0.7 });
      vibrate(20);
      UI.toast(`${CHARACTERS[who].name} — ${after} ♥`, 'icon_heart', 'heart', 3000);
      const sc = this.app.scene;
      const a = sc && sc.actors && sc.actors.find(x => x.id === who);
      if (a && sc.particles) sc.particles.emit('heart', a.x, a.y - a.dispH * 0.8, 3);
    } else if (pts > 0 && !quiet) {
      const sc = this.app.scene;
      const a = sc && sc.actors && sc.actors.find(x => x.id === who);
      if (a && sc.particles) sc.particles.emit('heart', a.x, a.y - a.dispH * 0.8, 1);
    } else if (pts < 0 && !quiet) {
      UI.toast(`${CHARACTERS[who].name} seems hurt.`, 'icon_heart', 'bad');
    }
  }

  async talk(who, opts = {}) {
    // story conversation takes priority
    const played = await this.trigger('talk', { who, place: opts.place });
    if (!played) {
      const node = this.pickChatter(who);
      await this.play(node);
    }
    if (G.talked[who] !== G.day) {
      G.talked[who] = G.day;
      G.today.talked.push(who);
      this.addHearts(who, 12, true);
    }
  }

  pickChatter(who) {
    const pool = (CHATTER[who] || []).filter(c => {
      if (c.min !== undefined && heartsOf(who) < c.min) return false;
      if (c.max !== undefined && heartsOf(who) > c.max) return false;
      if (c.from && G.day < c.from) return false;
      if (c.until && G.day > c.until) return false;
      if (c.place && c.place !== (this.app.scene && this.app.scene.name)) return false;
      if (c.cond && !this.runner.eval(c.cond)) return false;
      return true;
    });
    if (!pool.length) return 'chat_generic';
    const rng = makeRng(G.rngSeed + G.day * 31 + who.length * 7 + (G.vars['chat_' + who] || 0));
    G.vars['chat_' + who] = (G.vars['chat_' + who] || 0) + 1;
    // prefer lines not heard recently
    const fresh = pool.filter(c => !G.seen[c.node] || G.day - G.seen[c.node] > 4);
    return rng.pick(fresh.length ? fresh : pool).node;
  }

  async giftTo(who) {
    if (G.gifted[who] === G.day) { UI.toast(`You already gave ${CHARACTERS[who].name} something today.`, 'icon_heart'); return; }
    const item = await this.app.menus.pickGift(who);
    if (!item) return;
    const it = ITEMS[item];
    const c = CHARACTERS[who];
    takeItem(item, 1);
    G.gifted[who] = G.day;
    G.stats.gifts++;
    const tags = it.tags || [item];
    let react = 'neutral', pts = 12;
    if (tags.some(t => (c.loves || []).includes(t))) { react = 'love'; pts = 55; }
    else if (tags.some(t => (c.likes || []).includes(t))) { react = 'like'; pts = 30; }
    else if (tags.some(t => (c.dislikes || []).includes(t))) { react = 'dislike'; pts = -12; }
    G.vars.lastGift = it.name;
    if (react === 'love' || react === 'like') {
      const k = 'knownLoves_' + who;
      G.vars[k] = G.vars[k] || [];
      for (const t of tags) if ((c.loves || []).includes(t) && !G.vars[k].includes(t)) G.vars[k].push(t);
    }
    const specific = `gift_${who}_${item}`;
    await this.play(hasNode(specific) ? specific : `gift_${who}_${react}`);
    this.addHearts(who, pts);
  }

  // ------------------------------------------------------------------ commands
  async command(name, args, runner) {
    const a = splitArgs(args);
    const app = this.app;
    const scene = app.scene;
    switch (name) {
      case 'rel': this.addHearts(a[0], +a[1]); break;
      case 'money': {
        const n = +a[0]; addMoney(n, a.slice(1).join(' ') || (n >= 0 ? 'Received' : 'Paid'));
        Sound.play(n >= 0 ? 'coins' : 'coin', { vol: 0.7 });
        UI.toast(`${n >= 0 ? '+' : '-'}$${Math.abs(n)}`, 'icon_coin', n < 0 ? 'bad' : '');
        app.hud.refresh(); break;
      }
      case 'community': {
        const n = +a[0]; addStat('community', n);
        if (n > 0) UI.toast(`Community spirit +${n}`, 'icon_home'); else if (n < 0) UI.toast(`Community spirit ${n}`, 'icon_home', 'bad');
        break;
      }
      case 'petition': G.petition = Math.max(0, G.petition + (+a[0])); if (+a[0] > 0) UI.toast(`+${a[0]} petition signatures (${G.petition})`, 'icon_journal'); break;
      case 'rep': addStat('reputation', +a[0]); break;
      case 'energy': addStat('energy', +a[0]); app.hud.refresh(); break;
      case 'flag': G.flags[a[0]] = a[1] === undefined ? true : parseValue(a[1]); break;
      case 'unflag': delete G.flags[a[0]]; break;
      case 'set': G.vars[a[0]] = parseValue(a[a[1] === '=' ? 2 : 1]); break;
      case 'add': G.vars[a[0]] = (G.vars[a[0]] || 0) + (+a[1]); break;
      case 'give': {
        const n = +(a[1] || 1); giveItem(a[0], n);
        const it = ITEMS[a[0]]; if (it) UI.toast(`Got ${it.name}${n > 1 ? ' ×' + n : ''}`, it.sprite);
        Sound.play('pop', { vol: 0.6 }); break;
      }
      case 'take': takeItem(a[0], +(a[1] || 1)); break;
      case 'decor': if (!G.decor.includes(a[0])) G.decor.push(a[0]); UI.toast(`New decor: ${a.slice(1).join(' ') || a[0]}`, 'icon_home'); break;
      case 'place': G.placed[a[0]] = a[1]; if (!G.decor.includes(a[1])) G.decor.push(a[1]); break;
      case 'record': if (!G.collections.records.includes(a[0])) { G.collections.records.push(a[0]); UI.toast('New record for the collection!', 'item_vinyl'); } break;
      case 'upgrade': if (!G.upgrades.includes(a[0])) G.upgrades.push(a[0]); break;
      case 'skill': G.skills[a[0]] = Math.min(5, (G.skills[a[0]] || 0) + (+(a[1] || 1))); UI.toast(`${cap(a[0])} skill ${G.skills[a[0]]}`, 'icon_star'); Sound.play('sparkle', { vol: 0.6 }); break;
      case 'sfx': Sound.play(a[0], { vol: a[1] ? +a[1] : 0.9 }); break;
      case 'music': Sound.music(a[0] === 'none' ? null : a[0], a[1] ? +a[1] : 2); this.musicOverride = a[0]; break;
      case 'resume_music': this.musicOverride = null; app.day.sceneMusic(); break;
      case 'wait': await tweens.wait(+a[0] || 0.5); break;
      case 'visit': if (scene && scene.spawnVisitor) { scene.spawnVisitor(a[0], { order: a.includes('order') ? true : null, stay: +(a[a.indexOf('stay') + 1]) || 90, to: a.includes('counter') ? { x: 348, y: 620 } : undefined }); await tweens.wait(0.2); } break;
      case 'await_arrival': if (scene && scene.visitors) { const v = scene.visitors.get(a[0]); if (v) await v.actor.walkTo(v.actor.target ? v.actor.target.x : v.actor.x, v.actor.target ? v.actor.target.y : v.actor.y); } break;
      case 'leave': if (scene && scene.visitors) { const v = scene.visitors.get(a[0]); if (v) scene.visitorLeave(v); } break;
      case 'pin': if (scene && scene.visitors) { const v = scene.visitors.get(a[0]); if (v) v.pinned = a[1] !== 'off'; } break;
      case 'stay': if (scene && scene.visitors) { const v = scene.visitors.get(a[0]); if (v) v.leaveAt = G.time + (+a[1] || 60); } break;
      case 'emote': { const act = scene && scene.actors && scene.actors.find(x => x.id === a[0]); if (act) act.say(a[1], +(a[2] || 2.5)); break; }
      case 'pose': { const act = scene && scene.actors && scene.actors.find(x => x.id === a[0]); if (act) act.setPose(a[1], +(a[2] || 1.5)); break; }
      case 'shake': if (app.r) { app.r.cam.shake = +(a[0] || 6); setTimeout(() => { app.r.cam.shake = 0; }, (+(a[1] || 0.5)) * 1000); } vibrate(60); break;
      case 'letter': await app.menus.showLetter(a[0]); break;
      case 'goal': app.hud.setGoal(args.replace(/^"|"$/g, '')); break;
      case 'toast': UI.toast(args.replace(/^"|"$/g, ''), null); break;
      case 'unlock': G.flags['unlocked_' + a[0]] = true; if (a[0] === 'map') G.flags.map_unlocked = true; app.hud.setMode(app.hud.mode); break;
      case 'weather': G.weather = a[0]; if (scene && scene.updateSound) scene.updateSound(); app.hud.refresh(); break;
      case 'time': {
        if (a[0].startsWith('+')) G.time += +a[0].slice(1);
        else { const [h, m] = a[0].split(':').map(Number); G.time = h * 60 + (m || 0); }
        app.hud.refresh(); break;
      }
      case 'diary': G.today.notes.push(args.replace(/^"|"$/g, '')); break;
      case 'order': if (app.laundry) app.laundry.createOrder({ who: a[0], name: CHARACTERS[a[0]] ? CHARACTERS[a[0]].name : a[0], service: a[1] || 'wash_fold' }); break;
      case 'policy': G.policies[a[0]] = parseValue(a[1]); break;
      case 'power': if (scene) scene.powerOut = a[0] === 'off'; break;
      case 'cat': G.flags.cat_in_shop = a[0] !== 'off'; break;
      case 'fade': if (a[0] === 'out') await UI.fadeOut(+(a[1] || 0.5) * 1000); else await UI.fadeIn(+(a[1] || 0.5) * 1000); break;
      case 'card': { const parts = args.match(/"[^"]*"/g) || []; await UI.dayCard(...parts.map(s => s.slice(1, -1))); break; }
      case 'hud': app.hud.show(a[0] !== 'off'); break;
      case 'portraits_clear': Dialogue.clearPortraits(); break;
      case 'call': if (app.calls[a[0]]) { const r = await app.calls[a[0]](...a.slice(1)); if (r && r.goto) return r; } break;
      case 'jump': return { goto: a[0] };
      case 'ending': await app.day.ending(a[0]); return { stop: true };
      case 'scene': await app.day.cutTo(a[0], a[1]); break;
      case 'phase': G.phase = a[0]; break;
      default: console.warn('[story] unknown command', name, args);
    }
    return null;
  }
}

function splitArgs(s) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(s || ''))) out.push(m[1] !== undefined ? m[1] : m[2]);
  return out;
}
function parseValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== undefined && v !== '' && !isNaN(+v)) return +v;
  return v;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export { hasItem };
