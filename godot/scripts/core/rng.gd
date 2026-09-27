class_name Rng extends RefCounted
## A seeded random number generator with the helpers the game uses.
## The same seed always gives the same sequence (daily plans, weather, chatter picks).

var _r := RandomNumberGenerator.new()


func _init(seed_value: int = -1) -> void:
	if seed_value < 0:
		_r.randomize()
	else:
		_r.seed = seed_value


## 0 <= x < 1
func next() -> float:
	return _r.randf()


func range_f(lo: float, hi: float) -> float:
	return lo + (hi - lo) * _r.randf()


## lo..hi inclusive
func range_i(lo: int, hi: int) -> int:
	return int(floor(lo + (hi - lo + 1) * _r.randf()))


func pick(arr: Array) -> Variant:
	if arr.is_empty():
		return null
	return arr[int(floor(_r.randf() * arr.size()))]


func chance(p: float) -> bool:
	return _r.randf() < p


func shuffle(arr: Array) -> Array:
	var a := arr.duplicate()
	for i in range(a.size() - 1, 0, -1):
		var j := int(floor(_r.randf() * (i + 1)))
		var t: Variant = a[i]
		a[i] = a[j]
		a[j] = t
	return a


## The unseeded generator shared by the whole game (effects, jitter, one-off picks).
static var shared := Rng.new()
