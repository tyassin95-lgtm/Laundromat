class_name CharactersData
## Characters: portraits (face_<portrait>_<expr>), in-world sprites, voices, gift tastes and
## routines. Heights are in virtual px for interiors; exteriors scale them by the scene's
## character scale. A character without a portrait speaks with just a name plate, and one without
## an in-world sprite is heard (at the counter) rather than seen.

## The nine portraits every character sheet has.
const EXPRS9 := ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"]

const CHARACTERS := {
	"me": {
		"name": "{name}",
		"portrait": "player",
		"side": "left",
		"voice": 1.12,
		"color": "#3f6c74",
		"exprs": ["neutral", "laugh", "worried", "surprised", "tired", "thinking", "smug", "sad", "wink"],
		"defaultExpr": "neutral",
	},
	"walt": {
		"name": "Walt",
		"full": "Walt Szymanski",
		"portrait": "walt",
		"side": "right",
		"voice": 0.72,
		"color": "#b7773a",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_walt",
		"h": 290,
		"faces": 1,
		"blurb": "Retired machinist. Tuesdays and Fridays, 9 a.m. sharp, since 1981.",
		"loves": ["scarf", "coffee", "photo_rosa", "toolkit"],
		"likes": ["tea", "sketch", "photo", "lemon_bars", "record"],
		"dislikes": ["flowers"],
	},
	"maya": {
		"name": "Maya",
		"full": "Maya Okafor",
		"portrait": "maya",
		"side": "right",
		"voice": 1.25,
		"color": "#d9a02e",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_maya",
		"h": 272,
		"faces": 1,
		"blurb": "Music student. Night shifts at the pharmacy. Headphones always on.",
		"loves": ["record", "photo_night", "coffee"],
		"likes": ["sketch", "tea", "lemon_bars", "photo", "scarf"],
		"dislikes": ["knit_hat"],
	},
	"june": {
		"name": "June",
		"full": "June Ito",
		"portrait": "june",
		"side": "right",
		"voice": 1.02,
		"color": "#c0562a",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_june",
		"h": 252,
		"faces": 1,
		"blurb": "Taught third grade for 38 years. Runs the community garden. Lives next door.",
		"loves": ["flowers", "cutting", "scarf", "photo_garden"],
		"likes": ["tea", "sketch", "photo", "record", "lemon_bars"],
		"dislikes": ["coffee"],
	},
	"remy": {
		"name": "Remy",
		"full": "Remy Castillo",
		"portrait": "remy",
		"side": "right",
		"voice": 1.18,
		"color": "#d77a9a",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_remy",
		"h": 268,
		"faces": 1,
		"blurb": "Barista at the Corner Cup. Paints murals. Knows everyone on Linden Street.",
		"loves": ["sketch", "photo", "spray_paint"],
		"likes": ["record", "coffee", "scarf", "lemon_bars"],
		"dislikes": ["tea"],
	},
	"delgado": {
		"name": "Luis",
		"full": "Luis Delgado",
		"portrait": "luis",
		"side": "right",
		"voice": 0.8,
		"color": "#5f7f3a",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_luis",
		"h": 286,
		"neighbour": true,
		"icon": "item_apron",
		"blurb": "Runs Delgado's Market across the street, the corner store his father opened thirty-one years ago. Calls everyone mija.",
		"loves": ["coffee", "record"],
		"likes": ["photo", "lemon_bars", "tea", "sketch"],
		"dislikes": ["spray_paint"],
	},
	"priya": {
		"name": "Priya",
		"full": "Priya Raman",
		"portrait": "priya",
		"side": "right",
		"voice": 1.14,
		"color": "#2f8a86",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_priya",
		"h": 262,
		"neighbour": true,
		"icon": "item_coffee_mug",
		"blurb": "Bakes the bread at Ferrante's on Alder Street, from two in the morning. Wants her aprons folded like presents.",
		"loves": ["coffee", "lemon_bars"],
		"likes": ["tea", "scarf", "record"],
		"dislikes": ["flowers"],
	},
	"haddad": {
		"name": "Sami",
		"full": "Sami Haddad",
		"portrait": "haddad",
		"side": "right",
		"voice": 0.98,
		"color": "#7a4a86",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_haddad",
		"h": 280,
		"neighbour": true,
		"icon": "item_hamper",
		"blurb": "Grad student. Brings his grandmother's laundry down from Alder Arms 3C every week. Lavender softener only: her orders.",
		"loves": ["flowers", "cutting"],
		"likes": ["tea", "photo", "scarf", "lemon_bars"],
		"dislikes": ["coffee"],
	},
	"kai": {
		"name": "Kai",
		"full": "Kai",
		"portrait": "kai",
		"side": "right",
		"voice": 1.22,
		"color": "#3f7f86",
		"exprs": ["smile", "laugh", "worried", "thinking", "tired", "surprised", "content", "sad", "sly"],
		"defaultExpr": "smile",
		"sprite": "npc_kai",
		"h": 266,
		"neighbour": true,
		"icon": "item_drawstring_bag",
		"blurb": "Bike courier, always soaked. Investigating where the socks go.",
		"loves": ["spray_paint", "coffee"],
		"likes": ["photo", "sketch", "record"],
		"dislikes": ["tea"],
	},
	"grant": {"name": "Grant Holloway", "portrait": null, "side": "right", "voice": 0.9, "color": "#3b4a5c"},
	"rosa": {"name": "Rosa", "portrait": null, "side": "right", "voice": 1, "color": "#b3402f"},
	"biscuit": {"name": "Biscuit", "portrait": null, "side": "right", "voice": 1.6, "color": "#d9892e"},
}

