class_name StageBar extends Control
## The little progress segments on a ticket: done (teal), now (gold, blinking), to come.

var total := 3
var index := 0
var started := false
var _t := 0.0


func setup(n: int, idx: int, is_started: bool) -> void:
	total = n
	index = idx
	started = is_started
	queue_redraw()


func _process(dt: float) -> void:
	_t += dt
	queue_redraw()


func _draw() -> void:
	var gap := 2.4
	var w := (size.x - gap * (total - 1)) / total
	for i in total:
		var col := Color(58 / 255.0, 42 / 255.0, 30 / 255.0, 0.15)
		if i < index:
			col = Color("#3f6c74")
		elif i == index and started:
			col = Color("#e8b04e")
			col.a = 1.0 - 0.55 * (0.5 - 0.5 * cos(_t * TAU))
		var s := StyleBoxFlat.new()
		s.bg_color = col
		s.set_corner_radius_all(3)
		draw_style_box(s, Rect2(i * (w + gap), 0, w, size.y))
