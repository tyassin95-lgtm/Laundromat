// Romance: opt-in, with four of the people on Linden Street. Every step is a choice in
// conversation, and saying "just friends" at the first one is always fine.
//
//   spark    a moment when they're close enough (rom_<who>_spark). Choosing the warm answer
//            runs <<romance <who> spark>>; the friendly one, <<romance <who> friend>> (that's that).
//   invite   they ask you somewhere (rom_<who>_invite): <<romance <who> invite>> books it for
//            this evening (or tomorrow's, if it's already late); <<romance <who> later>> asks again
//            in a couple of days.
//   date     go to the place after 5 pm that day: rom_<who>_date plays there, and they're waiting.
//            Stand them up and they'll say so (rom_<who>_missed).
//   confess  later, closer still (rom_<who>_confess): <<romance <who> partner>> — together — or
//            <<romance <who> slow>> to take it slowly (they'll bring it up again in a few days).
//            One partner at a time; the others stay friends.
// A partner brings you coffee some mornings and has a card of their own in the epilogue.

export const ROMANCE = {
  maya: { place: 'riverside', placeName: 'the riverside', spark: 'hearts.maya >= 5 and flag.maya_h2', invite: 'hearts.maya >= 5', confess: 'hearts.maya >= 8' },
  remy: { place: 'street', placeName: 'the Corner Cup', spark: 'hearts.remy >= 5 and flag.remy_h2', invite: 'hearts.remy >= 5', confess: 'hearts.remy >= 8' },
  kai: { place: 'park', placeName: 'the park fountain', neighbour: true, spark: 'hearts.kai >= 3 and day >= 8', invite: 'hearts.kai >= 3', confess: 'hearts.kai >= 4' },
  priya: { place: 'garden', placeName: 'the community garden', neighbour: true, spark: 'hearts.priya >= 3 and flag.priya_rosa_night', invite: 'hearts.priya >= 3', confess: 'hearts.priya >= 4' },
};

export const ROMANCE_EVENTS = [];
// Friends: whenever you talk. Neighbours: the big moments happen when they come to the counter
// (the scenes say so); invitations and apologies also when you meet them out and about.
for (const [who, R] of Object.entries(ROMANCE)) {
  for (const on of R.neighbour ? ['arrive', 'talk'] : ['talk']) {
    const counter = !R.neighbour || on === 'arrive';
    const e = (step, cond) => ROMANCE_EVENTS.push({ id: `rom_${who}_${step}_${on}`, on, who, once: false, cond, node: `rom_${who}_${step}` });
    e('missed', `var.date_${who} and var.date_${who} < day and not flag.dated_${who}`);
    if (counter) e('confess', `flag.dated_${who} and not flag.partner and (not var.rom_slow_${who} or day - var.rom_slow_${who} >= 4) and (${R.confess})`);
    e('invite', `flag.spark_${who} and not flag.dated_${who} and not var.date_${who} and not flag.partner and (not var.rom_later_${who} or day - var.rom_later_${who} >= 2) and (${R.invite})`);
    if (counter) e('spark', `romanceOpen("${who}") and (${R.spark})`);
  }
  ROMANCE_EVENTS.push({ id: `rom_${who}_date`, on: 'location', loc: R.place, once: false,
    cond: `var.date_${who} == day and time >= 17*60 and phase != "shift"`, node: `rom_${who}_date` });
}
