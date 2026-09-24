// Which backgrounds tools/bake_backgrounds.mjs renders: scene -> [variant, file, format, quality]
export const JOBS = {
  laundromat: [['base', 'laundromat.webp']],
  home: [['base', 'home.webp']],
  linden: [['base', 'linden.webp'], ['closed', 'linden_closed.webp'], ['lights', 'linden_lights.webp']],
  outside: [['base', 'outside.webp'], ['lights', 'outside_lights.webp']],
  skyline: [['base', 'skyline.webp'], ['lights', 'skyline_lights.webp']],
  park: [['base', 'park.webp'], ['lights', 'park_lights.webp']],
  garden: [['base', 'garden.webp'], ['lights', 'garden_lights.webp']],
  riverside: [['base', 'riverside.webp'], ['lights', 'riverside_lights.webp']],
  map: [['base', 'map.webp']],
};
export const SCALES = { outside: 1.2, skyline: 1.0 };
