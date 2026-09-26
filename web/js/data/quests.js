// Side missions ("errands"): favours for friends and neighbours, each with a reward.
//
// How one runs:
//   offer   when the giver talks to you (neighbours: also when they come to the counter) and the
//           offer condition holds, script node q_<id>_offer plays. It runs <<quest start <id>>>,
//           or <<quest later <id>>> to be asked again in a couple of days.
//   steps   script expressions, checked all the time (game/quests.js). A step's text is shown in
//           the journal's Errands page with a tick once it holds.
//   done    once every step holds, the giver's next conversation plays q_<id>_done, which runs
//           <<quest done <id>>> and pays the reward.
// Step expressions can use gained("<id>", "<counter>") — how much a counter in G.vars has grown
// since the quest started (the counters are listed in track) — and gave("<who>", "<item>", "<id>"),
// true once that gift has been given since the quest started.
// trigger overrides where offers and completions come from (default: talking to the giver).

export const QUESTS = {
  walt_scarf: {
    title: 'A scarf for Walt', giver: 'walt', icon: 'item_scarf',
    blurb: 'Walt\'s scarf is more hole than scarf. Peg knit it in 1979. He would never ask for a new one.',
    minDay: 4, offer: 'flag.learned_knit and hearts.walt >= 2',
    steps: [
      { text: 'Knit a scarf (Rosa\'s yarn basket, at home)', done: 'item.scarf >= 1 or gave("walt", "scarf", "walt_scarf")' },
      { text: 'Give Walt the scarf', done: 'gave("walt", "scarf", "walt_scarf")' },
    ],
    reward: { text: 'Walt teaches you Peg\'s belt trick: +1 repair skill', skill: 'repair', hearts: 50, flag: 'walt_new_scarf' },
  },
  maya_cover: {
    title: 'Cover art', giver: 'maya', icon: 'item_camera',
    blurb: 'Maya\'s label wants cover art by Friday. Her folder of ideas is one picture of a toaster.',
    offer: 'flag.maya_recorded and flag.has_camera and hearts.maya >= 2',
    steps: [
      { text: 'Photograph the city from the river, after 7 pm', done: 'item.photo_night >= 1 or gave("maya", "photo_night", "maya_cover")' },
      { text: 'Give Maya the night photograph', done: 'gave("maya", "photo_night", "maya_cover")' },
    ],
    reward: { text: 'A record for the collection, and your name in the credits (small)', hearts: 40, flag: 'maya_cover_photo' },
  },
  june_garden: {
    title: 'Green thumbs', giver: 'june', icon: 'item_pothos', track: ['gardenDays'],
    blurb: 'June\'s knees have opinions about the watering can. The tomatoes have louder ones.',
    offer: 'flag.june_garden_1',
    steps: [
      { text: 'Water the community garden on three different evenings', done: 'gained("june_garden", "gardenDays") >= 3', count: ['gardenDays', 3] },
    ],
    reward: { text: 'Flowers, a cutting and a very large tomato. +community', items: { flowers: 2, cutting: 1 }, community: 4, hearts: 40 },
  },
  remy_studies: {
    title: 'Mural studies', giver: 'remy', icon: 'item_sketchbook', track: ['sketchesOut'],
    blurb: 'Remy wants the mural to be the whole neighbourhood, but only ever draws the café.',
    minDay: 6, offer: 'hearts.remy >= 2',
    steps: [
      { text: 'Sketch three places around the neighbourhood (look for the sketch spots)', done: 'gained("remy_studies", "sketchesOut") >= 3', count: ['sketchesOut', 3] },
    ],
    reward: { text: 'Artist rate: $30, mostly in coffee. +community', money: 30, community: 2, hearts: 45 },
  },
  spotless: {
    title: 'Rosa\'s rule', giver: 'june', icon: 'icon_star', track: ['cleanCloses'],
    blurb: 'Rosa had one rule besides Sundays: never lock up a dirty shop.',
    minDay: 4, offer: 'hearts.june >= 1',
    steps: [
      { text: 'Close the shop spotless (cleanliness 80+) three times', done: 'gained("spotless", "cleanCloses") >= 3', count: ['cleanCloses', 3] },
    ],
    reward: { text: 'The shop stays clean a little longer from now on. +reputation', rep: 4, hearts: 25, flag: 'spotless_habit' },
  },
  kai_socks: {
    title: 'The sock conspiracy', giver: 'kai', icon: 'item_sock', track: ['socksFound'],
    blurb: 'Kai\'s spreadsheet has a new tab called SUSPECTS. Kai needs field data.',
    offer: 'hearts.kai >= 1',
    steps: [
      { text: 'Pick up five stray socks (in the shop, or out and about)', done: 'gained("kai_socks", "socksFound") >= 5', count: ['socksFound', 5] },
    ],
    reward: { text: 'A consultancy fee of $25 and Kai\'s undying respect', money: 25, hearts: 40 },
  },
  priya_care: {
    title: 'Care package', giver: 'priya', icon: 'item_coffee_mug',
    blurb: 'Priya\'s night crew at the bakery runs on day-old croissants and spite.',
    minDay: 5, offer: 'hearts.priya >= 1',
    steps: [
      { text: 'Give Priya a Corner Cup coffee', done: 'gave("priya", "coffee", "priya_care")' },
      { text: 'Give Priya tea for the ones going home', done: 'gave("priya", "tea", "priya_care")' },
    ],
    reward: { text: 'The bakery crew start bringing their aprons: an extra drop-off on Tuesdays and Thursdays. +reputation', rep: 3, hearts: 40, flag: 'er_scrubs' },
  },
  haddad_lavender: {
    title: 'Lavender, always', giver: 'haddad', icon: 'item_softener',
    blurb: 'Forty-five years of lavender sheets. Sami\'s grandmother is not starting on "fresh linen scent" now.',
    offer: 'hearts.haddad >= 1',
    steps: [
      { text: 'Stock ten loads of lavender softener (Supplies)', done: 'item.softener >= 10' },
    ],
    reward: { text: 'A tin of ma\'amoul (two helpings). +reputation', items: { maamoul: 2 }, rep: 2, hearts: 40 },
  },
  biscuit: {
    title: 'Biscuit\'s trust', giver: 'biscuit', icon: 'item_cat_bed', track: ['catDays'],
    blurb: 'Biscuit regards you the way a landlord regards a new tenant.',
    minDay: 2, trigger: { on: 'act', cond: 'ev.act == "pet_cat"' },
    steps: [
      { text: 'Pet Biscuit on five different days', done: 'gained("biscuit", "catDays") >= 5', count: ['catDays', 5] },
    ],
    reward: { text: 'Biscuit sleeps on your feet now: +5 energy every morning', flag: 'biscuit_bond' },
  },
};

const NEIGHBOURS = ['delgado', 'priya', 'haddad', 'kai'];

// The events that offer and finish each quest (appended after the story's own events, so the
// story always gets first say).
export const QUEST_EVENTS = [];
for (const [id, q] of Object.entries(QUESTS)) {
  const triggers = q.trigger ? [q.trigger] : NEIGHBOURS.includes(q.giver) ? [{ on: 'arrive' }, { on: 'talk' }] : [{ on: 'talk' }];
  for (const t of triggers) {
    const who = q.trigger ? undefined : q.giver;
    const extra = t.cond ? ` and (${t.cond})` : '';
    QUEST_EVENTS.push({ id: `q_done_${id}_${t.on}`, on: t.on, who, once: false, cond: `questReady("${id}")${extra}`, node: `q_${id}_done` });
    QUEST_EVENTS.push({ id: `q_offer_${id}_${t.on}`, on: t.on, who, once: false, minDay: q.minDay,
      cond: `questNew("${id}")${q.offer ? ` and (${q.offer})` : ''}${extra}`, node: `q_${id}_offer` });
  }
}
