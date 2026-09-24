// Writes the player's diary entry at the end of each day from what happened.
import { G, heartsOf, WEEKDAYS_LONG, weekday } from '../game/state.js';
import { CHARACTERS } from './characters.js';
import { makeRng } from '../engine/util.js';

export function writeDiary() {
  const t = G.today;
  const rng = makeRng(G.rngSeed + G.day * 977);
  const parts = [];
  const wx = { clear: 'Sunny', cloudy: 'Grey skies', rain: 'Rain all day', storm: 'What a storm' }[G.weather] || '';
  parts.push(`${WEEKDAYS_LONG[weekday(G.day)]}. ${wx}.`);
  if (t.orders) {
    const money = Math.round(t.income);
    parts.push(rng.pick([
      `${t.orders} drop-off${t.orders > 1 ? 's' : ''}, $${money} in the till.`,
      `Folded ${t.orders} load${t.orders > 1 ? 's' : ''} today. $${money} earned.`,
      `$${money} today, ${t.orders} order${t.orders > 1 ? 's' : ''}${t.late ? `, ${t.late} late (ugh)` : ''}.`,
    ]));
  } else if (weekday(G.day) === 6) parts.push('No shop today. Just me, the neighbourhood, and a lot of walking.');
  for (const n of t.notes) parts.push(n);
  const gained = Object.entries(t.hearts).filter(([, v]) => v >= 20).sort((a, b) => b[1] - a[1]);
  if (gained.length) {
    const [who] = gained[0];
    const name = CHARACTERS[who].name;
    const h = heartsOf(who);
    parts.push(rng.pick(h >= 6 ? [
      `${name} feels like family already.`, `I think ${name} might actually like me. Like, really.`, `Spent time with ${name}. The good kind of tired.`,
    ] : [
      `Talked with ${name}. I'm starting to get them.`, `${name} is growing on me. Abuela said they would.`, `Good moment with ${name} today.`,
    ]));
  }
  if (G.energy < 25) parts.push('I am so tired my bones are tired.');
  if (G.money < 50) parts.push('Money is… tight. Very tight.');
  if (G.cleanliness < 35) parts.push('The floor is a disgrace. Tomorrow: mop.');
  if (t.photos) parts.push('Took some photos. Abuela\'s camera still works.');
  parts.push(rng.pick(['Biscuit snored.', 'The machines hummed me to sleep.', 'Tomorrow, again.', 'Lights off. Lights on tomorrow.', '', '']));
  const text = parts.filter(Boolean).join(' ');
  G.diary.push({ day: G.day, text });
  if (G.diary.length > 60) G.diary.shift();
  return text;
}
