// Decor, upgrades and supplies. Decor goes into named slots in the laundromat (and the flat upstairs,
// slots prefixed "h_"). comfort feeds customer happiness; some pieces also do something.

export const SHOP_SLOTS = {
  hang1: { x: 1000, y: 214, label: 'Ceiling hook' },
  hang2: { x: 1700, y: 236, label: 'Window hook' },
  lights: { x: 1680, y: 150, label: 'Over the window' },
  wall_a: { x: 990, y: 168, label: 'Wall' },
  wall_b: { x: 1150, y: 170, label: 'Wall' },
  sill: { x: 1660, y: 446, label: 'Window sill' },
  sill2: { x: 1750, y: 446, label: 'Window sill' },
  counter_top: { x: 268, y: 446, label: 'Counter' },
  lounge_table: { x: 1800, y: 668, label: 'Lounge table' },
  floor_l1: { x: 1582, y: 652, label: 'By the pillar' },
  floor_r1: { x: 1890, y: 700, label: 'By the door' },
  rug: { x: 1700, y: 688, label: 'Floor' },
  seat: { x: 560, y: 716, label: 'Seat' },
};

export const HOME_SLOTS = {
  h_hang: { x: 560, y: 220, label: 'Ceiling hook' },
  h_lights: { x: 680, y: 120, label: 'Over the window' },
  h_wall1: { x: 1020, y: 250, label: 'Wall' },
  h_wall2: { x: 1210, y: 250, label: 'Wall' },
  h_shelf: { x: 470, y: 410, label: 'Window seat' },
  h_table: { x: 1060, y: 470, label: 'Desk' },
  h_floor: { x: 1330, y: 640, label: 'Corner' },
  h_rug: { x: 760, y: 690, label: 'Floor' },
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
  potted_plant: { name: 'Big leafy plant', sprite: 'furn_potted_plant', price: 40, comfort: 6, slots: ['floor_l1', 'floor_r1', 'h_floor'], h: 124, blurb: 'Makes any corner feel looked-after.' },
  floor_lamp: { name: 'Reading lamp', sprite: 'furn_floor_lamp', price: 60, comfort: 7, slots: ['floor_l1', 'h_floor'], h: 205, light: true, blurb: 'A pool of warm light for night owls.' },
  coat_rack: { name: 'Coat rack', sprite: 'furn_coat_rack', price: 35, comfort: 3, slots: ['floor_r1', 'floor_l1'], h: 190, blurb: 'For dripping umbrellas and damp coats.' },
  chalkboard: { name: 'Sidewalk chalkboard', sprite: 'decor_chalkboard', price: 30, comfort: 2, slots: ['floor_r1'], h: 118, fn: 'walkins', blurb: 'Specials and doodles. Draws in more walk-ins.' },
  record_player: { name: 'Record player', sprite: 'decor_record_player', price: 90, comfort: 9, slots: ['lounge_table', 'h_table'], h: 66, fn: 'music', blurb: 'Choose what the shop listens to.' },
  kettle: { name: 'Tea kettle', sprite: 'decor_kettle', price: 35, comfort: 6, slots: ['lounge_table', 'counter_top'], h: 58, fn: 'tea', blurb: 'Free tea for anyone waiting. People linger (nicely).' },
  rug: { name: 'Woven rug', sprite: 'decor_rug', price: 50, comfort: 6, slots: ['rug', 'h_rug'], w: 230, flat: true, blurb: 'Softens the tile and the mood.' },
  plastic_chair: { name: 'Plastic chair', sprite: 'furn_plastic_chair', price: 25, comfort: 3, slots: ['seat'], h: 150, blurb: 'Classic laundromat seating.' },
  stool: { name: 'Stool', sprite: 'furn_stool', price: 22, comfort: 2, slots: ['seat'], h: 138, blurb: 'Good for folding marathons.' },
  double_bench: { name: 'Double bench', sprite: 'furn_double_bench', price: 70, comfort: 7, slots: ['seat'], h: 140, blurb: 'Room for two, plus a bag of laundry.' },
  lantern: { name: 'Old lantern', sprite: 'item_lantern', price: 28, comfort: 4, slots: ['sill', 'sill2', 'h_shelf', 'h_table'], h: 70, light: true, blurb: 'Handy when the power goes out.' },
};

// Machines & practical upgrades.
export const UPGRADES = {
  cart: { name: 'Laundry cart', sprite: 'furn_laundry_cart', price: 95, blurb: 'Carry two loads at once.' },
  sign: { name: 'New shop sign', sprite: 'decor_hanging_sign', price: 60, blurb: 'A hanging sign out front — and a chance to name the place.' },
  fold_board: { name: 'Folding board', sprite: 'item_ironing_board', price: 45, blurb: 'Neater folds, faster. Folding is more forgiving.' },
  tool_kit: { name: 'Proper tool kit', sprite: 'icon_wrench', price: 70, blurb: 'Repairs go smoother and last longer.' },
};

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
