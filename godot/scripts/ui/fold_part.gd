class_name FoldPart extends Panel
## A piece of a garment on the folding board (a sleeve, a leg, half a towel), in the load's colour.

var kind := ""
var id := ""


func setup(garment: String, part_id: String, color: Color) -> void:
	kind = garment
	id = part_id
	var s := get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	s.bg_color = color
	add_theme_stylebox_override("panel", s)
	queue_redraw()


func _draw() -> void:
	var ink := Color("#2e2218")
	# a woven look: faint stripes
	var x := 4.0
	while x < size.x - 4:
		draw_line(Vector2(x, 4), Vector2(x, size.y - 4), Color(1, 1, 1, 0.07), 2.0)
		x += 8.0
	draw_rect(Rect2(3.5, size.y * 0.72, size.x - 7, size.y * 0.28 - 3.5), Color(0, 0, 0, 0.12))
	if kind == "shirt" and id == "body":
		# the collar and a line of buttons
		var cw := size.x * 0.34
		var pts := PackedVector2Array()
		for i in 13:
			var a := PI * i / 12.0
			pts.append(Vector2(size.x / 2.0 - cos(a) * cw / 2.0, -3.5 + sin(a) * size.y * 0.13))
		draw_colored_polygon(pts, Color(0, 0, 0, 0.28))
		draw_polyline(pts, ink, 2.9)
		var y := size.y * 0.18 + 11.2
		while y < size.y * 0.92:
			draw_circle(Vector2(size.x / 2.0, y), 4.2, ink)
			draw_circle(Vector2(size.x / 2.0, y), 2.4, Color("#f4ead2"))
			y += 38.4
	elif kind == "towel":
		var y := size.y * 0.81
		draw_rect(Rect2(3.5, y, size.x - 7, size.y * 0.09), Color(1, 0.97, 0.9, 0.4))
		draw_rect(Rect2(3.5, y - 13.6, size.x - 7, size.y * 0.05), Color(1, 0.97, 0.9, 0.25))
	elif kind == "pants" and id == "top":
		draw_circle(Vector2(size.x / 2.0, size.y * 0.2 + 6.4), 6.4, ink)
		draw_circle(Vector2(size.x / 2.0, size.y * 0.2 + 6.4), 4.5, Color("#c9a24c"))