const FRIEND_IDS := ["walt", "maya", "june", "remy"]
const NEIGHBOUR_IDS := ["delgado", "priya", "haddad", "kai"]

## Where each friend can be found. Days: 0 = Monday ... 6 = Sunday.
##   shift: visits the laundromat at a given time (minutes) on listed weekdays.
##   evening: location they hang out at in the evening on listed weekdays.
##   from: first day of that routine (neighbours).
const ROUTINES := {
	"walt": {
		"shift": [{"days": [1, 4], "at": 540, "stay": 90}, {"days": [0, 2, 3, 5], "at": 930, "stay": 40, "chance": 0.5}],
		"evening": {"park": [0, 1, 2, 3, 4, 5, 6]},
	},
	"maya": {"shift": [{"days": [0, 2, 4, 5], "at": 860, "stay": 80}], "evening": {"riverside": [0, 3, 5], "laundromat_night": [1, 2, 4], "street": [6]}},
	"june": {"shift": [{"days": [0, 2, 5], "at": 780, "stay": 70}], "evening": {"garden": [0, 1, 2, 3, 4, 5], "street": [6]}},
	"remy": {"shift": [{"days": [1, 3, 5], "at": 660, "stay": 45}], "evening": {"street": [0, 1, 2, 3, 4, 5], "riverside": [6]}},
	"delgado": {"evening": {"street": [0, 1, 2, 3, 4], "park": [6]}, "from": 14},
	"priya": {"evening": {"riverside": [5, 6]}},
	"haddad": {"evening": {"garden": [1, 3, 5]}},
	"kai": {"evening": {"street": [0, 2, 4], "park": [1, 3]}},
}

## Expressions a script may ask for that a character doesn't have map to the closest one.
const NINE := {
	"neutral": "smile", "happy": "laugh", "excited": "laugh", "grin": "smile", "gentle": "content", "shy": "content",
	"wink": "sly", "smug": "sly", "skeptical": "sly", "annoyed": "tired", "angry": "sad", "surprised": "surprised",
}
const PLAYER_ALIASES := {
	"content": "wink", "happy": "laugh", "excited": "laugh", "smile": "neutral", "gentle": "neutral", "angry": "smug",
	"shy": "worried", "sly": "smug", "grin": "laugh", "annoyed": "tired", "skeptical": "smug",
}


## The portrait sprite for a character and expression (with fallbacks), or "".
static func portrait_for(id: String, expr: String = "") -> String:
	var c: Dictionary = CHARACTERS.get(id, {})
	if c.get("portrait") == null:
		return ""
	var e: String = expr if expr != "" else c.defaultExpr
	if not e in c.exprs:
		var aliases: Dictionary = PLAYER_ALIASES if id == "me" else NINE
		e = aliases.get(e, c.defaultExpr)
	var name := "face_%s_%s" % [c.portrait, e]
	if Util.has_sprite(name):
		return name
	var fallback := "face_%s_%s" % [c.portrait, c.defaultExpr]
	return fallback if Util.has_sprite(fallback) else ""


## Has in-world art (so they can be placed in a scene)?
static func has_sprite(id: String) -> bool:
	var c: Dictionary = CHARACTERS.get(id, {})
	return c.has("sprite") and Util.has_sprite(c.sprite)


## Something to show for a character in menus: their portrait, or failing that their icon.
static func face_or_icon(id: String, expr: String = "") -> String:
	var p := portrait_for(id, expr)
	if p != "":
		return p
	return CHARACTERS.get(id, {}).get("icon", "icon_speech")


static func display_name(id: String) -> String:
	var c: Dictionary = CHARACTERS.get(id, {})
	return String(c.get("name", "")).replace("{name}", G.player_name)
