class_name MoneyPop extends Label
## "+$16" rising from where the money came from, and fading.


func setup(amount: float, pos: Vector2) -> void:
	text = ("-$" if amount < 0 else "+$") + str(absi(roundi(amount)))
	if amount < 0:
		add_theme_color_override("font_color", Color("#b3402f"))
	position = pos
	var tw := create_tween().set_parallel()
	tw.tween_property(self, "position:y", pos.y - 35.2, 1.2).set_ease(Tween.EASE_OUT)
	tw.tween_property(self, "modulate:a", 0.0, 1.2).set_ease(Tween.EASE_OUT)
	tw.chain().tween_callback(queue_free)
