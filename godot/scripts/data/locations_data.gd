class_name LocationsData
## Places on the neighbourhood map. How each place looks (its props, where people stand, what you
## can tap) is in its scene: res://scenes/world/<scene>.tscn.
##   map: pin position on the map (percent) · travel: minutes to get there · amb: ambience layers

const LOCATIONS := {
	"home": {
		"name": "Home",
		"scene": "home",
		"icon": "icon_home",
		"map": [55.5, 30],
		"travel": 5,
		"blurb": "The flat above the shop. Biscuit is probably asleep.",
	},
	"laundromat": {
		"name": "Rosa's",
		"scene": "laundromat",
		"icon": "icon_washer",
		"map": [62, 38.5],
		"travel": 5,
		"blurb": "Closed for the night — but the lights still work.",
	},
	"street": {
		"name": "Linden Street",
		"scene": "street",
		"icon": "icon_speech",
		"map": [72.5, 47],
		"travel": 10,
		"music": "street",
		"blurb": "The Corner Cup, Delgado's, and the old Cap & Seal lot.",
		"amb": {"amb_street": 0.45, "amb_city": 0.2},
	},
	"park": {
		"name": "Linden Park",
		"scene": "street",
		"icon": "icon_star",
		"map": [30, 16],
		"travel": 25,
		"music": "park",
		"blurb": "Pigeons, benches, and Walt's favourite bench.",
		"amb": {"amb_birds": 0.35, "amb_city": 0.15},
	},
	"garden": {
		"name": "Community Garden",
		"scene": "street",
		"icon": "icon_home",
		"map": [24, 69],
		"travel": 15,
		"music": "garden",
		"blurb": "Raised beds behind the Alder Arms. June's kingdom.",
		"amb": {"amb_birds": 0.3},
	},
	"riverside": {
		"name": "Riverside Walk",
		"scene": "street",
		"icon": "icon_map",
		"map": [76, 79],
		"travel": 20,
		"music": "home_night",
		"blurb": "The river, the bridge, the whole city lit up.",
		"amb": {"amb_city": 0.3, "amb_rain_out": 0},
	},
}

const MAP_ORDER := ["home", "laundromat", "street", "park", "garden", "riverside"]

## The scene file for each place.
const SCENES := {
	"home": "res://scenes/world/home.tscn",
	"laundromat": "res://scenes/world/laundromat.tscn",
	"street": "res://scenes/world/linden_street.tscn",
	"park": "res://scenes/world/park.tscn",
	"garden": "res://scenes/world/garden.tscn",
	"riverside": "res://scenes/world/riverside.tscn",
	"title": "res://scenes/world/title.tscn",
}
