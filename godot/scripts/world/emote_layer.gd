class_name EmoteLayer extends Node2D
## Draws the little speech bubbles over people's heads (a heart, a star, "…"). Lives in the
## place's overlay layer, after the lighting.

const ICONS := {"heart": "icon_heart", "star": "icon_star", "coin": "icon_coin", "wrench": "icon_wrench", "clock": "icon_clock", "washer": "icon_washer", "basket": "icon_basket"}
const FONT := preload("res://theme/fonts/fraunces_bold.tres")

var _bubble := Util.sprite("icon_speech")


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	var loc := App.location
	if loc == null:
		return
	for a: Actor in loc.actors():
		if a.emote == "" or not a.is_visible_in_tree():
			continue
		var x := a.position.x
		var y := a.position.y - a.disp_h() - 18.0 + sin(loc.t * 4.0) * 3.0
		var s := 46.0 * clampf(a.char_scale * 1.2, 0.7, 1.0)
		var pop := clampf(a.emote_age * 6.0, 0.0, 1.0) * minf(1.0, a.presence())
		if pop <= 0.0:
			continue
		draw_set_transform(Vector2(x, y), 0.0, Vector2(pop, pop))
		if _bubble:
			draw_texture_rect(_bubble, Rect2(-s / 2.0, -s, s, s * _bubble.get_height() / _bubble.get_width()), false)
		if ICONS.has(a.emote):
			var tex := Util.sprite(ICONS[a.emote])
			if tex:
				draw_texture_rect(tex, Rect2(-s * 0.28, -s * 0.84, s * 0.56, s * 0.56), false)
		else:
			var fs := roundi(s * 0.5)
			var w := FONT.get_string_size(a.emote, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
			var asc := FONT.get_ascent(fs)
			var desc := FONT.get_descent(fs)
			draw_string(FONT, Vector2(-w / 2.0, -s * 0.57 + (asc - desc) / 2.0), a.emote, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color("#3a2a1e"))
		draw_set_transform(Vector2.ZERO)
