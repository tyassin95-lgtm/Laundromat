// Endings: epilogue cards (conditional on relationships and choices) and the credits roll.
import { heartsOf, NEIGHBOURS } from '../game/state.js';
import { faceOrIcon, CHARACTERS } from './characters.js';

const h = w => heartsOf(w);

function waltCard(G, sold) {
  if (sold) return { img: 'face_walt_sad', title: 'Walt', text: h('walt') >= 6
    ? 'Walt drove out to the new laundromat by the highway exactly once. Too bright, he said. He calls you on Tuesdays and Fridays now, at nine, to ask how you are. He never says why those days.'
    : 'Walt stopped coming to Linden Street after the fences went up. Priya says she saw him feeding pigeons two neighbourhoods over, alone.' };
  if (h('walt') >= 8) return { img: 'face_walt_laugh', title: 'Walt', text: 'Walt fixes the machines on Tuesdays and Fridays, 9 a.m. sharp, and refuses payment in anything but coffee. There\'s a brass plaque on dryer two now: "Peg & Walter, 1974."' };
  if (h('walt') >= 4) return { img: 'face_walt_smile', title: 'Walt', text: 'Walt still brings his laundry every Tuesday and Friday. He still says Rosa folded tighter. He still stays an hour longer than he needs to.' };
  return { img: 'face_walt_content', title: 'Walt', text: 'Walt still comes twice a week. He doesn\'t talk much. But he comes.' };
}

function mayaCard(G, sold) {
  const left = G.flags.maya_goes;
  if (left) return { img: 'face_maya_laugh', title: 'Maya', text: `Maya's first record came out in the spring. The opening track is called "${G.vars.trackName || 'Spin Cycle'}," and it starts with the sound of a washing machine on Linden Street. She sends you a postcard from every city she plays.` };
  if (h('maya') >= 6) return { img: 'face_maya_content', title: 'Maya', text: 'Maya stayed. She teaches beat-making to kids in the back of the shop on Thursday nights, and her album — recorded between midnight and 3 a.m. — is almost done.' };
  return { img: 'face_maya_smile', title: 'Maya', text: sold ? 'Maya does her laundry in the big new place by the highway now. She says the machines there have no groove.' : 'Maya still comes in late, headphones on, nodding along to the dryers.' };
}

function juneCard(G, sold) {
  if (sold || (G.flags.hearing_lost && h('june') < 6)) return { img: 'face_june_worried', title: 'June', text: 'June moved to Portland to live with her daughter. She writes long letters in perfect cursive and asks, every time, whether the persimmon tree in the garden made it through the winter.' };
  if (G.flags.hearing_won) return { img: 'face_june_laugh', title: 'June', text: 'The Alder Arms tenants won rent protection in the spring. June still lives in 4B, still runs the garden, and still grades everyone\'s handwriting, including yours. You get a B+.' };
  return { img: 'face_june_content', title: 'June', text: 'June is fighting her eviction in court. She knits in the laundromat window while she waits, and every week there are a few more signatures on her petition.' };
}

function remyCard(G, sold) {
  if (G.flags.commission_taken && !G.flags.commission_refused) return { img: 'face_remy_worried', title: 'Remy', text: 'Remy\'s murals hang in the lobby of the Linden. They\'re beautiful. She paid off her mother\'s hospital bills. She doesn\'t walk past the building if she can help it.' };
  if (G.flags.new_mural && !sold) return { img: 'face_remy_sly', title: 'Remy', text: 'Remy\'s new mural covers the whole Cap & Seal fence now — Linden Street at sunrise, and in the corner, painted small, an old woman folding a shirt. People take wedding photos in front of it.' };
  return { img: 'face_remy_smile', title: 'Remy', text: sold ? 'Remy left the Corner Cup when the rent tripled. She paints somewhere else now. You haven\'t seen the new walls yet.' : 'Remy still pulls espresso at the Corner Cup and still tags the Crestline hoardings when she thinks no one is looking. Everyone is looking. Everyone cheers.' };
}

