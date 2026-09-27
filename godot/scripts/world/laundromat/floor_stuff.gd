extends Node2D
## Puddles lie flat on the tiles; socks and lint bunnies turn up on the floor (Laundry.puddles,
## Laundry.litter).

var t := 0.0


func _process(dt: float) -> void:
	t += dt
	queue_redraw()


func _sprite(name: String, p: Vector2, w: float, h: float, rot: float, alpha: float) -> void:
	var tex := Util.sprite(name)
	if tex == null:
		return
	if w <= 0:
		w = h * tex.get_width() / tex.get_height()
	if h <= 0:
		h = w * tex.get_height() / tex.get_width()
	draw_set_transform(p, rot)
	draw_texture_rect(tex, Rect2(-w / 2.0, -h, w, h), false, Color(1, 1, 1, alpha))
	draw_set_transform(Vector2.ZERO)


func _draw() -> void:
	for p in Laundry.puddles:
		_sprite("scn_puddle_l" if p.size > 0.95 else "scn_puddle_s", Vector2(p.x, p.y + 6), 120.0 * p.size, 0.0, 0.0, 0.92)
	for l in Laundry.litter:
		if l.kind == "sock":
			_sprite("scn_sock", Vector2(l.x, l.y), 0.0, 28.0, 0.9, 1.0)
		else:
			_sprite("scn_lint", Vector2(l.x, l.y), 0.0, 30.0, sin(t * 1.5 + l.id) * 0.04, 1.0)
