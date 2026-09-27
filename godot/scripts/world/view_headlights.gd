extends Node2D
## Car headlights and tail lights in a StreetView at night (additive).


func _draw() -> void:
	var view := get_parent() as StreetView
	var n := DayLight.nightness(G.time)
	if n <= 0.02:
		return
	var halo := Halo.texture()
	for m in view.movers:
		if not m.get("car", false):
			continue
		var ry: float = m.y - m.hh * 0.32
		var front := Vector2(m.x + m.dir * m.w * 0.47, ry)
		var back := Vector2(m.x - m.dir * m.w * 0.47, ry)
		draw_texture_rect(halo, Rect2(front - Vector2(26, 26), Vector2(52, 52)), false, Color(Color8(255, 236, 190), 0.55 * n))
		draw_texture_rect(halo, Rect2(back - Vector2(12, 12), Vector2(24, 24)), false, Color(Color8(255, 60, 50), 0.5 * n))
