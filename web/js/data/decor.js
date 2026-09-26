// Decor, upgrades and supplies. Decor goes into named slots in the laundromat (and the flat upstairs,
// slots prefixed "h_"). comfort feeds customer happiness; some pieces also do something.
import { G } from '../game/state.js';

// Positions in world px: x is the middle, y where the piece stands (the bottom of a hanging one).
export const SHOP_SLOTS = {
  hang1: { x: 1106, y: 236, label: 'Ceiling hook' },
  hang2: { x: 1734, y: 304, label: 'Window hook' },
  lights: { x: 1805, y: 158, label: 'Over the window' },
  wall_a: { x: 742, y: 214, label: 'Wall' },
  wall_b: { x: 1290, y: 214, label: 'Wall' },
  sill: { x: 1742, y: 540, label: 'Window sill' },
  sill2: { x: 1872, y: 540, label: 'Window sill' },
  counter_top: { x: 290, y: 536, label: 'Counter' },
  lounge_table: { x: 1742, y: 684, label: 'Lounge table' },
  floor_l1: { x: 1655, y: 640, label: 'By the dryers' },
  floor_r1: { x: 1962, y: 708, label: 'By the door' },
  rug: { x: 1800, y: 706, label: 'Floor' },
  seat: { x: 1860, y: 668, label: 'Under the window (instead of the bench)' },
};

export const HOME_SLOTS = {
  h_hang: { x: 486, y: 190, label: 'Ceiling hook' },
  h_lights: { x: 722, y: 76, label: 'Over the window' },
  h_wall1: { x: 1085, y: 200, label: 'Wall' },
  h_wall2: { x: 1405, y: 262, label: 'Wall' },
  h_shelf: { x: 780, y: 460, label: 'Window seat' },
  h_table: { x: 1085, y: 508, label: 'Desk' },
  h_floor: { x: 178, y: 640, label: 'By the door' },
  h_rug: { x: 760, y: 706, label: 'Floor' },
};

// cat: which slot family the piece fits. h/w: display size.
export const DECOR = {
  hanging_plant: { name: 'Hanging pothos', sprite: 'decor_hanging_plant', price: 45, comfort: 6, slots: ['hang1', 'hang2', 'h_hang'], h: 150, ay: 0.02, blurb: 'Trails of green that sway when the dryers run.' },
  string_lights: { name: 'String lights', sprite: 'decor_string_lights', price: 38, comfort: 8, slots: ['lights', 'h_lights'], w: 250, ay: 0.1, light: true, blurb: 'Warm bulbs for rainy evenings.' },
  painting: { name: 'Harbor painting', sprite: 'decor_painting', price: 55, comfort: 7, slots: ['wall_a', 'h_wall1'], h: 105, ay: 0.5, blurb: 'A little seaside town. Rosa always wanted to retire there.' },
  cork_board: { name: 'Cork board', sprite: 'decor_cork_board', price: 30, comfort: 4, slots: ['wall_b', 'h_wall2'], h: 95, ay: 0.5, fn: 'notes', blurb: 'Pin up photos, notes and thank-you cards.' },
  bulletin_board: { name: 'Community board', sprite: 'furn_bulletin_board', price: 55, comfort: 6, slots: ['wall_b'], h: 104, ay: 0.5, fn: 'community', blurb: 'Neighbours post notices here. Needed for organising.' },
  cat_planter: { name: 'Cat planter', sprite: 'decor_cat_planter', price: 25, comfort: 5, slots: ['sill', 'sill2', 'h_shelf'], h: 62, blurb: 'A snake plant in a very pleased ceramic cat.' },
  flower_vase: { name: 'Flower vase', sprite: 'decor_flower_vase', price: 20, comfort: 5, slots: ['sill', 'sill2', 'counter_top', 'lounge_table', 'h_table'], h: 74, blurb: 'Fresh daisies from the garden.' },
  pothos: { name: 'Potted pothos', sprite: 'item_pothos', price: 18, comfort: 4, slots: ['sill', 'sill2', 'h_shelf'], h: 64, blurb: 'Practically unkillable. Practically.' },
  potted_plant: { name: 'Big leafy plant', sprite: 'furn_potted_plant', price: 40, comfort: 6, slots: ['floor_l1', 'floor_r1', 'h_floor'], h: 112, blurb: 'Makes any corner feel looked-after.' },
  floor_lamp: { name: 'Reading lamp', sprite: 'furn_floor_lamp', price: 60, comfort: 7, slots: ['floor_l1', 'h_floor'], h: 190, light: true, blurb: 'A pool of warm light for night owls.' },
  coat_rack: { name: 'Coat rack', sprite: 'furn_coat_rack', price: 35, comfort: 3, slots: ['floor_r1', 'floor_l1'], h: 190, blurb: 'For dripping umbrellas and damp coats.' },
  chalkboard: { name: 'Sidewalk chalkboard', sprite: 'decor_chalkboard', price: 30, comfort: 2, slots: ['floor_r1'], h: 118, fn: 'walkins', blurb: 'Specials and doodles. Draws in more walk-ins.' },
  record_player: { name: 'Record player', sprite: 'decor_record_player', price: 90, comfort: 9, slots: ['lounge_table', 'h_table'], h: 66, fn: 'music', blurb: 'Choose what the shop listens to.' },
  kettle: { name: 'Tea kettle', sprite: 'decor_kettle', price: 35, comfort: 6, slots: ['lounge_table', 'counter_top'], h: 58, fn: 'tea', blurb: 'Free tea for anyone waiting. People linger (nicely).' },
  rug: { name: 'Woven rug', sprite: 'decor_rug', price: 50, comfort: 6, slots: ['rug', 'h_rug'], w: 230, flat: true, blurb: 'Softens the tile and the mood.' },
  plastic_chair: { name: 'Plastic chair', sprite: 'furn_plastic_chair', price: 25, comfort: 3, slots: ['seat'], h: 130, blurb: 'Classic laundromat seating. Takes the bench\'s place under the window.' },
  stool: { name: 'Stool', sprite: 'furn_stool', price: 22, comfort: 2, slots: ['seat'], h: 84, blurb: 'Good for folding marathons. Takes the bench\'s place under the window.' },
  double_bench: { name: 'Double bench', sprite: 'furn_double_bench', price: 70, comfort: 7, slots: ['seat'], h: 87, blurb: 'Room for two, plus a bag of laundry. Replaces the old bench under the window.' },
  lantern: { name: 'Old lantern', sprite: 'item_lantern', price: 28, comfort: 4, slots: ['sill', 'sill2', 'h_shelf', 'h_table'], h: 70, light: true, blurb: 'Handy when the power goes out.' },
};

