extends Control
## The little box before a to-do line (GoalItem, the parent): filled teal once done.


func _draw() -> void:
	var done: bool = get_parent().done
	var r := Rect2(Vector2(0, 3.2), Vector2(17.6, 17.6))
	if done:
		draw_rect(r, Color("#3f6c74"))
	draw_rect(r, Color("#3f6c74") if done else Color("#6b5440"), false, 2.4)
