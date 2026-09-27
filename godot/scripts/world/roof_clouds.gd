extends Node2D
## Clouds over the rooftops (RoofView, the parent), drawn a little larger than the street's.


func _draw() -> void:
	var view := get_parent() as RoofView
	var wet := G.weather == "rain" or G.weather == "storm"
	for c in view.clouds:
		var tex := Util.sprite(c.s)
		if tex == null:
			continue
		var ch: float = c.h * 1.3 * (1.4 if wet else 1.0)
		var cw := ch * tex.get_width() / tex.get_height()
		var col := Color(0.78, 0.78, 0.78, 0.95) if wet else Color(1, 1, 1, 0.85)
		draw_texture_rect(tex, Rect2(c.x - cw / 2.0, c.y - ch / 2.0, cw, ch), false, col)
