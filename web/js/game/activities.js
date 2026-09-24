// Things to do at home and around the neighbourhood (hobbies, errands, collectibles).
import { G, addStat, giveItem, takeItem, addMoney, isSunday, weekday, heartsOf, sundayOpen } from './state.js';
import { UI } from '../ui/ui.js';
import { Sound } from '../engine/audio.js';
import { tweens } from '../engine/tween.js';
import { rand, money, el } from '../engine/util.js';
import { ITEMS } from '../data/items.js';
import { ROSA_JOURNAL, READING, WINDOW_LINES } from '../data/flavor.js';
import { formatText } from '../ui/dialogue.js';

export class Activities {
  constructor(app) { this.app = app; }

  scene() { return this.app.scene; }
  pose(p, s) { const sc = this.scene(); if (sc && sc.player) sc.player.setPose(p, s); }
  spend(min) { this.app.day.spend(min); }

  flash() {
    const f = el('div', 'fader'); f.style.background = '#fff'; f.style.opacity = '0.9'; f.style.transition = 'opacity .5s';
    document.getElementById('ui').appendChild(f);
    requestAnimationFrame(() => { f.style.opacity = '0'; });
    setTimeout(() => f.remove(), 600);
  }

  async run(act, o = {}) {
    const fn = this['a_' + act];
    if (!fn) { console.warn('no activity', act); return; }
    const played = await this.app.story.trigger('act', { act, loc: o.loc });
    if (played && o.storyOnly) return;
    await fn.call(this, o);
    this.app.hud.refresh();
  }

  // ------------------------------------------------------------------ home
  async a_door() {
    if (G.phase === 'morning') {
      if (isSunday(G.day) && !sundayOpen()) {
        const go = await UI.confirm('Sunday', 'The shop is closed on Sundays. Head out into the neighbourhood?', 'Go out', 'Stay in');
        if (go) { G.phase = 'evening'; this.app.day.openMap(); }
        return;
      }
      if (G.day === 1 && !G.flags.ev_d1_wake_done) { /* tutorial gates handled by story */ }
      Sound.play('door_open', { vol: 0.7 });
      await this.app.day.startShift();
      return;
    }
    if (!G.flags.map_unlocked) { await this.app.go('laundromat', { from: 'backdoor' }); return; }
    const choice = await UI.notice('<h2>Head out?</h2><p style="text-align:center">Go down to the shop, or out into the neighbourhood.</p>',
      { buttons: [{ label: 'Stay', value: 0 }, { label: 'The shop', value: 1 }, { label: 'Neighbourhood map', value: 2, primary: true }], dismissValue: 0 });
    if (choice === 1) { G.location = 'laundromat'; await this.app.go('laundromat', { from: 'backdoor' }); await this.app.story.trigger('location', { loc: 'laundromat' }); }
    if (choice === 2) this.app.day.openMap();
  }

  async a_sleep() {
    if (G.phase === 'morning') { UI.toast('You just got up! The day is waiting.', 'icon_home'); return; }
    if (G.time < 19 * 60 && G.phase !== 'night') {
      const ok = await UI.confirm('Turn in early?', 'The evening is still young. Sleep now and end the day?', 'Sleep', 'Not yet');
      if (!ok) return;
    }
    this.pose('stretch', 1.2);
    await tweens.wait(0.8);
    await this.app.day.sleep();
  }

  async a_tea() {
    if (!takeItem('tea', 1)) { UI.toast('The tea tin is empty. (Supplies catalog: tea)', 'item_teacup', 'bad'); return; }
    this.pose('reach', 1.2);
    Sound.play('kettle', { vol: 0.55 });
    await tweens.wait(1.4);
    Sound.play('cup', { vol: 0.8 });
    const sc = this.scene(); if (sc) sc.particles.emit('steam', 250, 236, 10);
    addStat('energy', 15);
    this.spend(15);
    UI.toast(rand.pick(['Strong and sweet, the way Rosa made it.', 'A mug of tea. The rain can wait.', 'Steam on the window, warmth in your hands.']) + ' +energy', 'item_teacup');
  }

