extends Node2D
## Draws an Actor's hop effects, like the art: soft paper-white dust clouds and little gold stars,
## both with an ink outline so they read on a pale floor as well as a dark street.


func _draw() -> void:
	var a := get_parent() as Actor
	if a == null or a.motes.is_empty():
		return
	var o := -global_position
	var k := a.char_scale
	for m in a.motes:
		var t: float = m.life / m.max
		var p := Vector2(m.x, m.y) + o
		if m.kind == "puff":
			var al := minf(1.0, t * 1.6) * 0.9 * a.alpha
			var pts := _ellipse(p, m.size, m.size * 0.7)
			draw_colored_polygon(pts, Color(Color("#f8f0e0"), al))
			pts.append(pts[0])
			draw_polyline(pts, Color(70 / 255.0, 50 / 255.0, 34 / 255.0, 0.55 * al), 1.4 * k, true)
		else:
			var al := minf(1.0, t * 1.8) * a.alpha
			var s: float = m.size * (0.55 + t * 0.6)
			var pts := _star(p, s)
			draw_colored_polygon(pts, Color(Color("#f7cd5c"), al))
			pts.append(pts[0])
			draw_polyline(pts, Color(58 / 255.0, 40 / 255.0, 24 / 255.0, 0.8 * al), 1.3 * k, true)


static func _ellipse(c: Vector2, rx: float, ry: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in 20:
		var a := i * TAU / 20.0
		pts.append(c + Vector2(cos(a) * rx, sin(a) * ry))
	return pts


## A four-pointed sparkle with curved sides.
static func _star(c: Vector2, s: float) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var tips := [Vector2(0, -s), Vector2(s, 0), Vector2(0, s), Vector2(-s, 0)]
	for i in 4:
		var a: Vector2 = tips[i]
		var b: Vector2 = tips[(i + 1) % 4]
		var ctrl := (a + b) * 0.18
		for j in 6:
			var u := j / 6.0
			pts.append(c + (1 - u) * (1 - u) * a + 2 * (1 - u) * u * ctrl + u * u * b)
	return pts
