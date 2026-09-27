class_name Util
## Small shared helpers: easing, damping, text formatting.

const VH := 720.0          # the game's fixed virtual height (px); the width follows the screen


static func damp(a: float, b: float, lambda: float, dt: float) -> float:
	return lerpf(a, b, 1.0 - exp(-lambda * dt))


static func ease_in_quad(t: float) -> float:
	return t * t


static func ease_out_quad(t: float) -> float:
	return t * (2.0 - t)


static func ease_in_out_quad(t: float) -> float:
	return 2.0 * t * t if t < 0.5 else -1.0 + (4.0 - 2.0 * t) * t


static func ease_out_back(t: float) -> float:
	const C1 := 1.70158
	const C3 := C1 + 1.0
	return 1.0 + C3 * pow(t - 1.0, 3.0) + C1 * pow(t - 1.0, 2.0)


## "$1,234" (rounded), "-$5" for negatives.
static func money(n: float) -> String:
	var v := int(roundf(absf(n)))
	var s := str(v)
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-$" if n < 0 else "$") + s + out


## Minutes since midnight -> "9:05 AM".
static func clock_str(minutes: float) -> String:
	var m := int(floor(minutes))
	var h := (m / 60) % 24
	var mm := m % 60
	var ap := "PM" if h >= 12 else "AM"
	h = h % 12
	if h == 0:
		h = 12
	return "%d:%02d %s" % [h, mm, ap]


## FNV-1a string hash (32-bit).
static func hash_str(s: String) -> int:
	var h := 2166136261
	for i in s.length():
		h = h ^ s.unicode_at(i)
		h = (h * 16777619) & 0xFFFFFFFF
	return h


## Plain text into BBCode-safe text ("[" would start a tag).
static func escape_bb(s: String) -> String:
	return s.replace("[", "[lb]")


static func cap(s: String) -> String:
	return s.substr(0, 1).to_upper() + s.substr(1) if s != "" else s


## A sprite texture by its asset name (res://assets/sprites/<name>.webp), or null.
static func sprite(name: String) -> Texture2D:
	if name == "":
		return null
	var path := "res://assets/sprites/%s.webp" % name
	if not ResourceLoader.exists(path):
		return null
	return load(path)


static func has_sprite(name: String) -> bool:
	return name != "" and ResourceLoader.exists("res://assets/sprites/%s.webp" % name)


## A painted background (res://assets/bg/<name>.webp).
static func background(name: String) -> Texture2D:
	var path := "res://assets/bg/%s.webp" % name
	return load(path) if ResourceLoader.exists(path) else null


## Integer-valued floats (as JSON gives them back) turned back into ints, recursively.
static func fix_numbers(v: Variant) -> Variant:
	match typeof(v):
		TYPE_FLOAT:
			if is_finite(v) and v == floorf(v) and absf(v) < 1e15:
				return int(v)
			return v
		TYPE_DICTIONARY:
			var d := {}
			for k in v:
				d[k] = fix_numbers(v[k])
			return d
		TYPE_ARRAY:
			var a := []
			for x in v:
				a.append(fix_numbers(x))
			return a
	return v
