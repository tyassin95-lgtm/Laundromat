extends Control
## The timing gauge: a green zone and a red needle sweeping back and forth.


func _draw() -> void:
	var s := StyleBoxFlat.new()
	s.bg_color = Color(0, 0, 0, 0.45)
	s.set_corner_radius_all(16)
	s.set_border_width_all(2)
	s.border_color = Color(1, 1, 1, 0.3)
	draw_style_box(s, Rect2(Vector2.ZERO, size))
	var z: Vector2 = get_meta("zone", Vector2(40, 60))
	draw_rect(Rect2(size.x * z.x / 100.0, 2, size.x * (z.y - z.x) / 100.0, size.y - 4), Color(125 / 255.0, 190 / 255.0, 110 / 255.0, 0.75))
	var x: float = size.x * float(get_meta("needle", 0.0)) / 100.0
	draw_rect(Rect2(x - 4.4, 0, 8.8, size.y), Color("#fff3c4"))
	draw_rect(Rect2(x - 2.4, 0, 4.8, size.y), Color("#c4392e"))
