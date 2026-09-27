class_name HeartsRow extends Control
## A row of hearts (friendship), filled up to the count.

var count := 0
var total := 10
var _heart := Util.sprite("icon_heart")


func setup(n: int, of: int) -> void:
	count = n
	total = of
	custom_minimum_size = Vector2(of * 16.5, 16.5)
	queue_redraw()


func _draw() -> void:
	if _heart == null:
		return
	for i in total:
		var r := Rect2(i * 16.5, 1, 15.2, 15.2)
		draw_texture_rect(_heart, r, false, Color(1, 1, 1, 1) if i < count else Color(0.45, 0.45, 0.45, 0.35))
