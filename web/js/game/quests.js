// Errands (side missions) and romance: state, script commands and the checks that notice progress.
import { G, addMoney, addStat, giveItem } from './state.js';
import { QUESTS } from '../data/quests.js';
import { ROMANCE } from '../data/romance.js';
import { CHARACTERS, faceOrIcon } from '../data/characters.js';
import { ITEMS } from '../data/items.js';
import { UI } from '../ui/ui.js';
import { Sound } from '../engine/audio.js';

// G.quests[id] = { state: 'active' | 'later' | 'done', day, at: {counter: value when started}, steps: n done, ready }
export class Quests {
  constructor(app) { this.app = app; this.t = 0; }

  get(id) { return (G.quests || (G.quests = {}))[id] || null; }

  // ------------------------------------------------------------------ helpers for script expressions
  helpers() {
    const q = id => this.get(id);
    return {
      questNew: id => { const s = q(id); return !s || (s.state === 'later' && G.day - s.day >= 2); },
      questActive: id => { const s = q(id); return !!s && s.state === 'active'; },
      questReady: id => { const s = q(id); return !!s && s.state === 'active' && this.stepsDone(id) === QUESTS[id].steps.length; },
      questDone: id => { const s = q(id); return !!s && s.state === 'done'; },
      gained: (id, key) => (G.vars[key] || 0) - (((q(id) || {}).at || {})[key] || 0),
      gave: (who, item, id) => { const d = G.vars['gave_' + who + '_' + item]; const s = q(id); return !!d && !!s && d >= s.day; },
      romanceOpen: who => !G.flags['spark_' + who] && !G.flags['friend_' + who] && !G.flags.partner,
    };
  }

  stepsDone(id) {
    const def = QUESTS[id];
    const run = this.app.story.runner;
    let n = 0;
    for (const st of def.steps) { if (run.eval(st.done)) n++; else break; }
    return n;
  }

  // ------------------------------------------------------------------ <<quest start|later|done id>>
  command(verb, id) {
    const def = QUESTS[id];
    if (!def) { console.warn('[quests] unknown quest', id); return; }
    G.quests = G.quests || {};
    if (verb === 'start') {
      const at = {};
      for (const k of def.track || []) at[k] = G.vars[k] || 0;
      G.quests[id] = { state: 'active', day: G.day, at, steps: 0 };
      G.quests[id].steps = this.stepsDone(id);
      Sound.play('sparkle', { vol: 0.5 });
      UI.toast(`New errand: ${def.title}`, def.icon, '', 3200);
    } else if (verb === 'later') {
      G.quests[id] = { state: 'later', day: G.day };
    } else if (verb === 'done') {
      const s = G.quests[id] || {};
      G.quests[id] = Object.assign(s, { state: 'done', doneDay: G.day });
      this.reward(id, def.reward || {});
    }
  }

  reward(id, r) {
    const def = QUESTS[id];
    const story = this.app.story;
    if (r.money) addMoney(r.money, `Errand: ${def.title}`);
    if (r.hearts && CHARACTERS[def.giver] && def.giver !== 'biscuit') story.addHearts(def.giver, r.hearts);
    if (r.community) addStat('community', r.community);
    if (r.rep) addStat('reputation', r.rep);
    if (r.skill) G.skills[r.skill] = Math.min(5, (G.skills[r.skill] || 0) + 1);
    if (r.flag) G.flags[r.flag] = true;
    for (const [item, n] of Object.entries(r.items || {})) giveItem(item, n);
    if (r.record && !G.collections.records.includes(r.record)) G.collections.records.push(r.record);
    G.stats.errands = (G.stats.errands || 0) + 1;
    Sound.play('jingle_day', { vol: 0.55 });
    const parts = [r.money ? `+$${r.money}` : null, ...Object.entries(r.items || {}).map(([k, n]) => `${ITEMS[k] ? ITEMS[k].name : k}${n > 1 ? ' ×' + n : ''}`)].filter(Boolean);
    UI.toast(`Errand done: ${def.title}${parts.length ? ' — ' + parts.join(', ') : ''}`, def.icon, 'heart', 4200);
    G.today.notes.push(`Finished an errand: ${def.title}.`);
    this.app.hud.refresh();
  }