  async a_pet_cat() {
    const sc = this.scene();
    if (G.vars.pettedCat === G.day) { Sound.play('meow2', { vol: 0.5 }); UI.toast('Biscuit opens one eye, judges you, and goes back to sleep.', 'item_cat_bed'); return; }
    G.vars.pettedCat = G.day;
    this.pose('load', 1.6);
    Sound.play('purr', { vol: 0.8 });
    if (sc) sc.particles.emit('heart', 880, 620, 3);
    addStat('energy', 6);
    await tweens.wait(1.2);
    Sound.play('meow', { vol: 0.6 });
    UI.toast(rand.pick(['Biscuit purrs like a tiny dryer.', 'Biscuit headbutts your hand. Approved.', 'A warm, orange loaf of cat. +energy']), 'item_cat_bed');
  }

  async a_sketch(o = {}) {
    if (G.energy < 8) { UI.toast('Too tired to hold a pencil straight.', 'item_sketchbook', 'bad'); return; }
    this.pose('load', 2.2);
    Sound.play('pencil', { vol: 0.8 });
    await tweens.wait(2.2);
    const title = o.title || rand.pick(['Rosa\'s window', 'Biscuit, asleep', 'Rain on the rooftops', 'The kettle']);
    G.collections.sketches.push({ title, day: G.day });
    giveItem('sketch', 1);
    G.vars.sketches = (G.vars.sketches || 0) + 1;
    if (G.vars.sketches % 3 === 0 && G.skills.sketch < 5) { G.skills.sketch++; UI.toast(`Sketching skill ${G.skills.sketch}!`, 'icon_star'); Sound.play('sparkle', { vol: 0.6 }); }
    addStat('energy', 3);
    this.spend(30);
    UI.toast(`You sketched "${title}".`, 'item_sketchbook');
    await this.app.story.trigger('sketched', { title });
  }

  async a_knit() {
    if (!G.flags.learned_knit) { UI.toast('Rosa\'s yarn basket. You never learned to knit… maybe someone could teach you.', 'item_yarn_basket'); return; }
    if (G.energy < 8) { UI.toast('Too tired to count stitches.', 'item_yarn_basket', 'bad'); return; }
    this.pose('load', 2.4);
    Sound.play('knitting', { vol: 0.8 });
    await tweens.wait(2.4);
    G.vars.knitProgress = (G.vars.knitProgress || 0) + 1 + (G.skills.knit >= 3 ? 1 : 0);
    addStat('energy', 3);
    this.spend(45);
    if (G.vars.knitProgress >= 2) {
      G.vars.knitProgress = 0;
      giveItem('scarf', 1);
      G.vars.scarves = (G.vars.scarves || 0) + 1;
      if (G.vars.scarves % 2 === 0 && G.skills.knit < 5) { G.skills.knit++; UI.toast(`Knitting skill ${G.skills.knit}!`, 'icon_star'); }
      UI.toast('You finished a scarf! Lumpy in places, warm everywhere.', 'item_yarn_basket');
    } else UI.toast('Half a scarf. Knit one, purl one, wonder about everything.', 'item_yarn_basket');
  }

  async a_read() {
    this.pose('idle', 1);
    Sound.play('page', { vol: 0.7 });
    addStat('energy', 7);
    this.spend(30);
    UI.toast(rand.pick(READING), 'item_novel', '', 4200);
  }

  async a_window() {
    UI.toast(WINDOW_LINES[G.weather] ? rand.pick(WINDOW_LINES[G.weather]) : 'Linden Street, going about its business.', 'icon_home', '', 3800);
  }

