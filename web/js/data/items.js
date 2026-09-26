// Inventory items. "tags" are matched against characters' loves/likes/dislikes for gifts.
export const ITEMS = {
  detergent: { name: 'Detergent', sprite: 'item_detergent', kind: 'supply', unit: 'loads' },
  softener: { name: 'Softener', sprite: 'item_softener', kind: 'supply', unit: 'loads' },
  parts: { name: 'Spare parts', sprite: 'icon_wrench', kind: 'supply', unit: 'kits' },
  tea: { name: 'Tea', sprite: 'item_teacup', kind: 'supply', gift: true, tags: ['tea'], unit: 'cups', blurb: 'A good strong cup. +energy.' },

  sketch: { name: 'Sketch', sprite: 'item_sketchbook', gift: true, tags: ['sketch'], blurb: 'A page torn carefully from your sketchbook.' },
  scarf: { name: 'Hand-knit scarf', sprite: 'item_yarn_basket', gift: true, tags: ['scarf'], blurb: 'Lumpy in places. Warm everywhere.' },
  photo: { name: 'Photograph', sprite: 'item_camera', gift: true, tags: ['photo'], blurb: 'A print from Rosa\'s old camera.' },
  photo_night: { name: 'Night photograph', sprite: 'item_camera', gift: true, tags: ['photo', 'photo_night'], blurb: 'City lights on the river.' },
  photo_garden: { name: 'Garden photograph', sprite: 'item_camera', gift: true, tags: ['photo', 'photo_garden'], blurb: 'Tomatoes, marigolds, and one suspicious squirrel.' },
  flowers: { name: 'Garden flowers', sprite: 'decor_flower_vase', gift: true, tags: ['flowers'], blurb: 'Daisies and marigolds from the community garden.' },
  cutting: { name: 'Pothos cutting', sprite: 'item_pothos', gift: true, tags: ['cutting'], blurb: 'A rooted cutting in a little pot.' },
  coffee: { name: 'Corner Cup coffee', sprite: 'item_coffee_mug', gift: true, tags: ['coffee'], blurb: 'Still warm. Remy drew a heart in the foam.' },
  lemon_bars: { name: 'Lemon bars', sprite: 'item_picnic_basket', gift: true, tags: ['lemon_bars'], blurb: 'June\'s famous recipe. Powdered sugar everywhere.' },
  maamoul: { name: 'Ma\'amoul', sprite: 'item_picnic_basket', gift: true, tags: ['lemon_bars', 'maamoul'], blurb: 'Mrs. Haddad\'s date-and-walnut cookies. Her mother\'s recipe.' },
  record: { name: 'Vinyl record', sprite: 'item_vinyl', gift: true, tags: ['record'], blurb: 'Second-hand, slightly warped, lovely.' },
  spray_paint: { name: 'Spray paint', sprite: 'item_spray_bottle', gift: true, tags: ['spray_paint'], blurb: 'Six cans in "Rosa teal."' },
  photo_rosa: { name: 'Photo of Rosa', sprite: 'item_journal', gift: false, tags: ['photo_rosa'], blurb: 'Rosa, Peg and a young Walt in front of the shop, 1974.' },
};

export const RECORDS = {
  title: { name: 'Gymnopédie No. 1', artist: 'Satie (arr. K. MacLeod)', blurb: 'Rosa\'s rainy-day record.' },
  laundromat_day2: { name: 'Lobby Time', artist: 'Kevin MacLeod', blurb: 'Waiting-room jazz. Perfect for a laundromat.' },
  laundromat_day: { name: 'Local Forecast', artist: 'Kevin MacLeod', blurb: 'Bouncy elevator bossa.' },
  laundromat_night: { name: 'Wallpaper', artist: 'Kevin MacLeod', blurb: 'Late-night lounge.' },
  lounge_night: { name: 'Backbay Lounge', artist: 'Kevin MacLeod', blurb: 'Smoky and slow.' },
  cafe: { name: 'Bossa Antigua', artist: 'Kevin MacLeod', blurb: 'Remy plays this on repeat at the café.' },
  street: { name: 'Sidewalk Shade', artist: 'Kevin MacLeod', blurb: 'Strolling music.' },
  park: { name: 'Laid Back Guitars', artist: 'Kevin MacLeod', blurb: 'Sunny afternoon strings.' },
  garden: { name: 'Porch Swing Days', artist: 'Kevin MacLeod', blurb: 'June hums along.' },
  home_night: { name: 'Fireflies and Stardust', artist: 'Kevin MacLeod', blurb: 'For staying up too late.' },
  community: { name: 'Carefree', artist: 'Kevin MacLeod', blurb: 'Impossible not to tap your foot.' },
};

export const SOCKS = [
  { id: 'argyle', name: 'Argyle sock', where: 'shop' },
  { id: 'tube', name: 'Striped tube sock', where: 'shop' },
  { id: 'baby', name: 'Tiny baby sock', where: 'shop' },
  { id: 'wool', name: 'Hand-knit wool sock', where: 'shop' },
  { id: 'dino', name: 'Dinosaur sock', where: 'shop' },
  { id: 'sport', name: 'Mud-caked sport sock', where: 'shop' },
  { id: 'dress', name: 'Silk dress sock', where: 'shop' },
  { id: 'polka', name: 'Polka-dot sock', where: 'street' },
  { id: 'toe', name: 'Toe sock', where: 'park' },
  { id: 'holiday', name: 'Holiday sock (in September)', where: 'garden' },
  { id: 'compression', name: 'Compression sock', where: 'riverside' },
  { id: 'lucky', name: 'Kai\'s lucky sock', where: 'shop' },
];
