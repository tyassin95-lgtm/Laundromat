extends Node2D
## The traffic and people going past in a StreetView (the parent), far lane first.

const ORDER := ["far", "road1", "road2", "near"]


func _draw() -> void:
	var view := get_parent() as StreetView
	for lane in ORDER:
		for m in view.movers:
			if m.lane != lane:
				continue
			var bob := 0.0
			var rot := 0.0
			if m.has("bob"):
				bob = -absf(sin(m.ph)) * 2.2 * m.k * 2.0
				rot = sin(m.ph) * 0.02
			var tex: Texture2D = m.tex
			var h: float = m.hh
			var w: float = m.w
			draw_set_transform(Vector2(m.x, m.y + bob), rot, Vector2(-1.0 if m.dir < 0 else 1.0, 1.0))
			draw_texture_rect(tex, Rect2(-w / 2.0, -h, w, h), false)
			draw_set_transform(Vector2.ZERO)
