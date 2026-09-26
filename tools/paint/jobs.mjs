// Which backgrounds tools/bake_backgrounds.mjs renders: scene -> [variant, file, format, quality]
export const JOBS = {
  laundromat: [['base', 'laundromat.webp']],
  home: [['base', 'home.webp']],
  linden: [['base', 'linden.webp'], ['closed', 'linden_closed.webp'], ['lights', 'linden_lights.webp']],
  skyline: [['base', 'skyline.webp'], ['lights', 'skyline_lights.webp']],
  park: [['base', 'park.webp']],
  garden: [['base', 'garden.webp'], ['lights', 'garden_lights.webp']],
  riverside: [['base', 'riverside.webp']],
  map: [['base', 'map.webp']],
};
export const SCALES = { skyline: 1.0 };
