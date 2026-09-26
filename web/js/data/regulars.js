// Drop-off services and the neighbourhood regulars who leave their laundry (and notes) at Rosa's.
// Notes can be plain strings or {text, from, until} to follow a regular's story over the month.

export const SERVICES = {
  wash_fold: { label: 'Wash & Fold', price: 16, dueIn: 200, stages: ['wash', 'dry', 'fold'] },
  wash_dry: { label: 'Wash & Dry', price: 12, dueIn: 170, stages: ['wash', 'dry'] },
  rush: { label: 'Rush Wash & Fold', price: 24, dueIn: 115, stages: ['wash', 'dry', 'fold'] },
  delicate: { label: 'Delicates', price: 20, dueIn: 220, stages: ['wash', 'dry', 'fold'] },
};

export const REGULARS = [
  {
    id: 'priya', name: 'Priya', icon: 'item_coffee_mug', services: ['wash_fold', 'rush'], bags: ['item_tote_bag'],
    thanks: ['Like little presents. You\'re a lifesaver.', 'Late, but clean. I\'ll live. Probably.'],
    notes: [
      'Aprons again. By 4 if you can — the 2 a.m. shift waits for no one. ♥ P',
      'Sorry about the flour. It gets everywhere. It is in my soul now.',
      { text: 'Rosa always folded my aprons like little presents. No pressure. (Some pressure.) — P', until: 6 },
      { text: 'Heard Crestline is sniffing around Linden St. If you need signatures, count me in. — P', from: 9 },
      { text: 'Tell the old guy with the cap he was right about the dryer. Don\'t tell him I said so.', from: 14 },
    ],
  },
  {
    id: 'delgado', name: 'Luis Delgado', icon: 'item_apron', services: ['wash_fold'], bags: ['item_hamper'],
    thanks: ['Folded just like Rosa. Almost.', 'Better late than wrinkled, mija.'],
    notes: [
      { text: 'Store aprons and the good tablecloths. Same as always, mija. — Luis', until: 12 },
      { text: 'Rent on the store went up again. Don\'t know how long we can hold on. — L', from: 6, until: 12 },
      { text: 'Last load of the store\'s aprons. Thirty-one years. Thank you, Rosa\'s. — Luis', from: 11, until: 13 },
      { text: 'Just my own shirts now. Strange, washing for one man. — L', from: 14 },
      { text: 'Marisol says to starch the collars. I say life is too short. You decide. — L', from: 14 },
    ],
  },
  {
    id: 'abernathy', name: 'Prof. Abernathy', icon: 'item_novel', services: ['delicate', 'wash_fold'], bags: ['item_wicker_basket'],
    notes: [
      'Light starch on the collars. *Light.* — H. Abernathy',
      'Tempus fugit. As, apparently, do my socks.',
      'The tweed is older than you are. Treat it with the respect due to an elder.',
      { text: 'I have written to the city council. Strongly worded. Four pages. — H.A.', from: 15 },
    ],
  },
  {
    id: 'tomas', name: 'Tomás', icon: 'item_towels', services: ['rush', 'wash_dry'], bags: ['item_drawstring_bag'],
    notes: [
      'Chef whites. The grease is winning. Help.',
      'Double shift tonight. You are a saint.',
      { text: 'Restaurant might close for "renovation" after the Linden goes up. Renovation means rent. — T', from: 16 },
    ],
  },
  {
    id: 'dee', name: 'Coach Dee', icon: 'item_tote_bag', services: ['wash_dry'], bags: ['item_tote_bag', 'item_hamper'],
    notes: [
      'Little League jerseys. The mud is a feature, not a bug.',
      'WE WON 7–3!! Muddiest game of the season. Sorry.',
      { text: 'The kids made you a thank-you card. It\'s in the pocket of #12. Don\'t wash the card.', from: 10 },
    ],
  },
  {
    id: 'lina', name: 'Lina & baby Theo', icon: 'item_sock', services: ['delicate', 'wash_fold'], bags: ['item_wicker_basket'], softener: 0.6,
    notes: [
      'Baby things. Gentle please. I have not slept since June.',
      'Theo said his first word. It was "duck." We don\'t know why.',
      { text: 'Theo is walking now. Nothing in our apartment is safe. Send help (and clean onesies).', from: 12 },
    ],
  },
  {
    id: 'kai', name: 'Kai', icon: 'item_drawstring_bag', services: ['wash_dry', 'rush'], bags: ['item_drawstring_bag'],
    thanks: ['Sock count: correct. Suspicious, but correct.', 'Late AND a sock short? Kidding. Mostly.'],
    notes: [
      'One sock missing. Again. It\'s a conspiracy and I will get to the bottom of it.',
      'Rode in the rain all week. Everything I own smells like a puddle.',
      { text: 'Got a delivery job at the new Linden sales office. Weird vibes. They asked what I thought of "the old laundromat."', from: 17 },
    ],
  },
  {
    id: 'haddad', name: 'Sami Haddad', icon: 'item_hamper', services: ['wash_fold'], bags: ['item_hamper'], softener: 0.85,
    thanks: ['Lavender. Teta will be pleased. (She says: good girl.)', 'Late. Teta says Rosa was never late. Also, eat something.'],
    notes: [
      'Teta\'s sheets, for the cousins\' visit. Lavender softener if you have it! — S.',
      'The cousins are gone. Teta says the sheets remember them. Wash gently.',
      { text: 'Apt 3C, Alder Arms. We got the letter too. June says we meet Thursdays? — S. (for F. Haddad)', from: 11 },
    ],
  },
  {
    id: 'benji', name: 'Benji', icon: 'item_wicker_basket', services: ['wash_dry'], bags: ['item_wicker_basket', 'item_drawstring_bag'],
    notes: [
      'first time doing laundry alone. is this how it works',
      'my mom says hi and thank you. she says rosa used to fold my baby clothes??',
      'i put a red sock in with the whites last time at home. never again. please check',
    ],
  },
  {
    id: 'rosales', name: 'The Rosales twins', icon: 'item_tote_bag', services: ['wash_dry', 'wash_fold'], from: 5,
    notes: [
      'Soccer uniforms x2. We are sorry for the smell. — Marco & Ana',
      'Ana scored! (Marco did not.) (Marco wrote this.)',
    ],
  },
];

// Named friends' personal orders (created when they visit on their laundry days).
export const FRIEND_ORDERS = {
  walt: { service: 'wash_fold', icon: 'face_walt_smile', bag: 'item_hamper', note: 'Warm water. No bleach. No nonsense. — W.S.' },
  maya: { service: 'wash_dry', icon: 'face_maya_smile', bag: 'item_tote_bag', note: 'hoodies + the lucky jeans. do NOT shrink the lucky jeans' },
  june: { service: 'delicate', icon: 'face_june_smile', bag: 'item_wicker_basket', note: 'Cardigans and Hiro\'s old handkerchiefs. Cool water, dear.' },
  remy: { service: 'wash_fold', icon: 'face_remy_smile', bag: 'item_drawstring_bag', note: 'Café aprons + paint rags. Yes the paint is permanent. Yes I know.' },
};
