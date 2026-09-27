class_name EnergyBar extends Control
## Your energy: a rounded bar, red to gold to green.

var value := 1.0:
	set(v):
		value = clampf(v, 0.0, 1.0)
		queue_redraw()


func _draw() -> void:
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.2)
	bg.set_corner_radius_all(int(size.y / 2))
	bg.set_border_width_all(2)
	bg.border_color = Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.35)
	draw_style_box(bg, Rect2(Vector2.ZERO, size))
	var w := (size.x - 3.2) * value
	if w <= 0:
		return
	var h := size.y - 3.2
	var o := Vector2(1.6, 1.6)
	var a := Color("#d96a3c")
	var b := Color("#e8b04e")
	var c := Color("#7fa860")
	var mid := w * 0.45
	draw_polygon(PackedVector2Array([o, o + Vector2(mid, 0), o + Vector2(mid, h), o + Vector2(0, h)]), PackedColorArray([a, b, b, a]))
	draw_polygon(PackedVector2Array([o + Vector2(mid, 0), o + Vector2(w, 0), o + Vector2(w, h), o + Vector2(mid, h)]), PackedColorArray([b, c, c, b]))