// One card for the neighbours you got to know (the three you're closest to).
function neighboursCard(G, sold) {
  const lost = sold || G.flags.hearing_lost;
  const lines = {
    delgado: sold ? 'Luis moved his family to Queens and drives a produce truck now. He mails you limes. They arrive bruised and perfect.'
      : G.flags.delgado_stall ? 'Luis has a fruit stall at the Sunday market, under a sign June painted. He saves the ugliest limes for you, out of love.'
        : 'Luis still drinks his morning coffee on the stoop of his old store and says good morning to everybody who passes.',
    priya: sold ? 'Priya found another laundromat. She says it\'s fine, the way bakers say fine: covered in flour.'
      : 'Priya still drops her aprons off at eleven, straight from the ovens. There is always a mint on top.',
    haddad: lost ? 'Mrs. Haddad moved in with her son in Dearborn, and Sami went too, to finish his thesis there. She calls on Sundays to ask if you\'re eating.'
      : 'Mrs. Haddad hosts Thursday dinners at the shop now, and Sami carries the pots down three flights. Attendance is mandatory. So is the ma\'amoul.',
    kai: sold ? 'Kai still rides past the old corner every day. The sock spreadsheet has a memorial row for Rosa\'s.'
      : 'Kai\'s sock spreadsheet went viral in a very small corner of the internet. Rosa\'s is listed as "the only honest laundromat in the city."',
  };
  const known = NEIGHBOURS.filter(w => G.flags['met_' + w] && h(w) >= 2).sort((a, b) => (G.hearts[b] || 0) - (G.hearts[a] || 0)).slice(0, 3);
  if (!known.length) return [];
  return [{ img: faceOrIcon(known[0], 'smile'), title: 'The neighbours', text: known.map(w => lines[w]).join(' ') }];
}

// If you're with someone at the end, they get a card of their own.
function partnerCard(G, sold) {
  const p = G.flags.partner;
  if (!p || !CHARACTERS[p]) return [];
  const T = {
    maya: sold ? 'Maya followed you across the river and turned the new bathroom into a recording booth. The acoustics, she says, are "honest." Some nights she plays you the washing-machine song and you both pretend not to cry.'
      : G.flags.maya_goes ? 'Maya tours in the spring and comes home in the summer, to the flat above the shop, with a suitcase full of field recordings. The last track on every album is the dryers on Linden Street. The liner notes thank you by name. Small. Very small. But it\'s there.'
        : 'Maya moved her keyboard into the flat above the shop. She records at three in the morning with the window open, and the neighbours have stopped complaining, because the songs are about them.',
    remy: sold ? 'Remy painted your new kitchen wall with Linden Street at sunrise, exactly as it was. You eat breakfast in front of it every morning. Most days that helps.'
      : 'Remy paints in the back of the shop on Mondays, when it\'s quiet. There\'s a portrait of you on the wall by the dryers, folding a shirt, frowning in concentration. You hate it. Everyone else loves it.',
    kai: sold ? 'Kai still rides past the old corner every day, then rides on to your new place with two coffees and a new theory. The sock spreadsheet has a tab with your name on it. It is forty rows long now.'
      : 'Kai runs the shop\'s pickups and deliveries now, and stops by every evening with clementines and a new theory. The sock spreadsheet has a tab with your name on it. It is forty rows long now.',
    priya: sold ? 'Priya bakes days now. She says she wanted to see you in daylight at least once. She still folds her aprons like presents — for you — and leaves a mint on top.'
      : 'Priya switched to days in the spring. On her nights off you lock up together and sit on the bench in the dark with a pot of tea until one of you falls asleep. It\'s usually her. There\'s always a mint on her pillow.',
  };
  return [{ img: faceOrIcon(p, 'smile'), title: `${CHARACTERS[p].name} & ${G.name}`, text: T[p] || `${CHARACTERS[p].name} is still here. So are you.` }];
}