// Machines & practical upgrades. Each one does something in the simulation (game/laundry.js,
// game/day.js); "from" = the day it shows up in the catalog.
export const UPGRADES = {
  cart: { name: 'Laundry cart', sprite: 'furn_laundry_cart', price: 95, blurb: 'Carry two loads at once.' },
  sign: { name: 'New shop sign', sprite: 'decor_hanging_sign', price: 60, blurb: 'A hanging sign out front — and a chance to name the place.' },
  fold_board: { name: 'Folding board', sprite: 'item_ironing_board', price: 45, blurb: 'Neater folds, faster. Folding is more forgiving.' },
  tool_kit: { name: 'Proper tool kit', sprite: 'icon_wrench', price: 70, blurb: 'Repairs go smoother and last longer.' },
  lint_screens: { name: 'Magnetic lint screens', sprite: 'upg_lint_screen', price: 40, blurb: 'Dryer lint builds up half as fast, so dryers stay quick.' },
  wifi: { name: 'Free Wi-Fi', sprite: 'upg_wifi', price: 45, blurb: 'Waiting is nicer online. Customers leave happier and tip better.' },
  coin_changer: { name: 'Coin changer', sprite: 'upg_coin_changer', price: 55, blurb: 'Nobody walks out for want of quarters: more self-service walk-ins.' },
  led_bulbs: { name: 'LED bulbs', sprite: 'upg_led_bulb', price: 65, blurb: 'Same warm light. The weekly electric bill drops by a third.' },
  awning: { name: 'Door canopy', sprite: 'upg_awning', price: 110, from: 3, blurb: 'A striped canopy and a boot scraper at the door: rainy days bring more walk-ins and fewer muddy puddles.' },
  vending: { name: 'Snack & soap machine', sprite: 'upg_vending', price: 120, from: 3, blurb: 'Walk-ins buy crisps and soap while they wait: a little extra every day.' },
  cargo_bike: { name: 'Delivery bike', sprite: 'upg_cargo_bike', price: 150, from: 5, blurb: 'Pickup and delivery: one more drop-off order every day the shop is open.' },
  water_heater: { name: 'Tankless water heater', sprite: 'upg_water_heater', price: 160, from: 5, blurb: 'Hot water on tap. Washes run 20% faster, and the gas bill eases a little.' },
};
export const hasUpgrade = id => G.upgrades.includes(id);

export const SUPPLIES = {
  detergent: { name: 'Detergent jug', sprite: 'item_detergent', price: 16, qty: 10, unit: 'loads', blurb: 'Ten washes. Machines won\'t run without it.' },
  detergent_bulk: { name: 'Bulk detergent', sprite: 'item_soap_box', price: 42, qty: 30, item: 'detergent', unit: 'loads', blurb: 'Thirty washes, cheaper per load.' },
  softener: { name: 'Lavender softener', sprite: 'item_softener', price: 12, qty: 10, unit: 'loads', blurb: 'Some regulars ask for it. They notice.' },
  parts: { name: 'Spare parts', sprite: 'icon_wrench', price: 12, qty: 1, unit: 'kit', blurb: 'Belts, seals, fuses. One kit per repair.' },
  tea: { name: 'Tin of tea', sprite: 'item_teacup', price: 8, qty: 6, unit: 'cups', blurb: 'A pick-me-up. +energy.' },
};

export function comfortOf(placed) {
  let c = 0;
  for (const [slot, id] of Object.entries(placed)) {
    if (slot.startsWith('h_')) continue;
    const d = DECOR[id];
    if (d) c += d.comfort;
  }
  return c;
}
