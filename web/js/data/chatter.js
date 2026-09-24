// Everyday conversation pools. The story director picks one the player hasn't heard recently.
// Fields: node, min/max hearts, from/until day, place (scene name), cond.

const pool = (who, n, extra = {}) => Array.from({ length: n }, (_, i) => Object.assign({ node: `${who}_c${i + 1}` }, extra[i + 1] || {}));

export const CHATTER = {
  walt: [
    ...pool('walt', 15, { 4: { min: 2 }, 5: { min: 1 }, 7: { from: 5 }, 10: { min: 4 }, 11: { max: 6 }, 12: { min: 3 }, 13: { min: 3 }, 14: { from: 8 }, 15: { cond: 'flag.petition_started' } }),
    { node: 'walt_park', place: 'street', cond: 'loc == "park"' },
  ],
  maya: [
    ...pool('maya', 14, { 4: { min: 2 }, 7: { min: 1 }, 9: { from: 8 }, 10: { min: 4 }, 12: { min: 3 }, 14: { min: 3, from: 6 } }),
    { node: 'maya_night', place: 'laundromat', cond: 'time >= 19*60' },
  ],
  june: [
    ...pool('june', 13, { 2: { from: 11 }, 6: { min: 2 }, 7: { min: 3 }, 9: { from: 11 }, 10: { min: 4 }, 13: { from: 12 } }),
    { node: 'june_garden', place: 'street', cond: 'loc == "garden"' },
  ],
  remy: [
    ...pool('remy', 13, { 4: { min: 3 }, 5: { from: 13 }, 6: { min: 3 }, 7: { from: 13 }, 8: { min: 2 }, 12: { min: 4 }, 13: { min: 5 } }),
    { node: 'remy_street', place: 'street', cond: 'loc == "street"' },
  ],
};
