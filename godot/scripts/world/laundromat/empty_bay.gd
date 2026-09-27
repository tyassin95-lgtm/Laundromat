@tool
extends Node2D
## An empty bay: the hook-ups wait over a dusty outline, with a soft "+" to buy a machine for it.

@export var half_width := 60.0
@export var height := 206.0

var _t := 0.0


func _process(dt: float) -> void:
	_t += dt
	queue_redraw()


func _draw() -> void:
	var col := Color(Color("#5a4a3a"), 0.5)
	var r := Rect2(-half_width, -height + 6, half_width * 2.0, height - 8)
	for side in [[r.position, Vector2(r.end.x, r.position.y)], [Vector2(r.end.x, r.position.y), r.end], [r.end, Vector2(r.position.x, r.end.y)], [Vector2(r.position.x, r.end.y), r.position]]:
		draw_dashed_line(side[0], side[1], col, 2.0, 6.0)
	var p := 1.0 + sin(_t * 2.2) * 0.04
	draw_set_transform(Vector2(0, -height / 2.0), 0.0, Vector2(p, p))
	draw_circle(Vector2.ZERO, 17, Color(Color("#f7ecd4"), 0.75))
	draw_arc(Vector2.ZERO, 17, 0, TAU, 32, Color(Color("#2b5a60"), 0.75), 2.5, true)
	draw_rect(Rect2(-8, -2, 16, 4), Color(Color("#2b5a60"), 0.75))
	draw_rect(Rect2(-2, -8, 4, 16), Color(Color("#2b5a60"), 0.75))
	draw_set_transform(Vector2.ZERO)
