extends Button
## The round badge of a map pin (rust-ringed where you are).


func _draw() -> void:
	var c := size / 2.0
	var r := minf(size.x, size.y) / 2.0
	var here: bool = get_meta("here", false)
	if here:
		draw_circle(c, r + 4.8, Color(196 / 255.0, 105 / 255.0, 46 / 255.0, 0.4))
	draw_circle(c + Vector2(0, 4), r, Color(0, 0, 0, 0.35))
	draw_circle(c, r, Color("#f6e7c8"))
	draw_arc(c, r - 1.6, 0, TAU, 48, Color("#c4692e") if here else Color("#2b4d55"), 3.2, true)
