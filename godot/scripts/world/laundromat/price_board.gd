extends Node2D
## The chalk price board over the counter. Wash & fold prices follow the price policy.

const FONT := preload("res://theme/fonts/caveat_bold.tres")


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	var mul := 0.85 if G.policies.prices == "low" else 1.2 if G.policies.prices == "high" else 1.0
	var chalk := Color(240 / 255.0, 236 / 255.0, 220 / 255.0, 0.85)
	var lines := ["Self-serve wash  $3.50", "Dry (40 min)  $2.50", "Wash & fold  $%d" % roundi(16 * mul), "Rush  $%d" % roundi(24 * mul)]
	for i in lines.size():
		draw_string(FONT, Vector2(0, i * 24), lines[i], HORIZONTAL_ALIGNMENT_LEFT, -1, 17, chalk)
	if G.policies.get("pwyc", false):
		draw_string(FONT, Vector2(0, 94), "Sundays: pay what you can ♥", HORIZONTAL_ALIGNMENT_LEFT, -1, 17, Color(240 / 255.0, 200 / 255.0, 120 / 255.0, 0.95))