  async a_water(o = {}) {
    if (o.loc === 'garden') return this.gardenWater();
    if (G.vars.watered === G.day) { UI.toast('The plants are happy. Don\'t drown them.', 'item_pothos'); return; }
    G.vars.watered = G.day;
    this.pose('reach', 1.0);
    Sound.play('drop', { vol: 0.6 });
    await tweens.wait(1.0);
    G.vars.plantGrowth = (G.vars.plantGrowth || 0) + 1;
    addStat('energy', 2);
    this.spend(10);
    if (G.vars.plantGrowth % 3 === 0) { giveItem('cutting', 1); UI.toast('The pothos put out a new vine — you pot a cutting.', 'item_pothos'); }
    else UI.toast('You water the plants. The pothos looks smug.', 'item_pothos');
  }

  async a_rosa_journal() {
    const unlocked = ROSA_JOURNAL.filter(e => G.day >= e.day && (!e.flag || G.flags[e.flag]));
    if (!unlocked.length) return;
    const unread = unlocked.find(e => !G.flags['rj_' + e.id]);
    const e = unread || unlocked[unlocked.length - 1];
    G.flags['rj_' + e.id] = true;
    Sound.play('book_open', { vol: 0.7 });
    await UI.notice(`<h2>Rosa's journal</h2><p class="letter">${e.date}</p><div class="letter">${formatText(e.text)}</div>`, { ok: 'Close the journal', sound: 'page' });
    if (unread) { addStat('energy', 2); this.spend(15); }
    else UI.toast('That\'s the last page Rosa wrote… that you\'ve reached so far.', 'item_journal');
  }

  // ------------------------------------------------------------------ neighbourhood
  async a_enter_shop() {
    G.location = 'laundromat';
    await this.app.go('laundromat', { from: 'front' });
    await this.app.story.trigger('location', { loc: 'laundromat' });
  }

  async a_cafe() {
    if (G.time >= 21 * 60) { UI.toast('The Corner Cup is closed. Chairs up on the tables.', 'item_coffee_mug'); return; }
    const buy = await UI.confirm('The Corner Cup', `A coffee to go? (${money(4)}) — or a tea, but don't tell Remy.`, 'Buy coffee', 'Just looking');
    if (!buy) return;
    if (G.money < 4) { UI.toast('Not enough cash.', 'icon_coin', 'bad'); return; }
    addMoney(-4, 'Coffee at the Corner Cup');
    giveItem('coffee', 1);
    Sound.play('cup', { vol: 0.8 });
    addStat('energy', 6);
    this.spend(10);
    UI.toast('Coffee in hand (+1 to your bag). Warm, strong, a little heart in the foam.', 'item_coffee_mug');
  }

  async a_alder() { UI.toast(G.flags.alder_sold ? 'Eviction notices taped inside the lobby door. Somebody drew a frowny face on one.' : 'The Alder Arms. June\'s lived here for forty-four years.', 'icon_home', '', 3800); }

  async a_bodega() {
    if (G.flags.bodega_closed) { UI.toast('Delgado\'s is dark. "FOR LEASE." Thirty-one years, and then a paper sign.', 'icon_home', 'bad', 3800); return; }
    if (G.time >= 21 * 60) { UI.toast('Luis is pulling the shutter down. "Mañana, mija!"', 'icon_home'); return; }
    const buy = await UI.confirm("Delgado's", `Luis waves you in. Flowers from the bucket by the door? (${money(6)})`, 'Buy flowers', 'Just saying hi');
    if (buy) {
      if (G.money < 6) { UI.toast('Not enough cash.', 'icon_coin', 'bad'); return; }
      addMoney(-6, "Flowers from Delgado's"); giveItem('flowers', 1); Sound.play('coins', { vol: 0.6 });
      UI.toast('Marigolds and daisies, wrapped in yesterday\'s paper.', 'decor_flower_vase');
    } else UI.toast('Luis tells you about his granddaughter, the Mets, and the rent. Mostly the rent.', 'icon_speech', '', 3600);
    this.spend(10);
  }

