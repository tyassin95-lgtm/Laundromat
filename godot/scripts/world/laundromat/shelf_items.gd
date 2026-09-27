extends Node2D
## Draws what's sitting on a piece of furniture (the parent's items(): [sprite, feet position, height]).


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	for it: Array in get_parent().items():
		var tex := Util.sprite(it[0])
		if tex == null:
			continue
		var h: float = it[2]
		var w := h * tex.get_width() / tex.get_height()
		var p: Vector2 = it[1]
		draw_texture_rect(tex, Rect2(p.x - w / 2.0, p.y - h, w, h), false)