export const ENDINGS = {
  sold: {
    title: 'The Last Load', tagline: 'Rosa\'s Laundromat closed on October 1st.', music: 'bittersweet',
    cards: G => [
      { img: 'washer_classic', title: 'Rosa\'s', text: 'The machines went to a scrapyard in Jersey. The sign went into your closet. The Linden opened eighteen months later: 212 residences, a gym, a "laundry concierge." The lobby smells like expensive candles.' },
      { img: 'face_player_sad', title: G.name, text: 'The money paid Rosa\'s debts, and yours, and then some. You went back to school. Some nights you still dream about the rhythm of number two.' },
      ...partnerCard(G, true),
      waltCard(G, true), juneCard(G, true), mayaCard(G, true), remyCard(G, true), ...neighboursCard(G, true),
      { img: 'item_cat_bed', title: 'Biscuit', text: 'Biscuit moved with you. He sleeps on the warm spot on top of your fridge and has forgiven no one.' },
    ],
  },
  holdout: {
    title: 'Keep the Lights On', tagline: 'Rosa\'s stayed open. Just barely. Just enough.', music: 'home_night',
    cards: G => [
      { img: 'dryer_stack', title: 'Rosa\'s', text: `The Linden went up next door, glass and steel and a "laundry concierge." ${G.shop} stayed exactly where it was, squat and stubborn and warm, the last laundromat on Linden Street. The new tenants started coming in by November. Their machines broke. Ours didn't.` },
      { img: 'face_player_smug', title: G.name, text: 'Money is still tight. The roof still leaks over dryer two. You still sketch the machines on slow afternoons. You\'ve never been so tired, or so sure.' },
      ...partnerCard(G, false),
      waltCard(G, false), juneCard(G, false), mayaCard(G, false), remyCard(G, false), ...neighboursCard(G, false),
      { img: 'item_cat_bed', title: 'Biscuit', text: 'Biscuit sleeps on the warm dryer every afternoon at three. Customers schedule around him.' },
    ],
  },
  commons: {
    title: 'Rosa\'s Commons', tagline: 'The last laundromat on Linden Street became the first of something new.', music: 'ending',
    cards: G => [
      { img: 'furn_bulletin_board', title: 'The Council', text: `Rezoning application #2291 was denied, ${G.vars.speakers > 1 ? G.vars.speakers + ' neighbours' : 'the neighbours'} having spoken and ${G.petition >= 20 ? G.petition + ' people' : 'half the street'} having signed. Crestline built on the old lot anyway — smaller, with a line of affordable units the city insisted on. Linden Street kept its face.` },
      { img: 'washer_eco', title: G.shop, text: 'Rosa\'s became a co-op in the spring: the regulars own a share, the Night Wash happens on the last Saturday of every month, and there\'s a pay-what-you-can shelf of detergent by the door. The lights stay on until midnight.' },
      { img: 'face_player_laugh', title: G.name, text: 'You run the place, sort of. Mostly you fold, and fix, and listen, and draw the regulars on the backs of tickets. Your sketches cover a whole wall now. Abuela would say you finally found the right crayon.' },
      ...partnerCard(G, false),
      waltCard(G, false), juneCard(G, false), mayaCard(G, false), remyCard(G, false), ...neighboursCard(G, false),
      { img: 'item_cat_bed', title: 'Biscuit', text: 'Biscuit is the co-op\'s official mascot. He attends every meeting. He votes no on everything.' },
    ],
  },
};

export const CREDITS = `
  <h1>The Last Laundromat</h1>
  <p>A cosy story about keeping the lights on.</p>
  <h2>CHARACTER & OBJECT ART</h2><p>Provided by the game's creator</p>
  <h2>BACKGROUNDS & GAME</h2><p>Painted and programmed for this project</p>
  <h2>MUSIC</h2>
  <p>Kevin MacLeod (incompetech.com)</p>
  <p class="small">"Gymnopedie No 1", "Local Forecast - Elevator", "Lobby Time", "Wallpaper", "Backbay Lounge", "Dreamer",<br>
  "Fireflies and Stardust", "Easy Lemon", "Bossa Antigua", "Sidewalk Shade", "Laid Back Guitars",<br>
  "Porch Swing Days - slower", "Deliberate Thought", "Carefree", "Frost Waltz", "Somewhere Sunny"</p>
  <p class="small">Licensed under Creative Commons: By Attribution 4.0 — creativecommons.org/licenses/by/4.0/</p>
  <h2>SOUND</h2>
  <p>Kenney (kenney.nl) — UI, RPG, Impact & Jingle packs (CC0)</p>
  <p class="small">Freesound.org contributors (CC0): 3bagbrew, ryuuzan, Sounds_by_Cois, kyles, ohrpilot, afnan808, felix.blume,<br>
  greatsoundstube, samesamesame, unfa, SholeColtis, elmoustachio, skymary, steffcaffrey, RazzleDizzle, aglinder,<br>
  Tonik1105, Breviceps, DefySolipsis, GeorgeHopkins, blwuens, YellowJacketStudios, douglasbruce, WanderingLeprechaun,<br>
  mobaudio, Rudmer_Rotteveel, Loinnats, HanulSkyGirl, miuziqa, Mohagged, 5ro4, sweet_niche, The-Sacha-Rush,<br>
  yottasounds, ramsamba, Anthousai, gladkiy, snakebarney</p>
  <h2>FONTS</h2>
  <p class="small">Patrick Hand, Fraunces, Pacifico, Caveat — SIL Open Font License</p>
  <h2>WITH THANKS</h2>
  <p>To every laundromat that ever stayed open late.</p>
  <p>To the people who fold other people's shirts.</p>
  <p>To Rosa.</p>
  <h1 style="margin-top:4rem">♥</h1>
`;
