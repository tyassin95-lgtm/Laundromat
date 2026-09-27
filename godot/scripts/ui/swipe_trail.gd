extends Node2D
## Little fading dots where your finger swipes across the folding board.

var dots: Array[Dictionary] = []


func add(p: Vector2) -> void:
	dots.append({"p": p, "t": 0.0})


func _process(dt: float) -> void:
	for i in range(dots.size() - 1, -1, -1):
		dots[i].t += dt
		if dots[i].t > 0.4:
			dots.remove_at(i)
	queue_redraw()


func _draw() -> void:
	for d in dots:
		var k: float = 1.0 - d.t / 0.4
		draw_circle(d.p, 9.6 * (0.2 + 0.8 * k), Color(1.0, 240 / 255.0, 200 / 255.0, 0.8 * k))
