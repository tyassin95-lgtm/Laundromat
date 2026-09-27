class_name Rain extends Node2D
## Rain over an exterior, in screen space (put it in a CanvasLayer): streaks at two depths and
## little splashes where they hit the ground line.

@export var ground_y := 700.0
## 0 (dry) .. 1 (downpour)
@export var intensity := 0.0
@export var wind := -0.18

var drops: Array[Dictionary] = []
var splashes: Array[Dictionary] = []
var _r := Rng.shared


func update(dt: float) -> void:
	var vw := get_viewport_rect().size.x
	var target := int(floor(intensity * 260))
	while drops.size() < target:
		drops.append(_new_drop(vw, true))
	if drops.size() > target:
		drops.resize(target)
	for d in drops:
		d.y += d.v * dt
		d.x += d.v * wind * dt
		if d.y > ground_y + d.z * 60:
			if d.z > 0.6 and splashes.size() < 80:
				splashes.append({"x": d.x, "y": ground_y + d.z * 60, "t": 0.0})
			d.merge(_new_drop(vw, false), true)
	for i in range(splashes.size() - 1, -1, -1):
		splashes[i].t += dt
		if splashes[i].t > 0.25:
			splashes.remove_at(i)
	queue_redraw()


func _new_drop(vw: float, anywhere: bool) -> Dictionary:
	var z := _r.next()
	return {"x": _r.next() * (vw + 200) - 50, "y": _r.next() * 720 if anywhere else -_r.next() * 200, "v": 900 + z * 700, "len": 14 + z * 24, "z": z}


func _draw() -> void:
	for d in drops:
		var col := Color(200 / 255.0, 215 / 255.0, 235 / 255.0, 0.12 + d.z * 0.25)
		draw_line(Vector2(d.x, d.y), Vector2(d.x - d.len * wind, d.y - d.len), col, 0.8 + d.z * 1.2, true)
	for s in splashes:
		var r: float = 3 + s.t * 30
		var col := Color(210 / 255.0, 225 / 255.0, 240 / 255.0, 0.5 * (1.0 - s.t / 0.25))
		var pts := PackedVector2Array()
		for k in 21:
			var a := k * TAU / 20.0
			pts.append(Vector2(s.x + cos(a) * r, s.y + sin(a) * r * 0.3))
		draw_polyline(pts, col, 1.0, true)
