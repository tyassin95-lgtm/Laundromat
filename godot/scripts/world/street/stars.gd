extends Node2D
## Stars in the open sky over an exterior at night (screen space, drawn additively). They only
## show where the street's painting is see-through (Street.is_sky).

var stars: Array[Dictionary] = []


func _ready() -> void:
	var r := Rng.shared
	for i in 70:
		stars.append({"x": r.next() * 2400, "y": r.next() * 330, "s": r.range_f(0.6, 1.8), "p": r.next() * 6})


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	var loc := App.location as Street
	if loc == null:
		return
	var n := loc.night()
	if n <= 0.02:
		return
	var cam := App.camera
	var vw := cam.vw()
	var z := cam.zoom_k
	var wet := loc.weather_now() in ["rain", "storm"]
	for s in stars:
		var sx := fposmod(s.x - cam.x * 0.1, vw)
		if not loc.is_sky((sx - vw / 2.0 * (1.0 - z)) / z + cam.x, (s.y - 360.0 * (1.0 - z)) / z + cam.y):
			continue
		var a := (0.4 + 0.6 * absf(sin(loc.t + s.p))) * n * (0.2 if wet else 1.0)
		draw_rect(Rect2(sx, s.y, s.s, s.s), Color(1.0, 248 / 255.0, 230 / 255.0, a))
