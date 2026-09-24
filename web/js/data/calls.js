// Custom logic that story scripts invoke with <<call name args>>.
import { G, heartsOf, FRIENDS, addStat } from '../game/state.js';
import { Save } from '../game/save.js';
import { UI } from '../ui/ui.js';
import { tweens } from '../engine/tween.js';

export const CALLS = {
  // Spawn friends into the laundromat for group scenes.
  gather(app, ...who) {
    const sc = app.scene;
    if (!sc || !sc.spawnVisitor) return;
    const spots = { walt: { x: 1470, y: 652 }, june: { x: 1300, y: 668 }, maya: { x: 1610, y: 670 }, remy: { x: 1150, y: 680 } };
    for (const w of (who.length ? who : FRIENDS)) {
      if (!app.story.canVisit(w) && !(w === 'maya' && G.day <= 28)) continue;
      const v = sc.spawnVisitor(w, { stay: 600, to: spots[w] });
      v.pinned = true;
    }
    return tweens.wait(1.6);
  },

  dismiss(app) {
    const sc = app.scene;
    if (!sc || !sc.visitors) return;
    for (const v of sc.visitors.values()) { v.pinned = false; sc.visitorLeave(v); }
  },

  // City inspection on day 19.
  inspection(app) {
    const broken = G.machines.filter(m => m.broken).length;
    const clean = G.cleanliness;
    G.vars.inspectBroken = broken;
    G.vars.inspectClean = Math.round(clean);
    if (broken === 0 && clean >= 45) return { goto: 'inspection_pass' };
    return { goto: 'inspection_fail' };
  },

  // Who will speak at the hearing, and does it work?
  hearing(app) {
    const speakers = [];
    if (heartsOf('june') >= 5 || G.flags.june_testifies) speakers.push('june');
    if (heartsOf('walt') >= 5 || G.flags.walt_testifies) speakers.push('walt');
    if (heartsOf('remy') >= 5 && G.flags.commission_refused) speakers.push('remy');
    if (heartsOf('maya') >= 5 && G.flags.maya_track) speakers.push('maya');
    G.vars.speakers = speakers.length;
    for (const s of speakers) G.flags['speaks_' + s] = true;
    let score = speakers.length * 18 + Math.min(G.petition, 200) * 0.22 + G.community * 0.35;
    if (G.flags.poster_deal) score -= 12;
    if (G.flags.tenants_meetings) score += 8;
    if (G.flags.storm_open_all_night) score += 6;
    G.vars.hearingScore = Math.round(score);
    const won = score >= 85;
    G.flags.hearing_done = true;
    G.flags[won ? 'hearing_won' : 'hearing_lost'] = true;
    return null;
  },

  // Snapshot before the final decision so "sell" can be undone from the title screen.
  checkpoint(app) {
    G.flags.checkpoint = true;
    Save.save();
    try { localStorage.setItem('lastlaundromat.checkpoint', JSON.stringify(G)); } catch (e) { /* noop */ }
  },

  // Decide which "keep" ending the player earned.
  keepEnding(app) {
    const friends = FRIENDS.filter(w => heartsOf(w) >= 6).length;
    const commons = G.flags.hearing_won && G.community >= 65 && G.money >= 0 && friends >= 2;
    return { goto: commons ? 'ending_commons' : 'ending_holdout' };
  },

  ensureBoard(app) {
    if (!Object.values(G.placed).includes('bulletin_board')) {
      if (!G.decor.includes('bulletin_board')) G.decor.push('bulletin_board');
      G.placed.wall_b = 'bulletin_board';
      const sc = app.scene; if (sc && sc.buildEntities) sc.buildEntities();
      UI.toast('June hung a community board on the wall.', 'furn_bulletin_board');
    }
  },

  crowd(app, n) {
    addStat('community', +n || 5);
  },

  knownLove(app, who, tag) {
    const k = 'knownLoves_' + who;
    G.vars[k] = G.vars[k] || [];
    if (!G.vars[k].includes(tag)) G.vars[k].push(tag);
  },
};
