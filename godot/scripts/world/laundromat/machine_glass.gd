class_name MachineGlass extends Node2D
## A closed door's glass: a faint tint and a curved highlight (a little steam when washing).

var machine := {}
var radius := 20.0


func show_glass(m: Dictionary, r: float) -> void:
	machine = m
	radius = r
	queue_redraw()


func _draw() -> void:
	var r := radius
	draw_circle(Vector2.ZERO, r, Color(200 / 255.0, 225 / 255.0, 240 / 255.0, 0.12))
	if not machine.is_empty() and machine.kind == "washer" and MachineUnit.running(machine):
		# steam on the top of the glass, down to just above the middle
		var a := asin(0.1)
		var pts := PackedVector2Array()
		for i in 25:
			var th := lerpf(PI + a, TAU - a, i / 24.0)
			pts.append(Vector2(cos(th), sin(th)) * r)
		draw_colored_polygon(pts, Color(235 / 255.0, 242 / 255.0, 248 / 255.0, 0.16))
	draw_arc(Vector2.ZERO, r * 0.74, PI * 1.1, PI * 1.42, 16, Color(1, 1, 1, 0.5), r * 0.09, true)
	draw_circle(Vector2(-r * 0.18, -r * 0.62), r * 0.06, Color(1, 1, 1, 0.55))
