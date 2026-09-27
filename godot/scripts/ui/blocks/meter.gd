class_name Meter extends Control
## A rounded bar filling from teal to gold.

var value := 0.0


func setup(v: float) -> void:
	value = clampf(v, 0.0, 1.0)
	queue_redraw()


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	draw_style_box(_box(Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.15)), r)
	if value > 0:
		var w := size.x * value
		var pts := PackedVector2Array([Vector2(0, 0), Vector2(w, 0), Vector2(w, size.y), Vector2(0, size.y)])
		var a := Color("#3f6c74")
		var b := a.lerp(Color("#e8b04e"), value)
		draw_polygon(pts, PackedColorArray([a, b, b, a]))


func _box(c: Color) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = c
	s.set_corner_radius_all(int(size.y / 2))
	return s
