extends Control
## A bolt on the motor panel: steel, gold once tightened, a pulsing ring while it's the one to do.

var _t := 0.0


func _process(dt: float) -> void:
	_t += dt
	if get_meta("target", false):
		queue_redraw()


func _draw() -> void:
	var c := size / 2.0
	var r := size.x / 2.0
	var done: bool = get_meta("done", false)
	if get_meta("target", false):
		var k := 1.0 + 0.18 * (0.5 - 0.5 * cos(_t / 0.8 * TAU))
		draw_circle(c, (r + 5.6) * k, Color("#e8b04e"))
	draw_circle(c + Vector2(0, 4), r, Color(0, 0, 0, 0.5))
	var rim := Color("#7d6326") if done else Color("#5e5a52")
	var mid := Color("#c9a24c") if done else Color("#9a958a")
	var hi := Color("#f1e2a8") if done else Color("#e6e1d2")
	draw_circle(c, r, rim)
	draw_circle(c, r * 0.8, mid)
	draw_circle(c - Vector2(r, r) * 0.2, r * 0.45, Color(hi, 0.8))
	var hex := PackedVector2Array()
	var rot := PI / 2.0 if done else 0.0
	for i in 6:
		var a := rot + i * TAU / 6.0
		hex.append(c + Vector2(cos(a), sin(a)) * r * 0.45)
	draw_colored_polygon(hex, Color("#4a463f"))
