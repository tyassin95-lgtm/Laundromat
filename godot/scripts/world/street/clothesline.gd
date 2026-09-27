@tool
extends Node2D
## June's clothesline: a sagging line between two posts, and the washing pegged along it (the
## Sprite2D children, top-anchored; move them along the line in the editor). They swing in the
## wind, harder in the rain and a lot in a storm.

@export var from_x := 100.0
@export var to_x := 1000.0
@export var line_y := 292.0
@export var sag := 30.0

var t := 0.0


func line_y_at(x: float) -> float:
	var u := (x - from_x) / (to_x - from_x)
	return line_y + 4.0 * sag * u * (1.0 - u)


func _process(dt: float) -> void:
	t += dt
	var wind := 1.0
	if not Engine.is_editor_hint():
		var w: String = App.location.weather_now() if App.location else "clear"
		wind = 3.0 if w == "storm" else 1.4 if w == "rain" else 1.0
	var i := 0
	for c in get_children():
		var s := c as Sprite2D
		if s == null:
			continue
		s.position.y = line_y_at(s.position.x) - 6.0
		s.rotation = (sin(t * (1.3 + i * 0.17) + i * 1.7) * 0.03 + (0.02 if wind > 1 else 0.0)) * wind
		i += 1
	queue_redraw()


func _draw() -> void:
	var pts := PackedVector2Array()
	for k in 41:
		var x := lerpf(from_x, to_x, k / 40.0)
		pts.append(Vector2(x, line_y_at(x)))
	draw_polyline(pts, Color("#3a2a1e"), 2.0, true)