  // Called about once a second while the game runs: tick off steps as they happen.
  update(dt) {
    this.t += dt;
    if (this.t < 1) return;
    this.t = 0;
    if (!G.quests || this.app.paused()) return;
    for (const [id, s] of Object.entries(G.quests)) {
      if (s.state !== 'active' || !QUESTS[id]) continue;
      const def = QUESTS[id];
      const n = this.stepsDone(id);
      if (n > (s.steps || 0)) {
        s.steps = n;
        const who = CHARACTERS[def.giver];
        if (n >= def.steps.length) {
          if (!s.ready) {
            s.ready = true;
            Sound.play('sparkle', { vol: 0.6 });
            UI.toast(`Errand ready: ${def.title} — ${def.giver === 'biscuit' ? 'go and see Biscuit' : 'tell ' + (who ? who.name : 'them')}.`, faceOrIcon(def.giver) || def.icon, '', 4200);
          }
        } else UI.toast(`Errand: ${def.title} ✓ ${def.steps[n - 1].text.replace(/ \(.*\)$/, '')}`, def.icon, '', 3200);
      }
    }
  }

  // For the journal: progress text of a counted step ("2 / 3").
  progress(id, step) {
    if (!step.count) return '';
    const [key, of] = step.count;
    const have = Math.max(0, Math.min(of, this.helpers().gained(id, key)));
    return ` (${have}/${of})`;
  }

  // ------------------------------------------------------------------ <<romance who verb>>
  romance(who, verb) {
    const R = ROMANCE[who];
    const c = CHARACTERS[who];
    if (!R || !c) { console.warn('[romance] unknown', who); return; }
    const story = this.app.story;
    switch (verb) {
      case 'spark':
        G.flags['spark_' + who] = true;
        story.addHearts(who, 30);
        Sound.play('heart', { vol: 0.8 });
        G.today.notes.push(`Something changed with ${c.name} today. Something good, I think.`);
        break;
      case 'friend':
        G.flags['friend_' + who] = true;
        story.addHearts(who, 15, true);
        break;
      case 'invite': {
        const day = G.time < 19 * 60 ? G.day : G.day + 1;
        G.vars['date_' + who] = day;
        const when = day === G.day ? 'tonight' : 'tomorrow evening';
        G.goal = `Meet ${c.name} at ${R.placeName} ${when}, after 5 pm.`;
        this.app.hud.setGoal(G.goal);
        UI.toast(`A date with ${c.name}: ${R.placeName}, ${when}.`, 'icon_heart', 'heart', 3600);
        break;
      }
      case 'later':
        G.vars['rom_later_' + who] = G.day;
        break;
      case 'dated':
        G.flags['dated_' + who] = true;
        G.vars['date_' + who] = 0;
        G.vars['dates_' + who] = (G.vars['dates_' + who] || 0) + 1;
        if (G.goal && G.goal.includes(c.name)) { G.goal = ''; this.app.hud.setGoal(''); }
        story.addHearts(who, 60);
        G.today.notes.push(`A date with ${c.name}. I'm still smiling, writing this.`);
        break;
      case 'missed':
        G.vars['date_' + who] = 0;
        G.vars['rom_later_' + who] = G.day;
        if (G.goal && G.goal.includes(c.name)) { G.goal = ''; this.app.hud.setGoal(''); }
        break;
      case 'partner':
        G.flags.partner = who;
        G.flags['partner_' + who] = true;
        G.flags['rom_' + who + '_asked'] = true;
        story.addHearts(who, 80);
        Sound.play('jingle_week', { vol: 0.6 });
        UI.toast(`You and ${c.name} ♥`, 'icon_heart', 'heart', 4000);
        break;
      case 'slow':
        G.vars['rom_slow_' + who] = G.day;      // they'll ask again in a few days
        break;
      default: console.warn('[romance] unknown step', verb);
    }
  }

  // A partner sometimes leaves coffee on the counter in the morning.
  morningPerks() {
    const p = G.flags.partner;
    if (p && CHARACTERS[p] && G.day % 3 === 1 && (G.day - 1) % 7 !== 6) {
      addStat('energy', 10);
      UI.toast(`${CHARACTERS[p].name} left a coffee by the door for you, with a note: "Go get 'em." +energy`, faceOrIcon(p) || 'item_coffee_mug', 'heart', 4200);
    }
    if (G.flags.biscuit_bond) addStat('energy', 5);
  }

  // Romance status for the journal ("" if nothing).
  status(who) {
    if (G.flags.partner === who) return 'Together ♥';
    if (G.flags['dated_' + who]) return 'Dating';
    if (G.vars['date_' + who]) return 'Date planned';
    if (G.flags['spark_' + who]) return 'Sweet on you';
    return '';
  }
}
