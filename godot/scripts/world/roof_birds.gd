extends Node2D
## Pigeons wheeling over the rooftops (RoofView, the parent).

var _up := Util.sprite("pigeon_fly_up")
var _down := Util.sprite("pigeon_fly_down")


func _draw() -> void:
	var view := get_parent() as RoofView
	for b in view.birds:
		var tex := _up if sin(b.ph) > 0 else _down
		if tex == null:
			continue
		var h := 13.0
		var w := h * tex.get_width() / tex.get_height()
		draw_set_transform(Vector2(b.x, b.y), 0.0, Vector2(-1.0 if b.v < 0 else 1.0, 1.0))
		draw_texture_rect(tex, Rect2(-w / 2.0, -h / 2.0, w, h), false)
		draw_set_transform(Vector2.ZERO)
