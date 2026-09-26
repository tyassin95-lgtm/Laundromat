// Characters: portraits (face_<id>_<expr>), in-world sprites, voices, gift tastes and routines.
// Heights are in virtual px for interiors; exteriors scale them by the scene's charScale.
// Art is optional: a character whose portrait isn't in the sprite manifest speaks with just a
// name plate, and one without an in-world sprite is heard (at the counter) rather than seen.
// Drop the files in (face_<portrait>_<expr>, npc_<name>) and they appear.
import { Assets } from '../engine/assets.js';

// The nine portraits every character sheet has (tools/import_character.py cuts them in this order).
export const EXPRS9 = ['smile', 'laugh', 'worried', 'thinking', 'tired', 'surprised', 'content', 'sad', 'sly'];

export const CHARACTERS = {
  me: {
    name: '{name}', portrait: 'player', side: 'left', voice: 1.12, color: '#3f6c74',
    exprs: ['neutral', 'laugh', 'worried', 'surprised', 'tired', 'thinking', 'smug', 'sad', 'wink'],
    defaultExpr: 'neutral',
  },
  walt: {
    name: 'Walt', full: 'Walt Szymanski', portrait: 'walt', side: 'right', voice: 0.72, color: '#b7773a',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_walt', h: 290, faces: 1,
    blurb: 'Retired machinist. Tuesdays and Fridays, 9 a.m. sharp, since 1981.',
    loves: ['scarf', 'coffee', 'photo_rosa', 'toolkit'], likes: ['tea', 'sketch', 'photo', 'lemon_bars', 'record'], dislikes: ['flowers'],
  },
  maya: {
    name: 'Maya', full: 'Maya Okafor', portrait: 'maya', side: 'right', voice: 1.25, color: '#d9a02e',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_maya', h: 272, faces: 1,
    blurb: 'Music student. Night shifts at the pharmacy. Headphones always on.',
    loves: ['record', 'photo_night', 'coffee'], likes: ['sketch', 'tea', 'lemon_bars', 'photo', 'scarf'], dislikes: ['knit_hat'],
  },
  june: {
    name: 'June', full: 'June Ito', portrait: 'june', side: 'right', voice: 1.02, color: '#c0562a',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_june', h: 252, faces: 1,
    blurb: 'Taught third grade for 38 years. Runs the community garden. Lives next door.',
    loves: ['flowers', 'cutting', 'scarf', 'photo_garden'], likes: ['tea', 'sketch', 'photo', 'record', 'lemon_bars'], dislikes: ['coffee'],
  },
  remy: {
    name: 'Remy', full: 'Remy Castillo', portrait: 'remy', side: 'right', voice: 1.18, color: '#d77a9a',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_remy', h: 268, faces: 1,
    blurb: 'Barista at the Corner Cup. Paints murals. Knows everyone on Linden Street.',
    loves: ['sketch', 'photo', 'spray_paint'], likes: ['record', 'coffee', 'scarf', 'lemon_bars'], dislikes: ['tea'],
  },

  // ---------------------------------------------------------------- neighbours
  // Regulars you get to know at the counter. Lighter friendships (5 hearts), their own small
  // stories, and a voice at the council hearing if they like you enough.
  delgado: {
    name: 'Luis', full: 'Luis Delgado', portrait: 'luis', side: 'right', voice: 0.8, color: '#5f7f3a',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_luis', h: 286, neighbour: true, icon: 'item_apron',
    blurb: 'Runs Delgado\'s Market across the street, the corner store his father opened thirty-one years ago. Calls everyone mija.',
    loves: ['coffee', 'record'], likes: ['photo', 'lemon_bars', 'tea', 'sketch'], dislikes: ['spray_paint'],
  },
  priya: {
    name: 'Priya', full: 'Priya Raman', portrait: 'priya', side: 'right', voice: 1.14, color: '#2f8a86',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_priya', h: 262, neighbour: true, icon: 'item_coffee_mug',
    blurb: 'Bakes the bread at Ferrante\'s on Alder Street, from two in the morning. Wants her aprons folded like presents.',
    loves: ['coffee', 'lemon_bars'], likes: ['tea', 'scarf', 'record'], dislikes: ['flowers'],
  },
  haddad: {
    name: 'Sami', full: 'Sami Haddad', portrait: 'haddad', side: 'right', voice: 0.98, color: '#7a4a86',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_haddad', h: 280, neighbour: true, icon: 'item_hamper',
    blurb: 'Grad student. Brings his grandmother\'s laundry down from Alder Arms 3C every week. Lavender softener only: her orders.',
    loves: ['flowers', 'cutting'], likes: ['tea', 'photo', 'scarf', 'lemon_bars'], dislikes: ['coffee'],
  },
  kai: {
    name: 'Kai', full: 'Kai', portrait: 'kai', side: 'right', voice: 1.22, color: '#3f7f86',
    exprs: EXPRS9, defaultExpr: 'smile',
    sprite: 'npc_kai', h: 266, neighbour: true, icon: 'item_drawstring_bag',
    blurb: 'Bike courier, always soaked. Investigating where the socks go.',
    loves: ['spray_paint', 'coffee'], likes: ['photo', 'sketch', 'record'], dislikes: ['tea'],
  },

  grant: { name: 'Grant Holloway', portrait: null, side: 'right', voice: 0.9, color: '#3b4a5c' },
  rosa: { name: 'Rosa', portrait: null, side: 'right', voice: 1.0, color: '#b3402f' },
  biscuit: { name: 'Biscuit', portrait: null, side: 'right', voice: 1.6, color: '#d9892e' },
};

