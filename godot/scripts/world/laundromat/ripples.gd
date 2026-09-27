extends Node2D
## A little ring where you tap the floor.

var ripples: Array[Dictionary] = []


func add(p: Vector2) -> void:
	ripples.append({"p": p, "t": 0.0})


func _process(dt: float) -> void:
	for i in range(ripples.size() - 1, -1, -1):
		ripples[i].t += dt
		if ripples[i].t >= 0.45:
			ripples.remove_at(i)
	queue_redraw()


func _draw() -> void:
	for r in ripples:
		var rad: float = 10.0 + r.t * 70.0
		var pts := PackedVector2Array()
		for k in 33:
			var a := k * TAU / 32.0
			pts.append(r.p + Vector2(cos(a) * rad, sin(a) * rad * 0.35))
		draw_polyline(pts, Color(Color("#fff3d0"), 1.0 - r.t / 0.45), 2.5, true)
