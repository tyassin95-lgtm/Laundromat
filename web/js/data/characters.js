// Characters: portraits (face_<id>_<expr>), in-world sprites, voices, gift tastes and routines.
// Heights are in virtual px for interiors; exteriors scale them by the scene's charScale.

export const CHARACTERS = {
  me: {
    name: '{name}', portrait: 'player', side: 'left', voice: 1.12, color: '#3f6c74',
    exprs: ['neutral', 'laugh', 'worried', 'surprised', 'tired', 'thinking', 'smug', 'sad', 'wink'],
    defaultExpr: 'neutral',
  },
  walt: {
    name: 'Walt', full: 'Walt Szymanski', portrait: 'walt', side: 'right', voice: 0.72, color: '#b7773a',
    exprs: ['neutral', 'smile', 'sad', 'laugh', 'angry', 'content'], defaultExpr: 'neutral',
    sprite: 'npc_walt', h: 288, faces: 1,
    blurb: 'Retired machinist. Tuesdays and Fridays, 9 a.m. sharp, since 1981.',
    loves: ['scarf', 'coffee', 'photo_rosa', 'toolkit'], likes: ['tea', 'sketch', 'photo', 'lemon_bars', 'record'], dislikes: ['flowers'],
  },
  maya: {
    name: 'Maya', full: 'Maya Okafor', portrait: 'maya', side: 'right', voice: 1.25, color: '#d9a02e',
    exprs: ['neutral', 'content', 'worried', 'laugh', 'annoyed', 'sly'], defaultExpr: 'neutral',
    sprite: 'npc_maya', h: 270, faces: 1,
    blurb: 'Music student. Night shifts at the pharmacy. Headphones always on.',
    loves: ['record', 'photo_night', 'coffee'], likes: ['sketch', 'tea', 'lemon_bars', 'photo', 'scarf'], dislikes: ['knit_hat'],
  },
  june: {
    name: 'June', full: 'June Ito', portrait: 'june', side: 'right', voice: 1.02, color: '#c0562a',
    exprs: ['neutral', 'sly', 'thinking', 'worried', 'gentle', 'happy'], defaultExpr: 'neutral',
    sprite: 'npc_june', h: 250, faces: 1,
    blurb: 'Taught third grade for 38 years. Runs the community garden. Lives next door.',
    loves: ['flowers', 'cutting', 'scarf', 'photo_garden'], likes: ['tea', 'sketch', 'photo', 'record', 'lemon_bars'], dislikes: ['coffee'],
  },
  remy: {
    name: 'Remy', full: 'Remy Castillo', portrait: 'remy', side: 'right', voice: 1.18, color: '#d77a9a',
    exprs: ['neutral', 'excited', 'skeptical', 'worried', 'shy', 'wink'], defaultExpr: 'neutral',
    sprite: 'npc_remy', h: 268, faces: 1,
    blurb: 'Barista at the Corner Cup. Paints murals. Knows everyone on Linden Street.',
    loves: ['sketch', 'photo', 'spray_paint'], likes: ['record', 'coffee', 'scarf', 'lemon_bars'], dislikes: ['tea'],
  },
  grant: { name: 'Grant Holloway', portrait: null, side: 'right', voice: 0.9, color: '#3b4a5c' },
  rosa: { name: 'Rosa', portrait: null, side: 'right', voice: 1.0, color: '#b3402f' },
  biscuit: { name: 'Biscuit', portrait: null, side: 'right', voice: 1.6, color: '#d9892e' },
};

export const FRIEND_IDS = ['walt', 'maya', 'june', 'remy'];

// Where each friend can be found, by phase. Days: 0 = Monday ... 6 = Sunday.
// shift: visits the laundromat at a given time (minutes) on listed weekdays.
// evening: location they hang out at in the evening on listed weekdays.
export const ROUTINES = {
  walt: {
    shift: [{ days: [1, 4], at: 9 * 60, stay: 90 }, { days: [0, 2, 3, 5], at: 15 * 60 + 30, stay: 40, chance: 0.5 }],
    evening: { park: [0, 1, 2, 3, 4, 5, 6] },
  },
  maya: {
    shift: [{ days: [0, 2, 4, 5], at: 16 * 60 + 30, stay: 80 }],
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
};

// Expressions a script may ask for that a character doesn't have map to the closest one.
const ALIASES = {
  me: { content: 'wink', happy: 'laugh', excited: 'laugh', smile: 'neutral', gentle: 'neutral', angry: 'smug', shy: 'worried' },
  walt: { happy: 'laugh', thinking: 'neutral', worried: 'sad', gentle: 'content', excited: 'laugh', surprised: 'smile', shy: 'content' },
  maya: { sad: 'worried', thinking: 'sly', excited: 'laugh', happy: 'laugh', gentle: 'content', smile: 'content', surprised: 'worried', shy: 'content' },
  june: { sad: 'worried', excited: 'happy', laugh: 'happy', smile: 'gentle', content: 'gentle', surprised: 'thinking', shy: 'gentle' },
  remy: { sad: 'worried', thinking: 'skeptical', laugh: 'excited', happy: 'excited', content: 'wink', smile: 'wink', angry: 'skeptical', surprised: 'excited' },
};

export function portraitFor(id, expr) {
  const c = CHARACTERS[id];
  if (!c || !c.portrait) return null;
  let e = expr || c.defaultExpr;
  if (!c.exprs.includes(e)) e = (ALIASES[id] && ALIASES[id][e]) || c.defaultExpr;
  return `face_${c.portrait}_${e}`;
}