export const FRIEND_IDS = ['walt', 'maya', 'june', 'remy'];
export const NEIGHBOUR_IDS = ['delgado', 'priya', 'haddad', 'kai'];

// Where each friend can be found, by phase. Days: 0 = Monday ... 6 = Sunday.
// shift: visits the laundromat at a given time (minutes) on listed weekdays.
// evening: location they hang out at in the evening on listed weekdays.
export const ROUTINES = {
  walt: {
    shift: [{ days: [1, 4], at: 9 * 60, stay: 90 }, { days: [0, 2, 3, 5], at: 15 * 60 + 30, stay: 40, chance: 0.5 }],
    evening: { park: [0, 1, 2, 3, 4, 5, 6] },
  },
  maya: {
    shift: [{ days: [0, 2, 4, 5], at: 14 * 60 + 20, stay: 80 }],
    evening: { riverside: [0, 3, 5], laundromat_night: [1, 2, 4], street: [6] },
  },
  june: {
    shift: [{ days: [0, 2, 5], at: 13 * 60, stay: 70 }],
    evening: { garden: [0, 1, 2, 3, 4, 5], street: [6] },
  },
  remy: {
    shift: [{ days: [1, 3, 5], at: 11 * 60, stay: 45 }],
    evening: { street: [0, 1, 2, 3, 4, 5], riverside: [6] },
  },
  // Neighbours come to the shop when they drop off laundry; in the evenings they're out and
  // about (once they have in-world art). from = first day of that routine.
  delgado: { evening: { street: [0, 1, 2, 3, 4], park: [6] }, from: 14 },
  priya: { evening: { riverside: [5, 6] } },
  haddad: { evening: { garden: [1, 3, 5] } },
  kai: { evening: { street: [0, 2, 4], park: [1, 3] } },
};

// Expressions a script may ask for that a character doesn't have map to the closest one.
// Everyone but the player has the nine portraits in EXPRS9.
const NINE = {
  neutral: 'smile', happy: 'laugh', excited: 'laugh', grin: 'smile', gentle: 'content', shy: 'content',
  wink: 'sly', smug: 'sly', skeptical: 'sly', annoyed: 'tired', angry: 'sad', surprised: 'surprised',
};
const ALIASES = {
  me: { content: 'wink', happy: 'laugh', excited: 'laugh', smile: 'neutral', gentle: 'neutral', angry: 'smug', shy: 'worried', sly: 'smug', grin: 'laugh', annoyed: 'tired', skeptical: 'smug' },
  walt: NINE, maya: NINE, june: NINE, remy: NINE, delgado: NINE, priya: NINE, haddad: NINE, kai: NINE,
};

export function portraitFor(id, expr) {
  const c = CHARACTERS[id];
  if (!c || !c.portrait) return null;
  let e = expr || c.defaultExpr;
  if (!c.exprs.includes(e)) e = (ALIASES[id] && ALIASES[id][e]) || c.defaultExpr;
  const name = `face_${c.portrait}_${e}`;
  if (Assets.has(name)) return name;
  const fallback = `face_${c.portrait}_${c.defaultExpr}`;
  return Assets.has(fallback) ? fallback : null;
}

// Has in-world art (so they can be placed in a scene)?
export function hasSprite(id) {
  const c = CHARACTERS[id];
  return !!(c && c.sprite && Assets.has(c.sprite));
}

// Something to show for a character in menus: their portrait, or failing that their icon.
export function faceOrIcon(id, expr) {
  return portraitFor(id, expr) || (CHARACTERS[id] && CHARACTERS[id].icon) || 'icon_speech';
}
