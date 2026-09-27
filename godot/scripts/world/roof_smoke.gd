extends Node2D
## Chimney smoke over the rooftops (RoofView, the parent).


func _draw() -> void:
	var view := get_parent() as RoofView
	for p in view.smoke:
		draw_circle(Vector2(p.x, p.y), p.s, Color(235 / 255.0, 232 / 255.0, 228 / 255.0, 0.3 * (1.0 - p.a / 5.0)))