  async a_photo(o = {}) {
    if (!G.flags.has_camera) { UI.toast('A good view. If only you had a camera…', 'item_camera'); return; }
    if (G.vars['photo_' + (o.id || o.title) + G.day]) { UI.toast('You already took a photo here today.', 'item_camera'); return; }
    G.vars['photo_' + (o.id || o.title) + G.day] = 1;
    this.pose('reach', 0.8);
    await tweens.wait(0.5);
    Sound.play('camera', { vol: 0.9 });
    this.flash();
    const tod = G.time >= 20 * 60 ? 'at night' : G.time >= 17 * 60 ? 'at dusk' : G.phase === 'morning' ? 'in the morning' : 'by day';
    const wx = { rain: 'in the rain', storm: 'in a storm', cloudy: 'under grey skies', clear: '' }[G.weather];
    const title = `${o.title || 'Somewhere'} ${tod}${wx ? ', ' + wx : ''}`;
    const kind = o.photo === 'photo_night' && G.time < 19 * 60 ? 'photo' : (o.photo || 'photo');
    giveItem(kind, 1);
    if (!G.collections.photos.some(p => p.title === title)) G.collections.photos.push({ title, day: G.day });
    G.vars.photos = (G.vars.photos || 0) + 1;
    if (G.vars.photos % 3 === 0 && G.skills.photo < 5) { G.skills.photo++; UI.toast(`Photography skill ${G.skills.photo}!`, 'icon_star'); }
    this.spend(15);
    UI.toast(`Photo: "${title}"`, 'item_camera', '', 3200);
  }

  async a_market() {
    this.app.menus.openCatalog('market');
    this.spend(20);
  }

  async a_pigeons() {
    const sc = this.scene();
    Sound.play('pigeons', { vol: 0.6 });
    if (sc && sc.pigeons) for (const pg of sc.pigeons) { pg.hop = 0; }
    this.pose('load', 1.0);
    await tweens.wait(1.0);
    if (G.vars.pigeons === G.day) { UI.toast('The pigeons have eaten. They are now simply loitering.', 'icon_star'); return; }
    G.vars.pigeons = G.day;
    addStat('energy', 3);
    this.spend(15);
    const walt = sc && sc.npcs && sc.npcs.get('walt');
    if (walt) { this.app.story.addHearts('walt', 8); UI.toast('Walt grunts. "Not too much. They get lazy." He tosses a crumb anyway.', 'icon_heart', '', 3600); }
    else UI.toast('You scatter some crumbs. Instant popularity.', 'icon_star');
  }

  async gardenWater() {
    if (G.vars.gardenWater === G.day) { UI.toast('The beds are soaked. The squash is practically swimming.', 'item_pothos'); return; }
    if (G.energy < 10) { UI.toast('Too tired to haul watering cans.', 'item_pothos', 'bad'); return; }
    G.vars.gardenWater = G.day;
    this.pose('reach', 1.8);
    Sound.play('drop', { vol: 0.6 });
    await tweens.wait(1.8);
    addStat('energy', -4);
    addStat('community', 1);
    this.spend(25);
    const sc = this.scene();
    if (sc && sc.npcs && sc.npcs.get('june')) { this.app.story.addHearts('june', 14); UI.toast('June beams. "You have your grandmother\'s arms. Rosa could carry four cans."', 'icon_heart', '', 3600); }
    else UI.toast('You water the raised beds. The tomatoes look grateful. (+community)', 'item_pothos');
  }

  async a_flowers() {
    if (G.vars.flowers === G.day) { UI.toast('Leave some for the bees.', 'decor_flower_vase'); return; }
    if (!G.flags.met_june) { UI.toast('These are someone\'s flowers. Better ask first.', 'decor_flower_vase'); return; }
    G.vars.flowers = G.day;
    this.pose('load', 1.0);
    await tweens.wait(1.0);
    giveItem('flowers', 1);
    this.spend(10);
    UI.toast('A handful of marigolds and daisies. (June said you could.)', 'decor_flower_vase');
  }
}

export { heartsOf, weekday, ITEMS };
