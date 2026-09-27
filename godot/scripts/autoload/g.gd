extends Node
## The game state: everything that is saved, plus small helpers that read or change it.
## Autoloaded as G (G.day, G.money, G.flags...).

const SAVE_VERSION := 3
const STORY_DAYS := 28
const WEEKDAYS := ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKDAYS_LONG := ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const FRIENDS := ["walt", "maya", "june", "remy"]
const NEIGHBOURS := ["delgado", "priya", "haddad", "kai"]   # 5-heart friendships

var version := SAVE_VERSION
var player_name := "Nora"
var shop := "Rosa's"
var day := 1
var time := 420.0                   # minutes since midnight
var phase := "morning"              # morning | shift | evening | night
var location := "home"
var weather := "rain"
var money := 120.0
var energy := 100.0
var reputation := 28.0              # 0..100 -> stars
var cleanliness := 55.0             # 0..100
var community := 8.0                # 0..100 community spirit
var petition := 0
var flags := {}
var vars := {}
var hearts := {}                    # friendship points, 100 = one heart
var talked := {}                    # who -> day last talked
var gifted := {}                    # who -> day last gifted
var inv := {}
var decor := []                     # owned decor ids
var placed := {}                    # slot id -> decor id (home slots start with "h_")
var upgrades := []
var unlocked := []                  # machine models owned at some point (the upgrade tree)
var quests := {}                    # errands: id -> {state, day, at, steps, ...} (Quests)
var machines := []
var orders := []
var order_seq := 1
var shelf := []                     # order ids waiting for pickup
var skills := {}
var collections := {}
var policies := {}
var stats := {}
var today := {}
var diary := []
var ledger := []
var bills_paid := []
var debt := 0.0
var goal := ""
var ending := ""
var endings_seen := []
var record := ""                    # record playing on the record player
var seen := {}
var rng_seed := 0
var play_seconds := 0.0
var sim_save := {}                  # the shift in progress, when saved mid-shift
var saved_at := 0

## Saved fields, in order.
const FIELDS := ["version", "player_name", "shop", "day", "time", "phase", "location", "weather", "money", "energy",
	"reputation", "cleanliness", "community", "petition", "flags", "vars", "hearts", "talked", "gifted", "inv", "decor",
	"placed", "upgrades", "unlocked", "quests", "machines", "orders", "order_seq", "shelf", "skills", "collections",
	"policies", "stats", "today", "diary", "ledger", "bills_paid", "debt", "goal", "ending", "endings_seen", "record",
	"seen", "rng_seed", "play_seconds", "sim_save", "saved_at"]


func _ready() -> void:
	reset()


## A brand new game.
func reset(new_name: String = "Nora") -> void:
	for k in FIELDS:
		set(k, _default(k))
	player_name = new_name
	rng_seed = randi() % 1000000000


func _default(k: String) -> Variant:
	match k:
		"version": return SAVE_VERSION
		"player_name": return "Nora"
		"shop": return "Rosa's"
		"day": return 1
		"time": return 420.0
		"phase": return "morning"
		"location": return "home"
		"weather": return "rain"
		"money": return 120.0
		"energy": return 100.0
		"reputation": return 28.0
		"cleanliness": return 55.0
		"community": return 8.0
		"hearts": return {"walt": 0, "maya": 0, "june": 0, "remy": 0}
		"inv": return {"detergent": 10, "softener": 0, "parts": 1, "tea": 4}
		"unlocked": return ["classic", "stack"]
		"machines": return [
			{"id": "W1", "kind": "washer", "slot": 0, "model": "classic", "cond": 62.0, "broken": false},
			{"id": "W2", "kind": "washer", "slot": 1, "model": "classic", "cond": 55.0, "broken": false},
			{"id": "W3", "kind": "washer", "slot": 2, "model": "classic", "cond": 20.0, "broken": true},
			{"id": "D1", "kind": "dryer", "slot": 0, "model": "stack", "cond": 60.0, "broken": false},
			{"id": "D2", "kind": "dryer", "slot": 1, "model": "stack", "cond": 52.0, "broken": false},
		]
		"order_seq": return 1
		"skills": return {"repair": 0, "fold": 0, "sketch": 0, "knit": 0, "photo": 0}
		"collections": return {"socks": [], "records": ["title", "laundromat_day2"], "photos": [], "sketches": []}
		"policies": return {"prices": "normal", "freeTea": false, "pwyc": false}
		"stats": return {"orders": 0, "late": 0, "perfect": 0, "earned": 0.0, "tips": 0.0, "cycles": 0, "repairs": 0, "mopped": 0, "gifts": 0, "days": 0, "spent": 0.0}
		"today": return fresh_today()
		"petition", "saved_at": return 0
		"debt", "play_seconds": return 0.0
		"goal", "ending", "record": return ""
		"flags", "vars", "talked", "gifted", "placed", "quests", "seen", "sim_save": return {}
		"decor", "upgrades", "orders", "shelf", "diary", "ledger", "bills_paid", "endings_seen": return []
		"rng_seed": return 0
	return null


func fresh_today() -> Dictionary:
	return {"income": 0.0, "tips": 0.0, "expenses": 0.0, "orders": 0, "late": 0, "self_serve": 0.0, "hearts": {}, "notes": [], "events": [], "talked": [], "photos": 0}


func to_dict() -> Dictionary:
	var d := {}
	for k in FIELDS:
		d[k] = get(k)
	return d


## Loads a saved state. Fields added in later versions get their defaults, so old saves work.
func from_dict(d: Dictionary) -> void:
	reset(String(d.get("player_name", "Nora")))
	for k in FIELDS:
		if not d.has(k) or d[k] == null:
			continue
		var base: Variant = get(k)
		if base is Dictionary and d[k] is Dictionary and k in ["flags", "vars", "hearts", "inv", "placed", "skills", "collections", "policies", "stats", "today", "talked", "gifted", "seen", "quests"]:
			var merged: Dictionary = base.duplicate(true)
			merged.merge(d[k], true)
			set(k, merged)
		elif typeof(base) == TYPE_FLOAT and (d[k] is int or d[k] is float):
			set(k, float(d[k]))
		elif typeof(base) == TYPE_INT and (d[k] is int or d[k] is float):
			set(k, int(d[k]))
		else:
			set(k, d[k])
	version = SAVE_VERSION


# ------------------------------------------------------------------ derived helpers
func hearts_of(who: String) -> int:
	return int(floor(float(hearts.get(who, 0)) / 100.0))


func stars() -> float:
	return clampf(roundf(reputation / 20.0 * 2.0) / 2.0, 0.5, 5.0)


func week_of(d: int) -> int:
	return int(ceil(d / 7.0))


## 0 = Monday (Sept 1 is a Monday).
func weekday(d: int = -1) -> int:
	return ((day if d < 0 else d) - 1) % 7


func is_sunday(d: int = -1) -> bool:
	return weekday(d) == 6


func flag(f: String) -> bool:
	return ScriptLang.truthy(flags.get(f))


## The shop opens on Sundays only for pay-what-you-can afternoons (a policy June suggests).
func sunday_open() -> bool:
	return flag("open_sundays") or bool(policies.get("pwyc", false))


func pwyc_today() -> bool:
	return bool(policies.get("pwyc", false)) and is_sunday()


func var_num(key: String) -> float:
	var v: Variant = vars.get(key)
	return float(v) if (v is int or v is float) else 0.0


func add_money(amount: float, label: String = "", kind: String = "") -> void:
	money += amount
	if amount >= 0:
		today.income += amount
		if kind == "tip":
			today.tips += amount
		stats.earned += amount
	else:
		today.expenses += -amount
		stats.spent += -amount
	if label != "":
		ledger.append({"day": day, "label": label, "amount": roundf(amount * 100.0) / 100.0})
		if ledger.size() > 120:
			ledger = ledger.slice(ledger.size() - 120)


## Adds v to one of the 0..100 stats (energy, reputation, cleanliness, community).
func add_stat(key: String, v: float, lo: float = 0.0, hi: float = 100.0) -> void:
	set(key, clampf(float(get(key)) + v, lo, hi))


func has_item(id: String, n: float = 1) -> bool:
	return float(inv.get(id, 0)) >= n


func give_item(id: String, n: float = 1) -> void:
	inv[id] = inv.get(id, 0) + n


func take_item(id: String, n: float = 1) -> bool:
	if float(inv.get(id, 0)) < n:
		return false
	inv[id] -= n
	if inv[id] <= 0:
		inv.erase(id)
	return true


func date_label(d: int = -1) -> String:
	var dd := day if d < 0 else d
	if dd <= 30:
		return "%s · Sept %d" % [WEEKDAYS[weekday(dd)], dd]
	return "%s · Oct %d" % [WEEKDAYS[weekday(dd)], dd - 30]
